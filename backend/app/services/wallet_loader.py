"""
Wallet loader: build CardWallet from session credit cards (Place 2).

WHAT: Load CreditCardRecord rows for a session and convert to CardWallet for the Deal Calculator.
WHY: Tool and agents need "buyer's cards" from per-session data.
HOW: Query by session_id, deserialize rewards_json and vendor_offers_json into CreditCard/CardWallet.
"""

import json
from typing import Optional

from ..core.database import get_db
from ..core.models import CreditCardRecord
from .credit_card_service import (
    CardWallet,
    CreditCard,
    CardReward,
    VendorOffer,
)
from ..utils.logger import get_logger

logger = get_logger(__name__)


def get_wallet_for_session(session_id: str) -> CardWallet:
    """
    Load the buyer's card wallet for a session (Place 2: per-buyer cards).

    Args:
        session_id: Session ID.

    Returns:
        CardWallet (possibly empty if no cards stored).
    """
    with get_db() as db:
        rows = db.query(CreditCardRecord).filter(
            CreditCardRecord.session_id == session_id
        ).all()

    cards = []
    for row in rows:
        rewards = []
        if row.rewards_json:
            try:
                data = json.loads(row.rewards_json)
                if isinstance(data, list):
                    for r in data:
                        if isinstance(r, dict) and "category" in r and "cashback_pct" in r:
                            rewards.append(CardReward(
                                category=r["category"],
                                cashback_pct=float(r["cashback_pct"]),
                                description=r.get("description", ""),
                            ))
            except (json.JSONDecodeError, TypeError, KeyError) as e:
                logger.warning(f"Failed to parse rewards_json for card {row.card_id}: {e}")

        vendor_offers = []
        if row.vendor_offers_json:
            try:
                data = json.loads(row.vendor_offers_json)
                if isinstance(data, list):
                    for v in data:
                        if isinstance(v, dict) and "vendor_keyword" in v and "discount_pct" in v:
                            vendor_offers.append(VendorOffer(
                                vendor_keyword=v["vendor_keyword"],
                                discount_pct=float(v["discount_pct"]),
                                max_discount=float(v.get("max_discount", 0)),
                                description=v.get("description", ""),
                            ))
            except (json.JSONDecodeError, TypeError, KeyError) as e:
                logger.warning(f"Failed to parse vendor_offers_json for card {row.card_id}: {e}")

        cards.append(CreditCard(
            card_id=row.card_id,
            card_name=row.card_name,
            issuer=row.issuer,
            rewards=rewards,
            vendor_offers=vendor_offers,
            annual_fee=float(row.annual_fee or 0),
        ))

    return CardWallet(cards=cards)
