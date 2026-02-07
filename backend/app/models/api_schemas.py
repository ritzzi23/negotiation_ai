"""
API request/response schemas for Phase 3.

WHAT: Pydantic models for API contracts
WHY: Type-safe request/response validation
HOW: Pydantic v2 models with validators
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Literal
from datetime import datetime
import uuid


# Request Models

class ProductBase(BaseModel):
    """Product catalog fields."""
    name: str = Field(..., min_length=1, max_length=100)
    sku: Optional[str] = Field(None, max_length=100)
    variant: Optional[str] = Field(None, max_length=100)
    size_value: Optional[float] = Field(None, gt=0)
    size_unit: Optional[str] = Field(None, max_length=20)
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator("size_unit")
    @classmethod
    def validate_size_unit(cls, v, info):
        if v and not info.data.get("size_value"):
            raise ValueError("size_value is required when size_unit is provided")
        return v

    @field_validator("size_value")
    @classmethod
    def validate_size_value(cls, v, info):
        if v is not None and not info.data.get("size_unit"):
            raise ValueError("size_unit is required when size_value is provided")
        return v


class ProductCreate(ProductBase):
    """Create a new product (id optional)."""
    id: Optional[str] = Field(None, min_length=1, max_length=50)


class ProductUpdate(BaseModel):
    """Update fields for a product."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    sku: Optional[str] = Field(None, max_length=100)
    variant: Optional[str] = Field(None, max_length=100)
    size_value: Optional[float] = Field(None, gt=0)
    size_unit: Optional[str] = Field(None, max_length=20)
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator("size_unit")
    @classmethod
    def validate_update_size_unit(cls, v, info):
        if v and not info.data.get("size_value"):
            raise ValueError("size_value is required when size_unit is provided")
        return v

    @field_validator("size_value")
    @classmethod
    def validate_update_size_value(cls, v, info):
        if v is not None and not info.data.get("size_unit"):
            raise ValueError("size_unit is required when size_value is provided")
        return v


class ProductResponse(ProductBase):
    """Product response model."""
    id: str
    created_at: datetime


class ProductListResponse(BaseModel):
    """List response for products."""
    items: List[ProductResponse]
    total: int

class ShoppingItem(BaseModel):
    """Shopping list item."""
    item_id: str = Field(..., min_length=1, max_length=50)
    item_name: str = Field(..., min_length=1, max_length=100)
    variant: Optional[str] = Field(None, max_length=100)
    size_value: Optional[float] = Field(None, gt=0)
    size_unit: Optional[str] = Field(None, max_length=20)
    quantity_needed: int = Field(..., gt=0)
    min_price_per_unit: float = Field(..., ge=0)
    max_price_per_unit: float = Field(..., gt=0)
    
    @field_validator("max_price_per_unit")
    @classmethod
    def validate_max_price(cls, v, info):
        if "min_price_per_unit" in info.data and v <= info.data["min_price_per_unit"]:
            raise ValueError("max_price_per_unit must be greater than min_price_per_unit")
        return v

    @field_validator("size_unit")
    @classmethod
    def validate_item_size_unit(cls, v, info):
        if v and not info.data.get("size_value"):
            raise ValueError("size_value is required when size_unit is provided")
        return v

    @field_validator("size_value")
    @classmethod
    def validate_item_size_value(cls, v, info):
        if v is not None and not info.data.get("size_unit"):
            raise ValueError("size_unit is required when size_value is provided")
        return v


class BuyerConfig(BaseModel):
    """Buyer configuration."""
    name: str = Field(..., min_length=1, max_length=50)
    shopping_list: List[ShoppingItem] = Field(..., min_length=1)


