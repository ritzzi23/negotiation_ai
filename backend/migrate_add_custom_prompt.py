#!/usr/bin/env python3
"""
Database migration script: Add custom_prompt column to buyers and sellers tables.

WHAT: Adds the custom_prompt column to existing databases
WHY: ORM expects these columns for custom agent instructions
HOW: ALTER TABLE with nullable TEXT

Usage:
    python migrate_add_custom_prompt.py
"""

import sqlite3
import sys
from pathlib import Path

# Database path (relative to backend directory)
DB_PATH = Path(__file__).parent / "data" / "marketplace.db"


def migrate_table(cursor, table: str):
    """Add custom_prompt to table if missing. Returns True if migration ran."""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]

    if "custom_prompt" in columns:
        print(f"[OK] Column 'custom_prompt' already exists in {table}.")
        return False

    print(f"[+] Adding 'custom_prompt' column to {table}...")
    cursor.execute(f"""
        ALTER TABLE {table}
        ADD COLUMN custom_prompt TEXT
    """)
    return True


def migrate():
    """Add custom_prompt to buyers and sellers if they don't exist."""

    if not DB_PATH.exists():
        print(f"[OK] Database does not exist yet at {DB_PATH}")
        print("   No migration needed - columns will be created automatically.")
        return

    print(f"[*] Migrating database: {DB_PATH}")

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        changed = False
        changed |= migrate_table(cursor, "buyers")
        changed |= migrate_table(cursor, "sellers")

        if changed:
            conn.commit()
            print("[OK] Migration completed successfully!")
        else:
            print("[OK] No migration needed.")

        conn.close()

    except sqlite3.Error as e:
        print(f"[ERROR] Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    print("=" * 60)
    print("Database Migration: Add custom_prompt to buyers and sellers")
    print("=" * 60)
    migrate()
    print("=" * 60)
