"""
Negotiation graph builder - LangGraph-style orchestration.

WHAT: Async state machine for multi-round negotiations
WHY: Orchestrate buyer turns, parallel seller responses, and decision logic
HOW: Async generator with nodes: BuyerTurn → Routing → ParallelSellers → DecisionCheck → loop
"""

import asyncio
import random
from typing import AsyncIterator, Optional
from datetime import datetime

from ..llm.provider import LLMProvider
from ..models.negotiation import NegotiationRoomState, NegotiationEvent
from ..models.message import Message
from ..models.agent import BuyerConstraints
from ..agents.buyer_agent import BuyerAgent
from ..agents.seller_agent import SellerAgent
from ..agents.prompts import render_decision_prompt
from ..services.message_router import parse_mentions
from ..services.visibility_filter import filter_conversation
from ..services.wallet_loader import get_wallet_for_session
from ..services.deal_calculator import (
    compute_deal_context,
    format_deal_context_for_buyer,
    format_deal_context_for_seller,
)
from ..services.rag_service import retrieve as rag_retrieve
from ..core.config import settings
from ..utils.logger import get_logger

logger = get_logger(__name__)


def _variant_match(buyer_variant: Optional[str], seller_variant: Optional[str]) -> bool:
    if not buyer_variant:
        return True
    if not seller_variant:
        return False
    return buyer_variant.strip().lower() == seller_variant.strip().lower()


def _size_match(
    buyer_value: Optional[float],
    buyer_unit: Optional[str],
    seller_value: Optional[float],
    seller_unit: Optional[str],
) -> bool:
    if buyer_value is None and not buyer_unit:
        return True
    if seller_value is None or not seller_unit:
        return False
    return buyer_value == seller_value and buyer_unit.strip().lower() == seller_unit.strip().lower()


def _match_inventory_item(seller, constraints: BuyerConstraints):
    """Return the inventory item that strictly matches the buyer's product or name."""
    for item in seller.inventory:
        if constraints.product_id and getattr(item, "product_id", None):
            if item.product_id == constraints.product_id and _variant_match(
                constraints.variant,
                getattr(item, "variant", None),
            ) and _size_match(
                constraints.size_value,
                constraints.size_unit,
                getattr(item, "size_value", None),
                getattr(item, "size_unit", None),
            ):
                return item
            continue
        if item.item_name.lower().strip() == constraints.item_name.lower().strip() and _variant_match(
            constraints.variant,
            getattr(item, "variant", None),
        ) and _size_match(
            constraints.size_value,
            constraints.size_unit,
            getattr(item, "size_value", None),
            getattr(item, "size_unit", None),
        ):
            return item
    return None


def _get_latest_offers_per_seller(room_state: NegotiationRoomState) -> list:
    """
    Extract latest offer per seller from conversation history.
    Returns list of dicts: seller_id, seller_name, price, quantity, seller_cost_per_unit.
    """
    # Latest offer per seller (later messages overwrite)
    latest = {}
    for msg in room_state.conversation_history:
        if msg.get("sender_type") != "seller" or "offer" not in msg or not msg["offer"]:
            continue
        sid = msg.get("sender_id")
        if not sid:
            continue
        offer = msg["offer"]
        price = offer.get("price")
        quantity = offer.get("quantity")
        if price is None or quantity is None:
            continue
        seller = next((s for s in room_state.sellers if s.seller_id == sid), None)
        cost = None
        if seller:
            inv = _match_inventory_item(seller, room_state.buyer_constraints)
            if inv:
                cost = inv.cost_price
        latest[sid] = {
            "seller_id": sid,
            "seller_name": msg.get("sender_name", sid),
            "price": float(price),
            "quantity": int(quantity),
            "seller_cost_per_unit": cost if cost is not None else 0.0,
        }
    return list(latest.values())