class InventoryItem(BaseModel):
    """Seller inventory item."""
    item_id: str = Field(..., min_length=1, max_length=50)
    item_name: str = Field(..., min_length=1, max_length=100)
    variant: Optional[str] = Field(None, max_length=100)
    size_value: Optional[float] = Field(None, gt=0)
    size_unit: Optional[str] = Field(None, max_length=20)
    cost_price: float = Field(..., ge=0)
    selling_price: float = Field(..., gt=0)
    least_price: float = Field(..., gt=0)
    quantity_available: int = Field(..., ge=1)
    
    @field_validator("selling_price")
    @classmethod
    def validate_selling_price(cls, v, info):
        if "cost_price" in info.data and v <= info.data["cost_price"]:
            raise ValueError("selling_price must be greater than cost_price")
        return v
    
    @field_validator("least_price")
    @classmethod
    def validate_least_price(cls, v, info):
        if "cost_price" in info.data and v <= info.data["cost_price"]:
            raise ValueError("least_price must be greater than cost_price")
        if "selling_price" in info.data and v >= info.data["selling_price"]:
            raise ValueError("least_price must be less than selling_price")
        return v

    @field_validator("size_unit")
    @classmethod
    def validate_inventory_size_unit(cls, v, info):
        if v and not info.data.get("size_value"):
            raise ValueError("size_value is required when size_unit is provided")
        return v

    @field_validator("size_value")
    @classmethod
    def validate_inventory_size_value(cls, v, info):
        if v is not None and not info.data.get("size_unit"):
            raise ValueError("size_unit is required when size_value is provided")
        return v


class CreditCardReward(BaseModel):
    """Credit card reward tier."""
    category: str = Field(..., min_length=1, description="Reward category e.g. electronics, dining, general")
    cashback_pct: float = Field(..., ge=0, le=30, description="Cashback percentage")


class CreditCardVendorOffer(BaseModel):
    """Credit card vendor-specific offer."""
    vendor_keyword: str = Field(..., min_length=1, description="Vendor name keyword to match against sellers")
    discount_pct: float = Field(..., ge=0, le=50, description="Discount percentage")
    max_discount: float = Field(0.0, ge=0, description="Maximum discount amount (0=unlimited)")


class CreditCardConfig(BaseModel):
    """Credit card configuration."""
    card_id: str = Field(default="", description="Card identifier")
    card_name: str = Field(..., min_length=1, max_length=100, description="e.g. Chase Sapphire Preferred")
    issuer: str = Field(..., min_length=1, max_length=50, description="e.g. Chase, Amex, Citi")
    rewards: List[CreditCardReward] = Field(default_factory=list)
    vendor_offers: List[CreditCardVendorOffer] = Field(default_factory=list)
    annual_fee: float = Field(0.0, ge=0)


class SellerProfile(BaseModel):
    """Seller behavioral profile with strategy types."""
    priority: Literal["customer_retention", "maximize_profit"]
    speaking_style: Literal["rude", "very_sweet", "professional", "casual", "enthusiastic"] = "professional"
    strategy: Literal[
        "firm_pricing", "aggressive_discounter", "bundler",
        "limited_inventory", "slow_responder", "loyalty_builder",
        "premium_positioner", "price_matcher", "clearance_seller", "haggler"
    ] = "firm_pricing"


class SellerConfig(BaseModel):
    """Seller configuration."""
    name: str = Field(..., min_length=1, max_length=50)
    inventory: List[InventoryItem] = Field(..., min_length=1)
    profile: SellerProfile


