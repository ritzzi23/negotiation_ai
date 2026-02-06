"""
Deal Explanation Engine.

WHAT: Generate clear, human-readable explanations of why a deal was chosen
WHY: Users need transparency - why the winning deal is optimal and why others failed
HOW: Compare all negotiation outcomes, factor in credit card rewards, produce ranked analysis
"""

from typing import Optional
from dataclasses import dataclass
from .credit_card_service import CardBenefit, CardWallet, credit_card_service
from ..utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class SellerOutcome:
    """Outcome of negotiation with a single seller."""
    seller_id: str
    seller_name: str
    status: str  # "deal", "no_deal", "timeout", "constraint_violation", "walked_away"
    final_price: Optional[float] = None
    quantity: Optional[int] = None
    total_cost: Optional[float] = None
    rounds_taken: int = 0
    card_benefit: Optional[CardBenefit] = None
    effective_price: Optional[float] = None  # After card rewards
    failure_reason: Optional[str] = None


@dataclass
class DealRanking:
    """Ranked deal with explanation."""
    rank: int
    seller_id: str
    seller_name: str
    final_price: float
    effective_price: float  # After card rewards
    total_cost: float
    effective_total: float  # After card rewards
    savings_vs_asking: float
    card_recommendation: Optional[str] = None
    explanation: str = ""
    is_winner: bool = False


@dataclass
class DealExplanation:
    """Complete deal explanation for the user."""
    winner: Optional[DealRanking] = None
    rankings: list[DealRanking] = None
    failed_sellers: list[dict] = None
    summary: str = ""
    credit_card_tip: str = ""

    def __post_init__(self):
        if self.rankings is None:
            self.rankings = []
        if self.failed_sellers is None:
            self.failed_sellers = []


