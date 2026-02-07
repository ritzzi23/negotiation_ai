"""
Seed the product catalog with a baseline set of products.

Usage:
  python seed_products.py
  python seed_products.py --file ./data/seed_products.json
  python seed_products.py --reset
"""

import argparse
import json
from typing import List, Dict

from app.core.database import get_db
from app.core.models import Product


DEFAULT_PRODUCTS: List[Dict[str, object]] = [
    {"id": "item_laptop", "name": "Laptop", "category": "Electronics", "description": "Portable computer"},
    {"id": "item_smartphone", "name": "Smartphone", "category": "Electronics", "description": "Mobile phone"},
    {"id": "item_headphones", "name": "Headphones", "category": "Electronics", "description": "Over-ear or in-ear"},
    {"id": "item_monitor", "name": "Monitor", "category": "Electronics", "description": "External display"},
    {"id": "item_keyboard", "name": "Keyboard", "category": "Electronics", "description": "Mechanical or membrane"},
    {"id": "item_mouse", "name": "Mouse", "category": "Electronics", "description": "Wireless or wired"},
    {"id": "item_office_chair", "name": "Office Chair", "category": "Furniture", "description": "Ergonomic seating"},
    {"id": "item_desk", "name": "Desk", "category": "Furniture", "description": "Work surface"},
    {"id": "item_coffee_machine", "name": "Coffee Machine", "category": "Appliances", "description": "Brew coffee"},
    {"id": "item_printer", "name": "Printer", "category": "Office", "description": "Print documents"},
    {
        "id": "item_coke_can",
        "name": "Coke",
        "variant": "Can",
        "size_value": 330,
        "size_unit": "ml",
        "category": "Beverages",
        "description": "Coca-Cola 330ml can",
    },
    {
        "id": "item_coke_bottle",
        "name": "Coke",
        "variant": "Bottle",
        "size_value": 500,
        "size_unit": "ml",
        "category": "Beverages",
        "description": "Coca-Cola 500ml bottle",
    },
]


def load_products_from_file(path: str) -> List[Dict[str, str]]:
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError("Seed file must contain a list of products")
    return data


def upsert_products(products: List[Dict[str, str]]) -> None:
    with get_db() as db:
        for item in products:
            product_id = item.get("id")
            name = item.get("name")
            if not product_id or not name:
                continue

            existing = db.query(Product).filter(Product.id == product_id).first()
            if existing:
                existing.name = name
                existing.sku = item.get("sku")
                existing.variant = item.get("variant")
                existing.size_value = item.get("size_value")
                existing.size_unit = item.get("size_unit")
                existing.category = item.get("category")
                existing.description = item.get("description")
            else:
                db.add(
                    Product(
                        id=product_id,
                        name=name,
                        sku=item.get("sku"),
                        variant=item.get("variant"),
                        size_value=item.get("size_value"),
                        size_unit=item.get("size_unit"),
                        category=item.get("category"),
                        description=item.get("description"),
                    )
                )


def reset_products() -> None:
    with get_db() as db:
        db.query(Product).delete()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the product catalog")
    parser.add_argument("--file", dest="file_path", help="Path to JSON seed file")
    parser.add_argument("--reset", action="store_true", help="Delete all products before seeding")
    args = parser.parse_args()

    products = DEFAULT_PRODUCTS
    if args.file_path:
        products = load_products_from_file(args.file_path)

    if args.reset:
        reset_products()

    upsert_products(products)
    print(f"Seeded {len(products)} products.")


if __name__ == "__main__":
    main()