class LLMConfig(BaseModel):
    """LLM configuration."""
    model: str = Field(..., min_length=1)
    temperature: float = Field(0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(500, gt=0)
    provider: Optional[Literal["lm_studio", "openrouter"]] = Field(None, description="LLM provider to use (defaults to settings.LLM_PROVIDER)")


class InitializeSessionRequest(BaseModel):
    """Initialize session request."""
    buyer: BuyerConfig
    sellers: List[SellerConfig] = Field(..., min_length=1, max_length=10)
    llm_config: LLMConfig
    credit_cards: List[CreditCardConfig] = Field(default_factory=list, description="User's credit cards for reward optimization")


# Response Models

class BuyerConstraints(BaseModel):
    """Buyer constraints for an item."""
    min_price_per_unit: float
    max_price_per_unit: float


class SellerParticipant(BaseModel):
    """Seller participant in a negotiation."""
    seller_id: str
    seller_name: str
    initial_price: Optional[float] = None
    current_offer: Optional[Dict] = None


class NegotiationRoomInfo(BaseModel):
    """Negotiation room information."""
    room_id: str
    item_id: str
    item_name: str
    quantity_needed: int
    buyer_constraints: BuyerConstraints
    participating_sellers: List[SellerParticipant]
    status: str
    reason: Optional[str] = None


class InitializeSessionResponse(BaseModel):
    """Initialize session response."""
    session_id: str
    created_at: datetime
    buyer_id: str
    seller_ids: List[str]
    negotiation_rooms: List[NegotiationRoomInfo]
    total_rooms: int
    skipped_items: List[str] = []


class SendMessageRequest(BaseModel):
    """Send message request."""
    message: str = Field(..., min_length=1, max_length=1000)


class SendMessageResponse(BaseModel):
    """Send message response."""
    message_id: str
    timestamp: datetime
    mentioned_sellers: List[str]
    processing: bool


class Offer(BaseModel):
    """Offer model."""
    price: float
    quantity: int


class NegotiationOutcomeInfo(BaseModel):
    """Outcome info for a completed negotiation (includes card fields)."""
    decision_type: str
    selected_seller_id: Optional[str] = None
    final_price: Optional[float] = None
    quantity: Optional[int] = None
    total_cost: Optional[float] = None
    decision_reason: Optional[str] = None
    recommended_card: Optional[str] = None
    card_savings: Optional[float] = None
    effective_total: Optional[float] = None


class NegotiationStateResponse(BaseModel):
    """Negotiation state response."""
    room_id: str
    item_name: str
    status: str
    current_round: int
    max_rounds: int
    conversation_history: List[Dict]
    current_offers: Dict[str, Offer]
    buyer_constraints: BuyerConstraints
    outcome: Optional[NegotiationOutcomeInfo] = None


class NegotiationHighlights(BaseModel):
    """Negotiation highlights extracted by AI."""
    best_offer: str
    turning_points: List[str]
    tactics_used: List[str]


class PartyAnalysis(BaseModel):
    """Analysis of what a party did well and what to improve."""
    what_went_well: str
    what_to_improve: str


class ItemNegotiationSummary(BaseModel):
    """AI-generated summary for a single negotiation."""
    narrative: str
    buyer_analysis: PartyAnalysis
    seller_analysis: PartyAnalysis
    highlights: NegotiationHighlights
    deal_winner: str


class PurchaseSummary(BaseModel):
    """Purchase summary."""
    item_name: str
    quantity: int
    selected_seller: str
    final_price_per_unit: float
    total_cost: float
    negotiation_rounds: int
    duration_seconds: Optional[float] = None
    ai_summary: Optional[ItemNegotiationSummary] = None


class FailedItem(BaseModel):
    """Failed item."""
    item_name: str
    reason: str


class TotalCostSummary(BaseModel):
    """Total cost summary."""
    total_spent: float
    items_purchased: int
    average_savings_per_item: float


class NegotiationMetrics(BaseModel):
    """Negotiation metrics."""
    average_rounds: float
    average_duration_seconds: float
    total_messages_exchanged: int


class OverallAnalysis(BaseModel):
    """Overall analysis of all negotiations in a session."""
    performance_insights: str
    cross_item_comparison: str
    recommendations: List[str]


class CardBenefitResponse(BaseModel):
    """Credit card benefit for a deal."""
    card_name: str
    cashback_pct: float
    cashback_amount: float
    vendor_discount_pct: float = 0.0
    vendor_discount_amount: float = 0.0
    effective_price: float
    total_savings: float
    explanation: str


class DealRankingResponse(BaseModel):
    """Ranked deal with explanation."""
    rank: int
    seller_id: str
    seller_name: str
    final_price: float
    effective_price: float
    total_cost: float
    effective_total: float
    savings_vs_asking: float
    card_recommendation: Optional[str] = None
    explanation: str
    is_winner: bool = False


class FailedSellerResponse(BaseModel):
    """Failed seller with reason."""
    seller_id: str
    seller_name: str
    status: str
    reason: str
    rounds_taken: int = 0


class DealExplanationResponse(BaseModel):
    """Complete deal explanation."""
    winner: Optional[DealRankingResponse] = None
    rankings: List[DealRankingResponse] = []
    failed_sellers: List[FailedSellerResponse] = []
    summary: str = ""
    credit_card_tip: str = ""


class SessionSummaryResponse(BaseModel):
    """Session summary response."""
    session_id: str
    buyer_name: str
    total_items_requested: int
    completed_purchases: int
    failed_purchases: int
    purchases: List[PurchaseSummary]
    failed_items: List[FailedItem]
    total_cost_summary: TotalCostSummary
    negotiation_metrics: NegotiationMetrics
    overall_analysis: Optional[OverallAnalysis] = None
    deal_explanation: Optional[DealExplanationResponse] = None

