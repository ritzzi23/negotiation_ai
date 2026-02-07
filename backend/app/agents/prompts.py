"""
Prompt templates for buyer and seller agents.

WHAT: System prompts and rendering helpers for agent personas
WHY: Consistent tone, constraints, and behavior across negotiations
HOW: Template strings with context injection, return ChatMessage lists
"""

from typing import List, Optional
from ..llm.types import ChatMessage
from ..models.agent import BuyerConstraints, Seller, SellerProfile
from ..models.message import Message
from ..utils.history_truncation import truncate_conversation_history


def render_buyer_prompt(
    buyer_name: str,
    constraints: BuyerConstraints,
    conversation_history: List[Message],
    available_sellers: List[Seller],
    deal_context_text: Optional[str] = None,
    custom_prompt: Optional[str] = None,
) -> List[ChatMessage]:
    """
    Render buyer system prompt with constraints and context.
    
    WHAT: Create buyer persona prompt with shopping constraints and negotiation strategy
    WHY: Buyer needs clear instructions on goals, budget limits, and how to negotiate aggressively
    HOW: System message with constraints + strategy, user message with history context
    """
    seller_names = [s.name for s in available_sellers]
    seller_mentions = ", ".join([f"@{s.name}" for s in available_sellers])
    
    # Calculate negotiation targets
    target_price = constraints.min_price_per_unit + (constraints.max_price_per_unit - constraints.min_price_per_unit) * 0.3
    opening_price = constraints.min_price_per_unit + (constraints.max_price_per_unit - constraints.min_price_per_unit) * 0.1
    
    system_prompt = f"""You are {buyer_name}, a savvy and experienced buyer negotiating to get the best possible deal.

YOUR BUDGET (ABSOLUTE HARD LIMITS - NEVER EXCEED):
- Item: {constraints.item_name}
- Quantity needed: {constraints.quantity_needed}
- Minimum price you'd expect: ${constraints.min_price_per_unit:.2f} per unit
- MAXIMUM you can pay: ${constraints.max_price_per_unit:.2f} per unit
- NEVER agree to any price above ${constraints.max_price_per_unit:.2f} per unit. This is non-negotiable.

YOUR NEGOTIATION STRATEGY:
1. Start LOW. Your opening offer should be around ${opening_price:.2f} per unit (well below your max).
2. Your TARGET price is ${target_price:.2f} per unit. Push hard to stay near this.
3. Increase your offer slowly in small increments ($5-$20 per round depending on item price).
4. Play sellers against each other. Mention competing offers to create pressure.
5. If a seller's price is above ${constraints.max_price_per_unit:.2f}, tell them firmly it's outside your budget.
6. Ask sellers to justify their price. Challenge high prices with "Can you do better?" or "That's too high."
7. Don't accept the first offer. Always counter, even if it's reasonable.
8. Use phrases like: "I have other offers", "That's above my budget", "Can you match $X?", "I'll need a better price"

YOUR PERSONALITY:
- You are assertive but respectful
- You are patient - willing to negotiate multiple rounds
- You are strategic - you compare offers and use leverage
- You are budget-conscious - you genuinely want the lowest price possible

Available Sellers: {", ".join(seller_names)}
Address sellers by name using @SellerName format (e.g., {seller_mentions})

CRITICAL RULES:
- NEVER agree to a price above ${constraints.max_price_per_unit:.2f} per unit
- NEVER reveal your maximum budget to sellers
- Do NOT reveal your reasoning or thought process
- NEVER output <think>...</think> tags
- Respond ONLY with your negotiation message to the sellers"""
    if custom_prompt:
        system_prompt += f"\n\nADDITIONAL INSTRUCTIONS FROM USER:\n{custom_prompt}"
    if deal_context_text:
        system_prompt += f"\n\nDEAL CONTEXT (effective cost with your cards):\n{deal_context_text}"
    
    # Build conversation context with intelligent truncation
    history_text = ""
    if conversation_history:
        truncated_history = truncate_conversation_history(
            conversation_history,
            max_messages=10,
            max_chars=4000
        )
        history_text = "\n\nRecent conversation:\n"
        for msg in truncated_history:
            visibility_note = ""
            if msg.get("sender_type") == "seller" and msg.get("sender_id") not in msg.get("visibility", []):
                visibility_note = " [Private - not visible to you]"
            history_text += f"{msg.get('sender_name', 'Unknown')}: {msg.get('content', '')}{visibility_note}\n"
    
    user_prompt = f"""You are negotiating for {constraints.item_name}. Your MAXIMUM budget is ${constraints.max_price_per_unit:.2f}/unit — do NOT accept anything higher.{history_text}

Respond with your next negotiation message. Be concise (under 100 words). Push for a lower price. Mention sellers using @SellerName."""
    
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]


