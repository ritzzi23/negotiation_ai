"""
Seller selection service for Phase 3.

WHAT: Select participating sellers for a buyer item based on inventory and constraints
WHY: Determine which sellers can participate in a negotiation
HOW: Match buyer item against seller inventory, check price overlap and quantity
"""

from typing import List, Tuple, Optional
from ..core.models import Seller, SellerInventory, BuyerItem
from ..models.agent import Seller as SellerModel, InventoryItem
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


def select_sellers_for_item(
    buyer_item: BuyerItem,
    sellers: List[Seller],
    seller_inventories: List[List[SellerInventory]]
) -> Tuple[List[Seller], List[dict]]:
    """
    Select sellers who can participate in negotiation for a buyer item.
    
    WHAT: Match buyer item against seller inventories
    WHY: Determine participants and reasons for skipped sellers
    HOW: Check price overlap, quantity availability, and item match
    
    Args:
        buyer_item: BuyerItem from database
        sellers: List of Seller ORM models
        seller_inventories: List of inventory lists, one per seller (same order as sellers)
    
    Returns:
        Tuple of (participating_sellers, skipped_reasons)
        - participating_sellers: List of Seller ORM models that can participate
        - skipped_reasons: List of dicts with seller_id, seller_name, reason_code
    """
    participating_sellers = []
    skipped_reasons = []
    
    for seller, inventory_list in zip(sellers, seller_inventories):
        # Find matching inventory item by product_id (strict) or exact item_name
        matching_inventory = None
        for inv in inventory_list:
            if buyer_item.product_id:
                if inv.product_id and inv.product_id == buyer_item.product_id:
                    if _variant_match(buyer_item.variant, inv.variant) and _size_match(
                        buyer_item.size_value,
                        buyer_item.size_unit,
                        inv.size_value,
                        inv.size_unit,
                    ):
                        matching_inventory = inv
                        break
                continue
            if inv.item_name.lower().strip() == buyer_item.item_name.lower().strip():
                if _variant_match(buyer_item.variant, inv.variant) and _size_match(
                    buyer_item.size_value,
                    buyer_item.size_unit,
                    inv.size_value,
                    inv.size_unit,
                ):
                    matching_inventory = inv
                    break
        
        if not matching_inventory:
            skipped_reasons.append({
                "seller_id": seller.id,
                "seller_name": seller.name,
                "reason_code": "no_inventory"
            })
            continue
        
        # Check quantity availability
        if matching_inventory.quantity_available < buyer_item.quantity_needed:
            skipped_reasons.append({
                "seller_id": seller.id,
                "seller_name": seller.name,
                "reason_code": "insufficient_quantity",
                "details": f"Available: {matching_inventory.quantity_available}, Needed: {buyer_item.quantity_needed}"
            })
            continue
        
        # Check price overlap
        # Seller can participate if:
        # - Seller's least_price <= buyer's max_price (seller can go low enough)
        # - Seller's selling_price >= buyer's min_price (seller can meet buyer's minimum)
        price_overlap = (
            matching_inventory.least_price <= buyer_item.max_price_per_unit and
            matching_inventory.selling_price >= buyer_item.min_price_per_unit
        )
        
        if not price_overlap:
            skipped_reasons.append({
                "seller_id": seller.id,
                "seller_name": seller.name,
                "reason_code": "price_mismatch",
                "details": f"Seller range: ${matching_inventory.least_price:.2f}-${matching_inventory.selling_price:.2f}, Buyer range: ${buyer_item.min_price_per_unit:.2f}-${buyer_item.max_price_per_unit:.2f}"
            })
            continue
        
        # All checks passed - seller can participate
        participating_sellers.append(seller)
    
    logger.info(
        f"Selected {len(participating_sellers)} sellers for item {buyer_item.item_name}, "
        f"skipped {len(skipped_reasons)} sellers"
    )
    
    return participating_sellers, skipped_reasons


def select_sellers_from_models(
    buyer_item_id: str,
    buyer_item_name: str,
    quantity_needed: int,
    min_price: float,
    max_price: float,
    sellers: List[SellerModel],
    buyer_variant: Optional[str] = None,
    buyer_size_value: Optional[float] = None,
    buyer_size_unit: Optional[str] = None,
) -> Tuple[List[SellerModel], List[dict]]:
    """
    Select sellers from in-memory Seller models (for Phase 2 compatibility).
    
    Args:
        buyer_item_id: Item ID being negotiated
        buyer_item_name: Item name
        quantity_needed: Quantity buyer needs
        min_price: Minimum price buyer will pay
        max_price: Maximum price buyer will pay
        sellers: List of Seller models (from app.models.agent)
    
    Returns:
        Tuple of (participating_sellers, skipped_reasons)
    """
    participating_sellers = []
    skipped_reasons = []
    
    for seller in sellers:
        # Find matching inventory item by product_id when available, else exact item_name
        matching_inventory = None
        for inv in seller.inventory:
            if getattr(inv, "product_id", None) and buyer_item_id and inv.product_id == buyer_item_id:
                if _variant_match(buyer_variant, getattr(inv, "variant", None)) and _size_match(
                    buyer_size_value,
                    buyer_size_unit,
                    getattr(inv, "size_value", None),
                    getattr(inv, "size_unit", None),
                ):
                    matching_inventory = inv
                    break
            if inv.item_name.lower().strip() == buyer_item_name.lower().strip():
                if _variant_match(buyer_variant, getattr(inv, "variant", None)) and _size_match(
                    buyer_size_value,
                    buyer_size_unit,
                    getattr(inv, "size_value", None),
                    getattr(inv, "size_unit", None),
                ):
                    matching_inventory = inv
                    break
        
        if not matching_inventory:
            skipped_reasons.append({
                "seller_id": seller.seller_id,
                "seller_name": seller.name,
                "reason_code": "no_inventory"
            })
            continue
        
        # Check quantity availability
        if matching_inventory.quantity_available < quantity_needed:
            skipped_reasons.append({
                "seller_id": seller.seller_id,
                "seller_name": seller.name,
                "reason_code": "insufficient_quantity",
                "details": f"Available: {matching_inventory.quantity_available}, Needed: {quantity_needed}"
            })
            continue
        
        # Check price overlap
        price_overlap = (
            matching_inventory.least_price <= max_price and
            matching_inventory.selling_price >= min_price
        )
        
        if not price_overlap:
            skipped_reasons.append({
                "seller_id": seller.seller_id,
                "seller_name": seller.name,
                "reason_code": "price_mismatch",
                "details": f"Seller range: ${matching_inventory.least_price:.2f}-${matching_inventory.selling_price:.2f}, Buyer range: ${min_price:.2f}-${max_price:.2f}"
            })
            continue
        
        # All checks passed
        participating_sellers.append(seller)
    
    return participating_sellers, skipped_reasons

