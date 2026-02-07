"""
Migration: add product variant and size fields.

Usage:
  python migrate_add_product_variants.py
"""

from sqlalchemy import text

from app.core.database import engine, init_db


def table_exists(conn, table_name: str) -> bool:
    result = conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
        {"name": table_name},
    ).fetchone()
    return result is not None


def column_exists(conn, table_name: str, column_name: str) -> bool:
    rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return any(row[1] == column_name for row in rows)


def add_column(conn, table_name: str, column_def: str, column_name: str) -> None:
    if not column_exists(conn, table_name, column_name):
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_def}"))


def add_indexes(conn) -> None:
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)"))


def backfill_item_variants(conn) -> None:
    conn.execute(
        text(
            """
            UPDATE buyer_items
            SET
                variant = COALESCE(variant, (SELECT variant FROM products WHERE products.id = buyer_items.product_id)),
                size_value = COALESCE(size_value, (SELECT size_value FROM products WHERE products.id = buyer_items.product_id)),
                size_unit = COALESCE(size_unit, (SELECT size_unit FROM products WHERE products.id = buyer_items.product_id))
            WHERE product_id IS NOT NULL
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE seller_inventory
            SET
                variant = COALESCE(variant, (SELECT variant FROM products WHERE products.id = seller_inventory.product_id)),
                size_value = COALESCE(size_value, (SELECT size_value FROM products WHERE products.id = seller_inventory.product_id)),
                size_unit = COALESCE(size_unit, (SELECT size_unit FROM products WHERE products.id = seller_inventory.product_id))
            WHERE product_id IS NOT NULL
            """
        )
    )


def migrate() -> None:
    with engine.begin() as conn:
        if not table_exists(conn, "products"):
            init_db()
            return

        add_column(conn, "products", "sku TEXT", "sku")
        add_column(conn, "products", "variant TEXT", "variant")
        add_column(conn, "products", "size_value REAL", "size_value")
        add_column(conn, "products", "size_unit TEXT", "size_unit")

        add_column(conn, "buyer_items", "variant TEXT", "variant")
        add_column(conn, "buyer_items", "size_value REAL", "size_value")
        add_column(conn, "buyer_items", "size_unit TEXT", "size_unit")

        add_column(conn, "seller_inventory", "variant TEXT", "variant")
        add_column(conn, "seller_inventory", "size_value REAL", "size_value")
        add_column(conn, "seller_inventory", "size_unit TEXT", "size_unit")

        add_indexes(conn)
        backfill_item_variants(conn)


if __name__ == "__main__":
    migrate()
    print("Product variant migration completed.")