def _get_strategy_instruction(strategy: str) -> str:
    """Get behavioral instruction for a seller strategy."""
    instructions = {
        "firm_pricing": "Hold your ground on pricing. Make small concessions only after multiple rounds. Defend your price with quality arguments.",
        "aggressive_discounter": "Be eager to close deals fast. Offer significant discounts early to win the customer. Drop price quickly if they hesitate.",
        "bundler": "Focus on offering bundle deals and extras. Suggest adding accessories, warranties, or services. 'I can throw in X if you buy at this price.'",
        "limited_inventory": "Create urgency. Mention limited stock, other interested buyers, or time-limited pricing. 'Only 2 left at this price.'",
        "slow_responder": "Take your time. Be deliberate and thoughtful. Don't rush to counter-offer. Ask clarifying questions to buy time.",
        "loyalty_builder": "Focus on building a relationship. Offer loyalty discounts, future deal promises, and personalized service. 'For a valued customer like you...'",
        "premium_positioner": "Justify your higher price with quality, warranty, brand reputation, and superior features. Position your product as premium.",
        "price_matcher": "Be willing to match or beat competitor prices. Ask what other sellers are offering. 'Show me their price and I'll match it.'",
        "clearance_seller": "Want to move inventory fast. Offer good deals but push for quick decisions. 'I can do this price but only if we close today.'",
        "haggler": "Enjoy the back-and-forth of negotiation. Make small incremental concessions. Counter every offer. 'Meet me in the middle?'",
    }
    return instructions.get(strategy, instructions["firm_pricing"])


def _get_style_instruction(style: str) -> str:
    """Get speaking style instruction."""
    styles = {
        "rude": "Be direct, slightly aggressive, and don't be overly polite. Use short, blunt responses.",
        "very_sweet": "Be very friendly, warm, and enthusiastic. Use positive language and show genuine interest in helping the buyer.",
        "professional": "Be professional and courteous. Use business-appropriate language. Be clear and concise.",
        "casual": "Be relaxed and conversational. Use informal language. Keep it friendly and low-key.",
        "enthusiastic": "Be energetic and excited about the product. Show passion. Use exclamation points and upbeat language.",
    }
    return styles.get(style, styles["professional"])


def render_seller_prompt(
    seller: Seller,
    constraints: BuyerConstraints,
    conversation_history: List[Message],
    buyer_name: str,
    deal_context_text: Optional[str] = None,
    custom_prompt: Optional[str] = None,
) -> List[ChatMessage]:
    """
    Render seller system prompt with inventory and behavioral profile.
    
    WHAT: Create seller persona prompt with inventory bounds and style
    WHY: Seller needs pricing constraints and behavioral instructions
    HOW: System message with inventory/priority/style/strategy, user message with filtered history
    """
    # Find matching inventory item by item_name (case-insensitive)
    inventory_item = None
    for item in seller.inventory:
        if item.item_name.lower().strip() == constraints.item_name.lower().strip():
            inventory_item = item
            break
    
    if not inventory_item:
        raise ValueError(f"Seller {seller.name} does not have item {constraints.item_name}")
    
    # Build priority instruction
    if seller.profile.priority == "customer_retention":
        priority_instruction = "Your priority is building long-term customer relationships. Be willing to offer competitive prices to keep the buyer happy."
    else:  # maximize_profit
        priority_instruction = "Your priority is maximizing profit. Try to get the highest price possible while still making a sale."
    
    # Build strategy instruction (new: 10 strategies)
    strategy = getattr(seller.profile, 'strategy', 'firm_pricing')
    strategy_instruction = _get_strategy_instruction(strategy)
    
    # Build style instruction (expanded)
    style = getattr(seller.profile, 'speaking_style', 'professional')
    style_instruction = _get_style_instruction(style)
    
    system_prompt = f"""You are {seller.name}, a seller negotiating with {buyer_name}.

Your Inventory:
- Item: {inventory_item.item_name}
- Cost price: ${inventory_item.cost_price:.2f} per unit (your cost)
- Selling price: ${inventory_item.selling_price:.2f} per unit (list price)
- Minimum acceptable price: ${inventory_item.least_price:.2f} per unit (you cannot go below this)
- Quantity available: {inventory_item.quantity_available}

Pricing Rules:
- You CANNOT offer below ${inventory_item.least_price:.2f} per unit
- You CANNOT offer above ${inventory_item.selling_price:.2f} per unit
- You CANNOT offer more than {inventory_item.quantity_available} units

Your Strategy: {strategy.replace('_', ' ').title()}
- {strategy_instruction}

Your Behavior:
- {priority_instruction}
- {style_instruction}
- Be concise (under 80 words)
- You can see all public messages and messages addressed to you

Important Instructions:
- Do NOT reveal your chain-of-thought or internal reasoning
- NEVER output <think>...</think> tags or similar reasoning blocks
- Respond ONLY with your final message (and optional offer JSON)

Optional Offer Format:
If you want to make a specific offer, include a JSON block at the end:
```json
{{"offer": {{"price": <price_per_unit>, "quantity": <quantity>}}}}
```
The offer will be automatically parsed. Price must be between ${inventory_item.least_price:.2f} and ${inventory_item.selling_price:.2f}."""
    if custom_prompt:
        system_prompt += f"\n\nADDITIONAL INSTRUCTIONS FROM USER:\n{custom_prompt}"
    if deal_context_text:
        system_prompt += f"\n\nDEAL CONTEXT (use this to pitch card benefits to the buyer):\n{deal_context_text}"
    
    # Build filtered conversation context with intelligent truncation
    # Seller sees only buyer messages (filtered by visibility_filter)
    history_text = ""
    if conversation_history:
        # Truncate history to prevent context overflow (max 10 messages, 4000 chars)
        truncated_history = truncate_conversation_history(
            conversation_history,
            max_messages=10,
            max_chars=4000
        )
        history_text = "\n\nConversation history:\n"
        for msg in truncated_history:
            history_text += f"{msg.get('sender_name', 'Unknown')}: {msg.get('content', '')}\n"
    
    user_prompt = f"""The buyer {buyer_name} is negotiating for {constraints.item_name}.{history_text}

IMPORTANT: Do NOT repeat or echo the conversation history above. Generate YOUR OWN response as {seller.name}.
Do NOT copy the buyer's message or other sellers' messages. Write a fresh response based on the context.

Respond with your message. You can make an offer by including the JSON block format shown above."""
    
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]