class DealExplainer:
    """Generate deal explanations and rankings."""

    def explain_deals(
        self,
        outcomes: list[SellerOutcome],
        item_name: str,
        buyer_max_price: float,
        wallet: Optional[CardWallet] = None,
    ) -> DealExplanation:
        """
        Generate a complete deal explanation with rankings.

        Args:
            outcomes: List of negotiation outcomes per seller
            item_name: Name of the item
            buyer_max_price: Buyer's maximum price per unit
            wallet: Optional credit card wallet for reward calculation

        Returns:
            DealExplanation with winner, rankings, and explanations
        """
        successful = [o for o in outcomes if o.status == "deal" and o.final_price is not None]
        failed = [o for o in outcomes if o.status != "deal"]

        # Compute card benefits for successful deals
        if wallet:
            for outcome in successful:
                benefit = credit_card_service.compute_best_card(
                    wallet=wallet,
                    item_name=item_name,
                    seller_name=outcome.seller_name,
                    price=outcome.final_price,
                    quantity=outcome.quantity or 1,
                )
                if benefit:
                    outcome.card_benefit = benefit
                    outcome.effective_price = benefit.effective_price / (outcome.quantity or 1)
                else:
                    outcome.effective_price = outcome.final_price
            # Sort by effective price (lowest first)
            successful.sort(key=lambda o: o.effective_price or o.final_price)
        else:
            for outcome in successful:
                outcome.effective_price = outcome.final_price
            successful.sort(key=lambda o: o.final_price)

        # Build rankings
        rankings = []
        for i, outcome in enumerate(successful):
            quantity = outcome.quantity or 1
            total_cost = outcome.final_price * quantity
            effective_total = (outcome.effective_price or outcome.final_price) * quantity
            savings_vs_asking = buyer_max_price - outcome.final_price

            card_rec = None
            if outcome.card_benefit and outcome.card_benefit.total_savings > 0:
                card_rec = outcome.card_benefit.explanation

            # Generate explanation
            if i == 0:
                explanation = self._explain_winner(outcome, savings_vs_asking, wallet)
            else:
                winner = successful[0]
                explanation = self._explain_loser(outcome, winner, savings_vs_asking)

            rankings.append(DealRanking(
                rank=i + 1,
                seller_id=outcome.seller_id,
                seller_name=outcome.seller_name,
                final_price=outcome.final_price,
                effective_price=outcome.effective_price or outcome.final_price,
                total_cost=round(total_cost, 2),
                effective_total=round(effective_total, 2),
                savings_vs_asking=round(savings_vs_asking, 2),
                card_recommendation=card_rec,
                explanation=explanation,
                is_winner=(i == 0),
            ))

        # Build failed seller explanations
        failed_explanations = []
        for outcome in failed:
            reason = self._explain_failure(outcome)
            failed_explanations.append({
                "seller_id": outcome.seller_id,
                "seller_name": outcome.seller_name,
                "status": outcome.status,
                "reason": reason,
                "rounds_taken": outcome.rounds_taken,
            })

        # Build summary
        winner = rankings[0] if rankings else None
        summary = self._build_summary(winner, rankings, failed_explanations, item_name)

        # Build credit card tip
        credit_card_tip = ""
        if wallet and winner and winner.card_recommendation:
            credit_card_tip = f"💳 Pro tip: {winner.card_recommendation}. This saves you an additional ${winner.total_cost - winner.effective_total:.2f}!"

        return DealExplanation(
            winner=winner,
            rankings=rankings,
            failed_sellers=failed_explanations,
            summary=summary,
            credit_card_tip=credit_card_tip,
        )

    def _explain_winner(self, outcome: SellerOutcome, savings: float, wallet: Optional[CardWallet]) -> str:
        """Explain why this deal is the winner."""
        parts = [f"Best deal at ${outcome.final_price:.2f}/unit"]
        if savings > 0:
            parts.append(f"saving ${savings:.2f} vs your max budget")
        parts.append(f"negotiated in {outcome.rounds_taken} rounds")
        if outcome.card_benefit and outcome.card_benefit.total_savings > 0:
            parts.append(f"plus ${outcome.card_benefit.total_savings:.2f} in credit card rewards with {outcome.card_benefit.card_name}")
        return ". ".join(parts) + "."

    def _explain_loser(self, outcome: SellerOutcome, winner: SellerOutcome, savings: float) -> str:
        """Explain why this deal ranked lower."""
        diff = (outcome.effective_price or outcome.final_price) - (winner.effective_price or winner.final_price)
        return f"${diff:.2f}/unit more expensive than the winning deal. Final price ${outcome.final_price:.2f}/unit after {outcome.rounds_taken} rounds."

    def _explain_failure(self, outcome: SellerOutcome) -> str:
        """Explain why a negotiation failed."""
        reasons = {
            "timeout": f"{outcome.seller_name} took too long to respond and the negotiation timed out after {outcome.rounds_taken} rounds.",
            "constraint_violation": f"{outcome.seller_name}'s best offer exceeded your budget constraints.",
            "walked_away": f"{outcome.seller_name} walked away from the negotiation after {outcome.rounds_taken} rounds.",
            "no_deal": f"No agreement reached with {outcome.seller_name} after {outcome.rounds_taken} rounds of negotiation.",
        }
        return outcome.failure_reason or reasons.get(outcome.status, f"Negotiation with {outcome.seller_name} did not result in a deal.")

    def _build_summary(
        self,
        winner: Optional[DealRanking],
        rankings: list[DealRanking],
        failed: list[dict],
        item_name: str
    ) -> str:
        """Build a human-readable summary."""
        if not winner:
            return f"No successful deals were made for {item_name}. All {len(failed)} sellers either timed out, violated constraints, or walked away."

        total_sellers = len(rankings) + len(failed)
        summary = f"Negotiated with {total_sellers} sellers for {item_name}. "
        summary += f"{len(rankings)} resulted in deals, {len(failed)} did not. "
        summary += f"Winner: {winner.seller_name} at ${winner.final_price:.2f}/unit"

        if winner.effective_price < winner.final_price:
            summary += f" (effective ${winner.effective_price:.2f}/unit after card rewards)"

        summary += f", saving ${winner.savings_vs_asking:.2f} vs your budget."

        return summary


# Singleton
deal_explainer = DealExplainer()
