"""
Mobile companion API endpoints.

WHAT: Lightweight endpoints for Galaxy S25 phone companion
WHY: Phone acts as capture & action surface - scan products, set constraints, get deal results
HOW: Minimal REST endpoints optimized for mobile bandwidth
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

from ....core.session_manager import session_manager
from ....core.database import get_db
from ....services.credit_card_service import credit_card_service, get_demo_wallet, CardWallet, CreditCard, CardReward, VendorOffer
from ....services.deal_explainer import deal_explainer
from ....utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# --- Mobile Request/Response Models ---

class QuickConstraintRequest(BaseModel):
    """Quick constraint input from phone (scan or paste)."""
    item_name: str = Field(..., min_length=1, max_length=200)
    max_budget: float = Field(..., gt=0)
    quantity: int = Field(1, gt=0)
    notes: Optional[str] = Field(None, max_length=500)


class QuickConstraintResponse(BaseModel):
    """Confirmation that constraints were received."""
    status: str = "received"
    item_name: str
    max_budget: float
    quantity: int
    timestamp: datetime
    message: str = "Constraints sent to your PC. Negotiation will begin when you start a session."


class DealNotification(BaseModel):
    """Lightweight deal notification for phone."""
    item_name: str
    winner_seller: Optional[str] = None
    final_price: Optional[float] = None
    effective_price: Optional[float] = None
    total_savings: Optional[float] = None
    card_tip: str = ""
    status: str  # "deal", "no_deal", "in_progress"
    summary: str = ""


class SessionStatusMobile(BaseModel):
    """Lightweight session status for phone."""
    session_id: str
    status: str
    total_rooms: int
    completed: int
    in_progress: int
    deals_made: int
    total_spent: float = 0.0
    notifications: List[DealNotification] = []


class PairDeviceRequest(BaseModel):
    """Pair phone with PC session."""
    session_id: str


class PairDeviceResponse(BaseModel):
    """Device pairing confirmation."""
    paired: bool
    session_id: str
    pc_address: str = ""
    message: str = ""


# --- Mobile Endpoints ---

@router.post("/mobile/constraints", response_model=QuickConstraintResponse)
async def submit_constraints(request: QuickConstraintRequest):
    """
    Submit item constraints from phone.
    Quick capture: paste a link, scan a product, or type item details.
    Constraints are queued for the next negotiation session on the PC.
    """
    logger.info(f"Mobile constraint received: {request.item_name} at max ${request.max_budget}")

    # Store in a simple in-memory queue (for hackathon demo)
    if not hasattr(submit_constraints, '_queue'):
        submit_constraints._queue = []

    submit_constraints._queue.append({
        "item_name": request.item_name,
        "max_budget": request.max_budget,
        "quantity": request.quantity,
        "notes": request.notes,
        "timestamp": datetime.now().isoformat(),
    })

    return QuickConstraintResponse(
        item_name=request.item_name,
        max_budget=request.max_budget,
        quantity=request.quantity,
        timestamp=datetime.now(),
        message=f"Got it! Looking for {request.item_name} under ${request.max_budget:.2f}. Check your PC dashboard for live negotiations.",
    )


@router.get("/mobile/constraints")
async def get_pending_constraints():
    """Get pending constraints submitted from phone (used by PC to consume)."""
    queue = getattr(submit_constraints, '_queue', [])
    return {"constraints": queue, "count": len(queue)}


@router.delete("/mobile/constraints")
async def clear_constraints():
    """Clear the constraint queue after PC consumes them."""
    submit_constraints._queue = []
    return {"cleared": True}


@router.get("/mobile/session/{session_id}/status", response_model=SessionStatusMobile)
async def get_mobile_session_status(session_id: str):
    """
    Get lightweight session status for phone display.
    Optimized for mobile - minimal data, clear status indicators.
    """
    session_data = session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )

    rooms = session_data.get("rooms", [])
    completed = sum(1 for r in rooms if r.get("status") in ("completed",))
    in_progress = sum(1 for r in rooms if r.get("status") in ("active",))
    deals_made = sum(1 for r in rooms if r.get("outcome") and r["outcome"].get("decision_type") == "deal")

    # Build notifications for completed rooms
    notifications = []
    for room in rooms:
        outcome = room.get("outcome")
        if outcome:
            notifications.append(DealNotification(
                item_name=room.get("item_name", "Unknown"),
                winner_seller=outcome.get("selected_seller"),
                final_price=outcome.get("final_price"),
                effective_price=outcome.get("effective_price"),
                total_savings=outcome.get("savings"),
                card_tip=outcome.get("card_tip", ""),
                status="deal" if outcome.get("decision_type") == "deal" else "no_deal",
                summary=outcome.get("reason", ""),
            ))
        elif room.get("status") == "active":
            notifications.append(DealNotification(
                item_name=room.get("item_name", "Unknown"),
                status="in_progress",
                summary=f"Round {room.get('current_round', 0)} in progress...",
            ))

    return SessionStatusMobile(
        session_id=session_id,
        status=session_data.get("status", "unknown"),
        total_rooms=len(rooms),
        completed=completed,
        in_progress=in_progress,
        deals_made=deals_made,
        notifications=notifications,
    )


@router.post("/mobile/pair", response_model=PairDeviceResponse)
async def pair_device(request: PairDeviceRequest):
    """
    Pair phone with PC session for real-time updates.
    In production this would use WebSocket or push notifications.
    For hackathon demo, returns polling endpoint info.
    """
    session_data = session_manager.get_session(request.session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {request.session_id} not found"
        )

    return PairDeviceResponse(
        paired=True,
        session_id=request.session_id,
        pc_address="http://<PC_IP>:8000",
        message="Paired! You'll receive deal notifications here. Use /mobile/session/{id}/status to check progress.",
    )


@router.get("/mobile/cards/demo")
async def get_demo_cards():
    """Get demo credit cards for the mobile wallet UI."""
    wallet = get_demo_wallet()
    return {
        "cards": [
            {
                "card_id": card.card_id,
                "card_name": card.card_name,
                "issuer": card.issuer,
                "rewards": [{"category": r.category, "cashback_pct": r.cashback_pct} for r in card.rewards],
                "vendor_offers": [
                    {"vendor": o.vendor_keyword, "discount_pct": o.discount_pct, "max_discount": o.max_discount}
                    for o in card.vendor_offers
                ],
                "annual_fee": card.annual_fee,
            }
            for card in wallet.cards
        ]
    }
