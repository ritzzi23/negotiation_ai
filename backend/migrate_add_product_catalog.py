"""
Migration: add product catalog tables and product_id columns.

Usage:
  python migrate_add_product_catalog.py
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


def create_products_table(conn) -> None:
    conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    )
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)"))


def add_product_id_column(conn, table_name: str) -> None:
    if not column_exists(conn, table_name, "product_id"):
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN product_id TEXT"))


def backfill_products(conn) -> None:
    conn.execute(
        text(
            """
            INSERT OR IGNORE INTO products (id, name)
            SELECT DISTINCT item_id, item_name
            FROM buyer_items
            WHERE item_id IS NOT NULL AND item_name IS NOT NULL
            """
        )
    )
    conn.execute(
        text(
            """
            INSERT OR IGNORE INTO products (id, name)
            SELECT DISTINCT item_id, item_name
            FROM seller_inventory
            WHERE item_id IS NOT NULL AND item_name IS NOT NULL
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE products
            SET name = (
                SELECT item_name FROM buyer_items
                WHERE buyer_items.item_id = products.id
                AND item_name IS NOT NULL
                LIMIT 1
            )
            WHERE (name IS NULL OR name = '')
            AND EXISTS (
                SELECT 1 FROM buyer_items
                WHERE buyer_items.item_id = products.id
                AND item_name IS NOT NULL
            )
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE products
            SET name = (
                SELECT item_name FROM seller_inventory
                WHERE seller_inventory.item_id = products.id
                AND item_name IS NOT NULL
                LIMIT 1
            )
            WHERE (name IS NULL OR name = '')
            AND EXISTS (
                SELECT 1 FROM seller_inventory
                WHERE seller_inventory.item_id = products.id
                AND item_name IS NOT NULL
            )
            """
        )
    )


def backfill_product_ids(conn) -> None:
    conn.execute(
        text(
            """
            UPDATE buyer_items
            SET product_id = item_id
            WHERE product_id IS NULL AND item_id IS NOT NULL
            """
        )
    )
    conn.execute(
        text(
            """
            UPDATE seller_inventory
            SET product_id = item_id
            WHERE product_id IS NULL AND item_id IS NOT NULL
            """
        )
    )


def ensure_indexes(conn) -> None:
    conn.execute(
        text("CREATE INDEX IF NOT EXISTS idx_buyer_items_product ON buyer_items(product_id)")
    )
    conn.execute(
        text(
            "CREATE INDEX IF NOT EXISTS idx_seller_inventory_product ON seller_inventory(product_id)"
        )
    )


def migrate() -> None:
    with engine.begin() as conn:
        if not table_exists(conn, "buyer_items") or not table_exists(conn, "seller_inventory"):
            init_db()
            return

        create_products_table(conn)
        add_product_id_column(conn, "buyer_items")
        add_product_id_column(conn, "seller_inventory")
        backfill_products(conn)
        backfill_product_ids(conn)
        ensure_indexes(conn)


if __name__ == "__main__":
    migrate()
    print("Product catalog migration completed.")
