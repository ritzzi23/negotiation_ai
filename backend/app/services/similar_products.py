"""
Similar product suggestion service.

WHAT: Find alternative products in same category from seller inventory
WHY: When deals fail, suggest alternatives the buyer might accept
HOW: Query seller inventory for same-category items
"""

from typing import List, Dict, Optional
from ..core.database import get_db
from ..core.models import SellerInventory, Product
from ..utils.logger import get_logger

logger = get_logger(__name__)


def find_similar_products(
    seller_id: str,
    current_item_name: str,
    category: Optional[str] = None,
    max_results: int = 3,
) -> List[Dict]:
    """
    Find similar products from a seller's inventory.

    Args:
        seller_id: Seller ID
        current_item_name: Current product name (to exclude)
        category: Product category to match
        max_results: Maximum alternatives to return

    Returns:
        List of alternative product dicts
    """
    with get_db() as db:
        query = db.query(SellerInventory).filter(
            SellerInventory.seller_id == seller_id,
            SellerInventory.item_name != current_item_name,
        )

        if category:
            # Join with Product to filter by category
            query = query.join(Product, SellerInventory.product_id == Product.id).filter(
                Product.category == category
            )

        alternatives = query.limit(max_results).all()

        return [
            {
                "item_name": alt.item_name,
                "selling_price": alt.selling_price,
                "least_price": alt.least_price,
                "quantity_available": alt.quantity_available,
                "variant": alt.variant,
            }
            for alt in alternatives
        ]


def format_alternatives_for_prompt(alternatives: List[Dict]) -> str:
    """Format alternative products for injection into seller prompt."""
    if not alternatives:
        return ""

    lines = ["ALTERNATIVE PRODUCTS IN YOUR CATALOG:"]
    for alt in alternatives:
        price_str = f"${alt['selling_price']:.2f}"
        lines.append(f"- {alt['item_name']}: {price_str} (available: {alt['quantity_available']})")
    lines.append("If the buyer cannot afford the current item, you may suggest these alternatives.")
    return "\n".join(lines)
