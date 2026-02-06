"""
Agent configuration models.

WHAT: Data structures for buyer constraints, seller profiles, and inventory
WHY: Type-safe configuration for agents without database dependencies
HOW: Dataclasses and TypedDicts for in-memory state
"""

from dataclasses import dataclass, field
from typing import TypedDict, Literal, Optional


# 10 distinct seller strategy types for rich negotiation dynamics
SELLER_STRATEGIES = [
    "firm_pricing",           # Won't budge much, defends list price
    "aggressive_discounter",  # Quickly drops price to close deal
    "bundler",                # Offers bundle deals and extras
    "limited_inventory",      # Creates urgency with scarcity
    "slow_responder",         # Takes time, may cause timeout
    "loyalty_builder",        # Focuses on relationship building
    "premium_positioner",     # Justifies high price with quality
    "price_matcher",          # Will match competitors
    "clearance_seller",       # Wants to move inventory fast
    "haggler",                # Enjoys back-and-forth, small increments
]

SellerStrategy = Literal[
    "firm_pricing", "aggressive_discounter", "bundler",
    "limited_inventory", "slow_responder", "loyalty_builder",
    "premium_positioner", "price_matcher", "clearance_seller", "haggler"
]

# Speaking styles for seller personality
SpeakingStyle = Literal["rude", "very_sweet", "professional", "casual", "enthusiastic"]


@dataclass
class BuyerConstraints:
    """Buyer's constraints for a single item."""
    item_id: str
    item_name: str
    quantity_needed: int
    min_price_per_unit: float
    max_price_per_unit: float


@dataclass
class InventoryItem:
    """Seller's inventory item with pricing constraints."""
    item_id: str
    item_name: str
    cost_price: float
    selling_price: float
    least_price: float  # Minimum price seller can accept
    quantity_available: int


@dataclass
class SellerProfile:
    """Seller's behavioral profile with rich strategy types."""
    priority: Literal["customer_retention", "maximize_profit"]
    speaking_style: SpeakingStyle = "professional"
    strategy: SellerStrategy = "firm_pricing"


@dataclass
class Seller:
    """Complete seller configuration."""
    seller_id: str
    name: str
    profile: SellerProfile
    inventory: list[InventoryItem]  # List of items seller has

