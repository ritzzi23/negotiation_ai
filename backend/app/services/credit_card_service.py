"""
Credit Card Rewards Engine.

WHAT: Factor credit card cashback/rewards into deal analysis
WHY: Users get better deals when their card rewards are considered
HOW: Match seller categories to card reward tiers, compute effective prices
"""

from typing import Optional
from dataclasses import dataclass, field
from ..utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class CardReward:
    """A reward tier for a credit card."""
    category: str  # e.g., "electronics", "dining", "general", "online_shopping"
    cashback_pct: float  # e.g., 5.0 for 5%
    description: str = ""


@dataclass
class VendorOffer:
    """A special offer for a specific vendor on a card."""
    vendor_keyword: str  # e.g., "Amazon", "BestBuy" - matched against seller name
    discount_pct: float  # e.g., 10.0 for 10% off
    max_discount: float = 0.0  # 0 means unlimited
    description: str = ""


@dataclass
class CreditCard:
    """A user's credit card with rewards structure."""
    card_id: str
    card_name: str  # e.g., "Chase Sapphire Preferred"
    issuer: str  # e.g., "Chase", "Amex", "Citi"
    rewards: list[CardReward] = field(default_factory=list)
    vendor_offers: list[VendorOffer] = field(default_factory=list)
    annual_fee: float = 0.0


@dataclass
class CardWallet:
    """User's collection of credit cards."""
    cards: list[CreditCard] = field(default_factory=list)


@dataclass
class CardBenefit:
    """Computed benefit of using a specific card for a purchase."""
    card_id: str
    card_name: str
    cashback_pct: float
    cashback_amount: float
    vendor_discount_pct: float
    vendor_discount_amount: float
    effective_price: float  # price after all rewards
    total_savings: float
    explanation: str


class CreditCardService:
    """Service to compute credit card rewards for deals."""

    # Default category mappings for common item types
    CATEGORY_MAP = {
        "laptop": "electronics",
        "phone": "electronics",
        "tablet": "electronics",
        "computer": "electronics",
        "monitor": "electronics",
        "keyboard": "electronics",
        "mouse": "electronics",
        "headphones": "electronics",
        "camera": "electronics",
        "tv": "electronics",
        "speaker": "electronics",
        "console": "electronics",
        "gpu": "electronics",
        "ram": "electronics",
        "ssd": "electronics",
        "furniture": "home",
        "chair": "home",
        "desk": "home",
        "sofa": "home",
        "mattress": "home",
        "lamp": "home",
        "book": "books",
        "textbook": "books",
        "clothing": "fashion",
        "shoes": "fashion",
        "jacket": "fashion",
        "food": "dining",
        "restaurant": "dining",
        "grocery": "groceries",
    }

    def detect_category(self, item_name: str) -> str:
        """Detect the reward category from an item name."""
        item_lower = item_name.lower()
        for keyword, category in self.CATEGORY_MAP.items():
            if keyword in item_lower:
                return category
        return "general"

    def compute_best_card(
        self,
        wallet: CardWallet,
        item_name: str,
        seller_name: str,
        price: float,
        quantity: int = 1
    ) -> Optional[CardBenefit]:
        """
        Compute the best credit card to use for a specific purchase.

        Args:
            wallet: User's card wallet
            item_name: Name of the item being purchased
            seller_name: Name of the seller
            price: Price per unit
            quantity: Number of units

        Returns:
            CardBenefit with the best card recommendation, or None if no cards
        """
        if not wallet.cards:
            return None

        total_price = price * quantity
        category = self.detect_category(item_name)
        best_benefit: Optional[CardBenefit] = None

        for card in wallet.cards:
            # Find best matching reward tier
            cashback_pct = 0.0
            for reward in card.rewards:
                if reward.category == category or reward.category == "general":
                    if reward.cashback_pct > cashback_pct:
                        cashback_pct = reward.cashback_pct

            cashback_amount = total_price * (cashback_pct / 100.0)

            # Check vendor-specific offers
            vendor_discount_pct = 0.0
            vendor_discount_amount = 0.0
            seller_lower = seller_name.lower()
            for offer in card.vendor_offers:
                if offer.vendor_keyword.lower() in seller_lower:
                    vendor_discount_pct = offer.discount_pct
                    vendor_discount_amount = total_price * (vendor_discount_pct / 100.0)
                    if offer.max_discount > 0:
                        vendor_discount_amount = min(vendor_discount_amount, offer.max_discount)
                    break

            total_savings = cashback_amount + vendor_discount_amount
            effective_price = total_price - total_savings

            # Build explanation
            parts = []
            if cashback_pct > 0:
                parts.append(f"{cashback_pct}% cashback on {category} (${cashback_amount:.2f})")
            if vendor_discount_pct > 0:
                parts.append(f"{vendor_discount_pct}% vendor offer with {seller_name} (${vendor_discount_amount:.2f})")

            explanation = f"Using {card.card_name}: " + ", ".join(parts) if parts else f"No special rewards with {card.card_name}"

            benefit = CardBenefit(
                card_id=card.card_id,
                card_name=card.card_name,
                cashback_pct=cashback_pct,
                cashback_amount=round(cashback_amount, 2),
                vendor_discount_pct=vendor_discount_pct,
                vendor_discount_amount=round(vendor_discount_amount, 2),
                effective_price=round(effective_price, 2),
                total_savings=round(total_savings, 2),
                explanation=explanation,
            )

            if best_benefit is None or benefit.total_savings > best_benefit.total_savings:
                best_benefit = benefit

        return best_benefit

    def compute_all_cards(
        self,
        wallet: CardWallet,
        item_name: str,
        seller_name: str,
        price: float,
        quantity: int = 1
    ) -> list[CardBenefit]:
        """Compute benefits for all cards, sorted by savings (best first)."""
        if not wallet.cards:
            return []

        total_price = price * quantity
        category = self.detect_category(item_name)
        benefits = []

        for card in wallet.cards:
            cashback_pct = 0.0
            for reward in card.rewards:
                if reward.category == category or reward.category == "general":
                    if reward.cashback_pct > cashback_pct:
                        cashback_pct = reward.cashback_pct

            cashback_amount = total_price * (cashback_pct / 100.0)

            vendor_discount_pct = 0.0
            vendor_discount_amount = 0.0
            seller_lower = seller_name.lower()
            for offer in card.vendor_offers:
                if offer.vendor_keyword.lower() in seller_lower:
                    vendor_discount_pct = offer.discount_pct
                    vendor_discount_amount = total_price * (vendor_discount_pct / 100.0)
                    if offer.max_discount > 0:
                        vendor_discount_amount = min(vendor_discount_amount, offer.max_discount)
                    break

            total_savings = cashback_amount + vendor_discount_amount
            effective_price = total_price - total_savings

            parts = []
            if cashback_pct > 0:
                parts.append(f"{cashback_pct}% cashback on {category} (${cashback_amount:.2f})")
            if vendor_discount_pct > 0:
                parts.append(f"{vendor_discount_pct}% vendor offer (${vendor_discount_amount:.2f})")

            explanation = f"Using {card.card_name}: " + ", ".join(parts) if parts else f"No special rewards with {card.card_name}"

            benefits.append(CardBenefit(
                card_id=card.card_id,
                card_name=card.card_name,
                cashback_pct=cashback_pct,
                cashback_amount=round(cashback_amount, 2),
                vendor_discount_pct=vendor_discount_pct,
                vendor_discount_amount=round(vendor_discount_amount, 2),
                effective_price=round(effective_price, 2),
                total_savings=round(total_savings, 2),
                explanation=explanation,
            ))

        benefits.sort(key=lambda b: b.total_savings, reverse=True)
        return benefits