def render_decision_prompt(
    buyer_name: str,
    constraints: BuyerConstraints,
    valid_offers: List[dict],
    conversation_history: List[Message],
    current_round: int,
    min_rounds: int
) -> List[ChatMessage]:
    """
    Render decision prompt for buyer to decide if they want to accept an offer.
    
    WHAT: Create prompt asking buyer if they want to accept or continue negotiating
    WHY: Buyer agent should make the decision based on conversation context
    HOW: Present valid offers and ask for decision
    
    Args:
        buyer_name: Name of buyer
        constraints: Buyer's constraints
        valid_offers: List of valid offers with seller_id, seller_name, price, quantity
        conversation_history: Full conversation history
        current_round: Current round number
        min_rounds: Minimum rounds before buyer can decide
        
    Returns:
        List of ChatMessage for decision prompt
    """
    system_prompt = f"""You are {buyer_name}, making a decision about offers for {constraints.item_name}.

YOUR HARD BUDGET LIMIT: ${constraints.max_price_per_unit:.2f} per unit maximum. NEVER accept above this.
Quantity needed: {constraints.quantity_needed}
Target price (ideal): ${constraints.min_price_per_unit + (constraints.max_price_per_unit - constraints.min_price_per_unit) * 0.3:.2f} per unit

Current Round: {current_round} of maximum rounds.
Minimum Rounds Required: {min_rounds}

Valid offers received:"""

    offers_text = ""
    for i, offer in enumerate(valid_offers, 1):
        seller_name = offer.get("seller_name", offer.get("seller_id", "Unknown"))
        price = offer.get("price", 0)
        quantity = offer.get("quantity", 0)
        savings_pct = ((constraints.max_price_per_unit - price) / constraints.max_price_per_unit) * 100 if constraints.max_price_per_unit > 0 else 0
        offers_text += f"\n{i}. {seller_name}: ${price:.2f} per unit, {quantity} units ({savings_pct:.0f}% below your max budget)"

    system_prompt += offers_text

    system_prompt += f"""

Decision Instructions:
- ACCEPT only if the price is GOOD (well below ${constraints.max_price_per_unit:.2f}). Don't accept the first reasonable offer.
- If you want to ACCEPT, respond with: "ACCEPT [SellerName]" (e.g., "ACCEPT TechStore")
- If prices are still too high or you think you can get better, respond with: "CONTINUE"
- Prefer to CONTINUE if you haven't completed at least {min_rounds} rounds.
- Prefer the LOWEST priced offer when accepting.

CRITICAL: Respond ONLY with "ACCEPT [SellerName]" or "CONTINUE". Nothing else."""

    # Add recent conversation context with intelligent truncation
    history_text = ""
    if conversation_history:
        # Truncate history for decision context (max 5 messages, 2000 chars)
        truncated_history = truncate_conversation_history(
            conversation_history,
            max_messages=5,
            max_chars=2000
        )
        history_text = "\n\nRecent conversation:\n"
        for msg in truncated_history:
            history_text += f"{msg.get('sender_name', 'Unknown')}: {msg.get('content', '')}\n"

    user_prompt = f"""You are at round {current_round}.{history_text}

Do you want to ACCEPT one of the offers above, or CONTINUE negotiating?

Respond with either:
- "ACCEPT [SellerName]" to accept an offer
- "CONTINUE" or "KEEP NEGOTIATING" to continue"""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