class NegotiationGraph:
    """Negotiation graph orchestrator."""
    
    def __init__(self, provider: LLMProvider):
        """
        Initialize negotiation graph.
        
        Args:
            provider: LLM provider instance
        """
        self.provider = provider
        self.max_rounds = settings.MAX_NEGOTIATION_ROUNDS
        self.parallel_limit = settings.PARALLEL_SELLER_LIMIT
        self.temperature = settings.LLM_DEFAULT_TEMPERATURE
        self.max_tokens = settings.LLM_DEFAULT_MAX_TOKENS
    
    async def run(
        self,
        room_state: NegotiationRoomState
    ) -> AsyncIterator[NegotiationEvent]:
        """
        Run negotiation graph to completion.
        
        WHAT: Execute negotiation rounds until decision or max rounds
        WHY: Orchestrate multi-agent negotiation flow
        HOW: Async generator emitting events for each step
        
        Args:
            room_state: Initial negotiation room state
            
        Yields:
            NegotiationEvent for each step (buyer_message, seller_response, etc.)
        """
        # Set seed for determinism if provided
        if room_state.seed is not None:
            random.seed(room_state.seed)
        
        room_state.status = "active"
        logger.info(f"Starting negotiation graph for room {room_state.room_id}")
        logger.info(f"Max rounds: {self.max_rounds}, Current round: {room_state.current_round}")
        logger.info(f"Number of sellers: {len(room_state.sellers)}")
        
        # Emit connected event
        yield {
            "type": "heartbeat",
            "data": {"message": "Negotiation started", "round": room_state.current_round},
            "timestamp": datetime.now()
        }
        
        try:
            while room_state.current_round < self.max_rounds:
                room_state.current_round += 1
                logger.info(f"=== Starting round {room_state.current_round}/{self.max_rounds} ===")
                
                # Emit round_start event
                yield {
                    "type": "round_start",
                    "data": {
                        "round_number": room_state.current_round,
                        "max_rounds": self.max_rounds
                    },
                    "timestamp": datetime.now()
                }
                
                # Node 1: Buyer Turn
                buyer_result = await self._buyer_turn_node(room_state)
                if not buyer_result:
                    break
                
                yield {
                    "type": "buyer_message",
                    "data": {
                        "sender_id": room_state.buyer_id,
                        "sender_name": room_state.buyer_name,
                        "sender_type": "buyer",
                        "message": buyer_result["message"],
                        "mentioned_sellers": buyer_result["mentioned_sellers"],
                        "round": room_state.current_round
                    },
                    "timestamp": datetime.now()
                }
                
                # Node 2: Message Routing (determine which sellers respond)
                responding_sellers = self._message_routing_node(
                    buyer_result["mentioned_sellers"],
                    room_state.sellers
                )
                
                if not responding_sellers:
                    logger.info("No sellers to respond, ending negotiation")
                    break
                
                # Node 3: Parallel Seller Responses
                seller_results = await self._parallel_seller_responses_node(
                    room_state,
                    responding_sellers
                )
                
                # Emit seller responses
                for seller_id, result in seller_results.items():
                    if result:
                        # Find seller name
                        seller_name = next(
                            (s.name for s in room_state.sellers if s.seller_id == seller_id),
                            "Unknown Seller"
                        )
                        
                        yield {
                            "type": "seller_response",
                            "data": {
                                "seller_id": seller_id,
                                "sender_name": seller_name,
                                "sender_type": "seller",
                                "message": result["message"],
                                "offer": result.get("offer"),
                                "round": room_state.current_round
                            },
                            "timestamp": datetime.now()
                        }
                
                # Node 4: Decision Check (async - buyer agent decides)
                decision = await self._decision_check_node(room_state, seller_results)
                
                if decision:
                    room_state.status = "completed"
                    room_state.selected_seller_id = decision["seller_id"]
                    room_state.final_offer = decision["offer"]
                    room_state.decision_reason = decision.get("reason", "Best offer selected")
                    
                    # Find seller name and cost for deal context
                    selected_seller = next(
                        (s for s in room_state.sellers if s.seller_id == decision["seller_id"]),
                        None
                    )
                    selected_seller_name = selected_seller.name if selected_seller else "Unknown Seller"
                    seller_cost = 0.0
                    if selected_seller:
                        inv = _match_inventory_item(selected_seller, room_state.buyer_constraints)
                        if inv:
                            seller_cost = inv.cost_price
                    total_cost = decision["offer"]["price"] * decision["offer"]["quantity"]
                    effective_total = total_cost
                    recommended_card = None
                    card_savings = 0.0
                    if getattr(room_state, "session_id", None):
                        wallet = get_wallet_for_session(room_state.session_id)
                        ctx = compute_deal_context(
                            price_per_unit=decision["offer"]["price"],
                            quantity=decision["offer"]["quantity"],
                            item_name=room_state.buyer_constraints.item_name,
                            seller_name=selected_seller_name,
                            seller_cost_per_unit=seller_cost,
                            wallet=wallet,
                        )
                        effective_total = ctx.buyer_effective_total
                        recommended_card = ctx.recommended_card_name
                        card_savings = ctx.buyer_savings
                    
                    # Emit decision event first
                    yield {
                        "type": "decision",
                        "data": {
                            "decision": "accept",
                            "chosen_seller_id": decision["seller_id"],
                            "chosen_seller_name": selected_seller_name,
                            "final_price": decision["offer"]["price"],
                            "final_quantity": decision["offer"]["quantity"],
                            "total_cost": total_cost,
                            "effective_total": effective_total,
                            "recommended_card": recommended_card,
                            "card_savings": card_savings,
                            "reason": decision.get("reason", "Best offer selected")
                        },
                        "timestamp": datetime.now()
                    }
                    
                    # Then emit completion
                    yield {
                        "type": "negotiation_complete",
                        "data": {
                            "selected_seller_id": decision["seller_id"],
                            "selected_seller_name": selected_seller_name,
                            "final_offer": decision["offer"],
                            "reason": decision.get("reason"),
                            "rounds": room_state.current_round
                        },
                        "timestamp": datetime.now()
                    }
                    break
                
                # Emit heartbeat
                yield {
                    "type": "heartbeat",
                    "data": {"message": f"Round {room_state.current_round} complete", "round": room_state.current_round},
                    "timestamp": datetime.now()
                }
            
            # Max rounds reached
            if room_state.current_round >= self.max_rounds and room_state.status != "completed":
                room_state.status = "aborted"
                yield {
                    "type": "negotiation_complete",
                    "data": {
                        "selected_seller_id": None,
                        "final_offer": None,
                        "reason": "Max rounds reached",
                        "rounds": room_state.current_round
                    },
                    "timestamp": datetime.now()
                }
        
        except Exception as e:
            logger.error(f"Negotiation graph error: {e}")
            room_state.status = "aborted"
            yield {
                "type": "error",
                "data": {"error": str(e), "round": room_state.current_round},
                "timestamp": datetime.now()
            }
    
    async def _buyer_turn_node(
        self,
        room_state: NegotiationRoomState
    ) -> Optional[dict]:
        """
        Buyer turn node - generate buyer message.
        
        WHAT: Create buyer agent and generate message
        WHY: Buyer needs to communicate with sellers
        HOW: Instantiate BuyerAgent, call run_turn, record message
        """
        try:
            logger.info(f"Creating buyer agent for room {room_state.room_id}")
            buyer_agent = BuyerAgent(
                provider=self.provider,
                constraints=room_state.buyer_constraints,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            # Filter conversation for buyer's visibility
            buyer_history = filter_conversation(
                room_state.conversation_history,
                room_state.buyer_id,
                "buyer"
            )
            
            # Create temporary state with filtered history
            temp_state = NegotiationRoomState(
                room_id=room_state.room_id,
                buyer_id=room_state.buyer_id,
                buyer_name=room_state.buyer_name,
                buyer_constraints=room_state.buyer_constraints,
                sellers=room_state.sellers,
                conversation_history=buyer_history,  # Use filtered history
                current_round=room_state.current_round,
                max_rounds=room_state.max_rounds,
                llm_provider=room_state.llm_provider,
                llm_model=room_state.llm_model,
                session_id=getattr(room_state, "session_id", None),
            )
            
            # Deal context for buyer: latest offer per seller + wallet
            deal_context_text = None
            if getattr(room_state, "session_id", None):
                wallet = get_wallet_for_session(room_state.session_id)
                offers = _get_latest_offers_per_seller(room_state)
                if offers:
                    parts = []
                    for o in offers:
                        ctx = compute_deal_context(
                            price_per_unit=o["price"],
                            quantity=o["quantity"],
                            item_name=room_state.buyer_constraints.item_name,
                            seller_name=o["seller_name"],
                            seller_cost_per_unit=o["seller_cost_per_unit"],
                            wallet=wallet,
                        )
                        parts.append(f"[{o['seller_name']}] {format_deal_context_for_buyer(ctx)}")
                    deal_context_text = "\n".join(parts)
            
            logger.info(f"Running buyer turn for round {room_state.current_round}")
            result = await buyer_agent.run_turn(temp_state, deal_context_text=deal_context_text)
            logger.info(f"Buyer agent returned result: {result}")
            
            if not result:
                logger.error("Buyer agent returned None/empty result")
                return None
            
            # Record message in history
            message: Message = {
                "message_id": f"msg_{room_state.current_round}_buyer",
                "turn_number": room_state.current_round,
                "timestamp": datetime.now(),
                "sender_id": room_state.buyer_id,
                "sender_type": "buyer",
                "sender_name": room_state.buyer_name,
                "content": result["message"],
                "mentioned_sellers": result["mentioned_sellers"],
                "visibility": [s.seller_id for s in room_state.sellers] + [room_state.buyer_id]  # All can see buyer messages
            }
            
            room_state.conversation_history.append(message)
            logger.info(f"Buyer message added to history: {result['message'][:100]}")
            
            return result
            
        except Exception as e:
            logger.error(f"Buyer turn error: {e}", exc_info=True)
            return None
    
    def _message_routing_node(
        self,
        mentioned_sellers: list[str],
        all_sellers: list
    ) -> list:
        """
        Message routing node - determine which sellers respond.
        
        WHAT: Select sellers to respond based on mentions
        WHY: Only mentioned sellers should respond (or all if no mentions)
        HOW: Use mentioned list or default to all sellers
        """
        if mentioned_sellers:
            # Only mentioned sellers respond
            logger.info(f"Message routing: mentioned_sellers={mentioned_sellers}")
            logger.info(f"Message routing: all_sellers IDs={[s.seller_id for s in all_sellers]}, names={[s.name for s in all_sellers]}")
            responding = [s for s in all_sellers if s.seller_id in mentioned_sellers]
            logger.info(f"Message routing: selected {len(responding)} sellers to respond: {[s.name for s in responding]}")
            return responding
        else:
            # No mentions = all sellers can respond
            logger.info(f"Message routing: no mentions, all {len(all_sellers)} sellers can respond")
            return all_sellers
    
    async def _parallel_seller_responses_node(
        self,
        room_state: NegotiationRoomState,
        sellers: list
    ) -> dict:
        """
        Parallel seller responses node.
        
        WHAT: Get responses from multiple sellers concurrently
        WHY: Sellers respond in parallel for efficiency
        HOW: asyncio.gather with semaphore limit, return_exceptions=True
        """
        semaphore = asyncio.Semaphore(self.parallel_limit)
        results = {}
        
        async def get_seller_response(seller):
            """Get response from a single seller."""
            async with semaphore:
                try:
                    logger.info(f"Getting response from seller {seller.name} (ID: {seller.seller_id}) for item: {room_state.buyer_constraints.item_name}")
                    logger.debug(f"Seller {seller.name} inventory items: {[item.item_name for item in seller.inventory]}")
                    
                    # Find strictly matching inventory item (product_id preferred)
                    inventory_item = _match_inventory_item(seller, room_state.buyer_constraints)
                    if inventory_item:
                        logger.info(f"Found matching inventory item for {seller.name}: {inventory_item.item_name}")
                    
                    if not inventory_item:
                        logger.warning(f"Seller {seller.name} (ID: {seller.seller_id}) has no inventory for item '{room_state.buyer_constraints.item_name}'. Available items: {[item.item_name for item in seller.inventory]}")
                        return None
                    
                    seller_agent = SellerAgent(
                        provider=self.provider,
                        seller=seller,
                        inventory_item=inventory_item,
                        temperature=self.temperature,
                        max_tokens=self.max_tokens
                    )
                    
                    # Filter conversation for this seller's visibility
                    seller_history = filter_conversation(
                        room_state.conversation_history,
                        seller.seller_id,
                        "seller"
                    )
                    
                    # Create temporary state with filtered history
                    temp_state = NegotiationRoomState(
                        room_id=room_state.room_id,
                        buyer_id=room_state.buyer_id,
                        buyer_name=room_state.buyer_name,
                        buyer_constraints=room_state.buyer_constraints,
                        sellers=room_state.sellers,
                        conversation_history=seller_history,
                        current_round=room_state.current_round,
                        max_rounds=room_state.max_rounds,
                        llm_provider=room_state.llm_provider,
                        llm_model=room_state.llm_model,
                        session_id=getattr(room_state, "session_id", None),
                    )
                    
                    # Deal context for this seller: their latest offer, or list price if none yet
                    deal_context_text = None
                    if getattr(room_state, "session_id", None):
                        wallet = get_wallet_for_session(room_state.session_id)
                        offers = _get_latest_offers_per_seller(room_state)
                        my_offer = next((o for o in offers if o["seller_id"] == seller.seller_id), None)
                        if my_offer and my_offer.get("seller_cost_per_unit") is not None:
                            price = my_offer["price"]
                            qty = my_offer["quantity"]
                            cost = my_offer["seller_cost_per_unit"]
                        else:
                            price = inventory_item.selling_price
                            qty = room_state.buyer_constraints.quantity_needed
                            cost = inventory_item.cost_price
                        ctx = compute_deal_context(
                            price_per_unit=price,
                            quantity=qty,
                            item_name=room_state.buyer_constraints.item_name,
                            seller_name=seller.name,
                            seller_cost_per_unit=cost,
                            wallet=wallet,
                        )
                        deal_context_text = format_deal_context_for_seller(ctx)
                        try:
                            rag_chunks = rag_retrieve(
                                f"credit card benefits {seller.name} {room_state.buyer_constraints.item_name}",
                                top_k=3,
                            )
                            if rag_chunks:
                                deal_context_text += "\n\nRelevant credit card info:\n" + "\n".join(
                                    c["text"][:200] + ("..." if len(c["text"]) > 200 else "") for c in rag_chunks
                                )
                        except Exception as e:
                            logger.debug(f"RAG retrieve skip: {e}")
                    
                    result = await seller_agent.respond(
                        temp_state,
                        room_state.buyer_name,
                        room_state.buyer_constraints,
                        deal_context_text=deal_context_text,
                    )
                    
                    # Record message in history
                    message: Message = {
                        "message_id": f"msg_{room_state.current_round}_seller_{seller.seller_id}",
                        "turn_number": room_state.current_round,
                        "timestamp": datetime.now(),
                        "sender_id": seller.seller_id,
                        "sender_type": "seller",
                        "sender_name": seller.name,
                        "content": result["message"],
                        "mentioned_sellers": [],
                        "offer": result.get("offer"),
                        "visibility": [room_state.buyer_id, seller.seller_id]  # Buyer and seller can see
                    }
                    
                    room_state.conversation_history.append(message)
                    
                    logger.info(f"Seller {seller.name} successfully generated response")
                    return result
                    
                except Exception as e:
                    logger.error(f"Seller {seller.name} (ID: {seller.seller_id}) response error: {e}", exc_info=True)
                    return None
        
        # Gather all seller responses in parallel
        tasks = [get_seller_response(seller) for seller in sellers]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Map responses to seller IDs
        for seller, response in zip(sellers, responses):
            if isinstance(response, Exception):
                logger.error(f"Seller {seller.name} (ID: {seller.seller_id}) raised exception: {response}", exc_info=True)
                results[seller.seller_id] = None
            elif response is None:
                logger.warning(f"Seller {seller.name} (ID: {seller.seller_id}) returned None response")
                results[seller.seller_id] = None
            else:
                logger.info(f"Seller {seller.name} (ID: {seller.seller_id}) response mapped successfully")
                results[seller.seller_id] = response
        
        return results
    
    async def _decision_check_node(
        self,
        room_state: NegotiationRoomState,
        seller_results: dict
    ) -> Optional[dict]:
        """
        Decision check node - let buyer agent decide if they want to accept.
        
        WHAT: Use buyer agent to decide if they want to accept an offer or continue
        WHY: Buyer should make decision based on conversation context, not just price
        HOW: Extract valid offers, ask buyer agent, parse decision response
        
        Args:
            room_state: Current room state
            seller_results: Dict of seller_id -> response dict
            
        Returns:
            Decision dict with seller_id and offer, or None to continue
        """
        # Check minimum rounds requirement
        min_rounds = settings.MIN_NEGOTIATION_ROUNDS
        if room_state.current_round < min_rounds:
            logger.debug(f"Round {room_state.current_round} < min {min_rounds}, continuing")
            return None
        
        # Extract valid offers
        valid_offers = []
        seller_id_to_name = {s.seller_id: s.name for s in room_state.sellers}
        
        for seller_id, result in seller_results.items():
            if not result:
                continue
            
            offer = result.get("offer")
            if not offer:
                continue
            
            price = offer.get("price", 0)
            quantity = offer.get("quantity", 0)
            
            # HARD ENFORCEMENT: reject any offer above buyer's max price
            if price > room_state.buyer_constraints.max_price_per_unit:
                logger.warning(
                    f"Rejecting offer from {seller_id_to_name.get(seller_id, seller_id)}: "
                    f"${price:.2f} exceeds max ${room_state.buyer_constraints.max_price_per_unit:.2f}"
                )
                continue
            
            if (price >= room_state.buyer_constraints.min_price_per_unit and
                quantity <= room_state.buyer_constraints.quantity_needed):
                valid_offers.append({
                    "seller_id": seller_id,
                    "seller_name": seller_id_to_name.get(seller_id, seller_id),
                    "offer": offer,
                    "price": price,
                    "quantity": quantity
                })
        
        if not valid_offers:
            logger.debug("No valid offers, continuing negotiation")
            return None
        
        # Sort offers by price (lowest first) for presentation
        valid_offers.sort(key=lambda x: x["price"])
        
        try:
            # Render decision prompt
            decision_messages = render_decision_prompt(
                buyer_name=room_state.buyer_name,
                constraints=room_state.buyer_constraints,
                valid_offers=valid_offers,
                conversation_history=room_state.conversation_history,
                current_round=room_state.current_round,
                min_rounds=min_rounds
            )
            
            # Ask buyer agent to decide - use model from room_state if available
            result = await self.provider.generate(
                messages=decision_messages,
                temperature=0.3,  # Slightly higher for decision-making
                max_tokens=100,
                stop=None,
                model=getattr(room_state, 'llm_model', None)  # Use model from session if available
            )
            
            decision_text = result.text.upper().strip()
            logger.info(f"Buyer decision response: {decision_text}")
            
            # Parse decision: look for "ACCEPT [SellerName]"
            if "ACCEPT" in decision_text:
                # Extract seller name from response
                for offer in valid_offers:
                    seller_name = offer["seller_name"].upper()
                    # Check if seller name appears in decision text
                    if seller_name in decision_text or offer["seller_id"] in decision_text:
                        logger.info(f"Buyer decided to accept offer from {offer['seller_name']}")
                        return {
                            "seller_id": offer["seller_id"],
                            "offer": offer["offer"],
                            "reason": f"Buyer accepted offer from {offer['seller_name']}: ${offer['price']:.2f} per unit"
                        }
                
                # If "ACCEPT" found but seller name unclear, accept first (best) offer
                logger.warning("ACCEPT found but seller name unclear, accepting best offer")
                best = valid_offers[0]
                return {
                    "seller_id": best["seller_id"],
                    "offer": best["offer"],
                    "reason": f"Buyer accepted offer: ${best['price']:.2f} per unit"
                }
            
            # If CONTINUE or KEEP NEGOTIATING, return None
            if "CONTINUE" in decision_text or "KEEP NEGOTIATING" in decision_text or "NEGOTIATING" in decision_text:
                logger.info("Buyer decided to continue negotiating")
                return None
            
            # Default: if unclear, continue (conservative)
            logger.info("Decision unclear, continuing negotiation")
            return None
            
        except Exception as e:
            logger.error(f"Error in buyer decision: {e}")
            # On error, continue negotiating (conservative)
            return None