# Default sample cards for demo
def get_demo_wallet() -> CardWallet:
    """Get a demo wallet with sample credit cards."""
    return CardWallet(cards=[
        CreditCard(
            card_id="chase_sapphire",
            card_name="Chase Sapphire Preferred",
            issuer="Chase",
            rewards=[
                CardReward(category="dining", cashback_pct=3.0),
                CardReward(category="travel", cashback_pct=5.0),
                CardReward(category="online_shopping", cashback_pct=2.0),
                CardReward(category="general", cashback_pct=1.0),
            ],
            vendor_offers=[
                VendorOffer(vendor_keyword="Amazon", discount_pct=5.0, max_discount=25.0,
                           description="5% off Amazon purchases up to $25"),
            ],
            annual_fee=95.0,
        ),
        CreditCard(
            card_id="amex_blue",
            card_name="Amex Blue Cash Preferred",
            issuer="American Express",
            rewards=[
                CardReward(category="groceries", cashback_pct=6.0),
                CardReward(category="electronics", cashback_pct=3.0),
                CardReward(category="online_shopping", cashback_pct=3.0),
                CardReward(category="general", cashback_pct=1.0),
            ],
            vendor_offers=[
                VendorOffer(vendor_keyword="BestBuy", discount_pct=10.0, max_discount=50.0,
                           description="10% off Best Buy up to $50"),
                VendorOffer(vendor_keyword="Tech", discount_pct=5.0, max_discount=30.0,
                           description="5% off tech retailers up to $30"),
            ],
            annual_fee=95.0,
        ),
        CreditCard(
            card_id="citi_double",
            card_name="Citi Double Cash",
            issuer="Citi",
            rewards=[
                CardReward(category="general", cashback_pct=2.0,
                          description="2% on everything (1% purchase + 1% payment)"),
            ],
            vendor_offers=[],
            annual_fee=0.0,
        ),
        CreditCard(
            card_id="discover_it",
            card_name="Discover it Cash Back",
            issuer="Discover",
            rewards=[
                CardReward(category="electronics", cashback_pct=5.0,
                          description="5% rotating category - electronics this quarter"),
                CardReward(category="general", cashback_pct=1.0),
            ],
            vendor_offers=[
                VendorOffer(vendor_keyword="Walmart", discount_pct=5.0, max_discount=20.0),
            ],
            annual_fee=0.0,
        ),
    ])


# Singleton
credit_card_service = CreditCardService()
