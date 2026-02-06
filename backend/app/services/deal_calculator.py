"""
Deal Calculator – single source of truth for "buyer pays / seller gets".

WHAT: Stateless tool that computes buyer list total, effective total (after card rewards),
      seller receives, seller cost, seller profit, and recommended card.
WHY: Both buyer and seller agents need consistent numbers; benefits are calculated
     accurately by the tool, not by the LLM.
HOW: Takes price, quantity, item, seller, seller cost, and wallet; calls credit_card_service
     for best card; returns DealContext. Formatters produce prompt-safe text for seller and buyer.
"""

from dataclasses import dataclass
from typing import Optional

from .credit_card_service import (
    credit_card_service,
    CardWallet,
)


@dataclass
class DealContext:
    """Structured context for both buyer and seller agents."""
    buyer_list_total: float
    buyer_effective_total: float
    buyer_savings: float
    recommended_card_name: Optional[str]
    recommended_card_explanation: Optional[str]
    seller_receives: float
    seller_cost_total: float
    seller_profit: float


def compute_deal_context(
    price_per_unit: float,
    quantity: int,
    item_name: str,
    seller_name: str,
    seller_cost_per_unit: float,
    wallet: CardWallet,
) -> DealContext:
    """
    Compute deal context: what the buyer pays (list and effective), what the seller gets and profits.

    Single entry point used by the graph and post-deal flow. No I/O; pure computation.

    Args:
        price_per_unit: Agreed or offered price per unit.
        quantity: Number of units.
        item_name: Item name (for reward category).
        seller_name: Seller name (for vendor offers).
        seller_cost_per_unit: Seller's cost per unit from inventory.
        wallet: Buyer's card wallet (can be empty).

    Returns:
        DealContext with all numeric and recommendation fields.
    """
    buyer_list_total = price_per_unit * quantity
    seller_receives = buyer_list_total
    seller_cost_total = seller_cost_per_unit * quantity
    seller_profit = seller_receives - seller_cost_total

    if not wallet.cards:
        return DealContext(
            buyer_list_total=round(buyer_list_total, 2),
            buyer_effective_total=round(buyer_list_total, 2),
            buyer_savings=0.0,
            recommended_card_name=None,
            recommended_card_explanation=None,
            seller_receives=round(seller_receives, 2),
            seller_cost_total=round(seller_cost_total, 2),
            seller_profit=round(seller_profit, 2),
        )

    benefit = credit_card_service.compute_best_card(
        wallet, item_name, seller_name, price_per_unit, quantity
    )
    if benefit is None:
        return DealContext(
            buyer_list_total=round(buyer_list_total, 2),
            buyer_effective_total=round(buyer_list_total, 2),
            buyer_savings=0.0,
            recommended_card_name=None,
            recommended_card_explanation=None,
            seller_receives=round(seller_receives, 2),
            seller_cost_total=round(seller_cost_total, 2),
            seller_profit=round(seller_profit, 2),
        )

    return DealContext(
        buyer_list_total=round(buyer_list_total, 2),
        buyer_effective_total=round(benefit.effective_price, 2),
        buyer_savings=round(benefit.total_savings, 2),
        recommended_card_name=benefit.card_name,
        recommended_card_explanation=benefit.explanation,
        seller_receives=round(seller_receives, 2),
        seller_cost_total=round(seller_cost_total, 2),
        seller_profit=round(seller_profit, 2),
    )


def format_deal_context_for_seller(ctx: DealContext) -> str:
    """
    Turn DealContext into prompt-safe text for the seller.

    Includes: what the seller receives, cost, profit; buyer's effective cost and savings
    so the seller can pitch benefits.
    """
    parts = [
        f"If this deal closes at this price: you receive ${ctx.seller_receives:.2f} total; "
        f"your cost is ${ctx.seller_cost_total:.2f}; your profit is ${ctx.seller_profit:.2f}."
    ]
    if ctx.buyer_savings > 0 and ctx.recommended_card_name:
        parts.append(
            f"The buyer's effective cost after their payment rewards could be ${ctx.buyer_effective_total:.2f} "
            f"(saving ${ctx.buyer_savings:.2f} with {ctx.recommended_card_name}), "
            f"which may make them more willing to accept. You can mention: \"Use your {ctx.recommended_card_name} and you'll save ${ctx.buyer_savings:.2f}.\""
        )
    else:
        parts.append(
            f"The buyer would pay ${ctx.buyer_list_total:.2f} at the register (no card rewards applied)."
        )
    return " ".join(parts)


def format_deal_context_for_buyer(ctx: DealContext) -> str:
    """
    Turn DealContext into prompt-safe text for the buyer.

    Includes: list total, effective total after best card, savings, recommended card.
    """
    if ctx.buyer_savings > 0 and ctx.recommended_card_name:
        return (
            f"At this price you would pay ${ctx.buyer_list_total:.2f} total at the register; "
            f"with your best card ({ctx.recommended_card_name}) you'd effectively pay ${ctx.buyer_effective_total:.2f} "
            f"(saving ${ctx.buyer_savings:.2f})."
        )
    return (
        f"At this price you would pay ${ctx.buyer_list_total:.2f} total. "
        f"No card rewards apply to this purchase."
    )


def compute_benefit_for_offer(
    price_per_unit: float,
    quantity: int,
    item_name: str,
    seller_name: str,
    seller_cost_per_unit: float,
    wallet: CardWallet,
) -> DealContext:
    """
    Tool-callable entry point for agents: same as compute_deal_context.

    Agents can call this with (price, quantity, item_name, seller_name, seller_cost_per_unit, wallet)
    to get accurate benefit numbers. Returns DealContext; caller can use
    format_deal_context_for_seller or format_deal_context_for_buyer for prompt text.
    """
    return compute_deal_context(
        price_per_unit=price_per_unit,
        quantity=quantity,
        item_name=item_name,
        seller_name=seller_name,
        seller_cost_per_unit=seller_cost_per_unit,
        wallet=wallet,
    )
