"""
Product catalog endpoints.

WHAT: CRUD and search for product catalog
WHY: Provide autocomplete and catalog management
HOW: FastAPI endpoints using SQLAlchemy session
"""

from fastapi import APIRouter, status
from typing import Optional
import uuid

from sqlalchemy import func

from ....core.database import get_db
from ....core.models import Product
from ....models.api_schemas import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
)
from ....utils.exceptions import ValidationError, ProductNotFoundError
from ....utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


def to_product_response(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        name=product.name,
        sku=product.sku,
        variant=product.variant,
        size_value=product.size_value,
        size_unit=product.size_unit,
        category=product.category,
        description=product.description,
        image_url=product.image_url,
        created_at=product.created_at,
    )


@router.get("/products", response_model=ProductListResponse)
async def list_products(
    query: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> ProductListResponse:
    """
    List products with optional name search.
    """
    safe_limit = max(1, min(limit, 100))
    safe_offset = max(0, offset)
    search = (query or "").strip()

    with get_db() as db:
        base_query = db.query(Product)
        if search:
            base_query = base_query.filter(Product.name.ilike(f"%{search}%"))

        total = base_query.count()
        products = (
            base_query.order_by(func.lower(Product.name).asc())
            .offset(safe_offset)
            .limit(safe_limit)
            .all()
        )

        return ProductListResponse(
            items=[to_product_response(product) for product in products],
            total=total,
        )


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str) -> ProductResponse:
    """
    Fetch a single product by id.
    """
    with get_db() as db:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ProductNotFoundError(
                message=f"Product {product_id} not found",
                code="PRODUCT_NOT_FOUND",
            )
        return to_product_response(product)


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(request: ProductCreate) -> ProductResponse:
    """
    Create a new product in the catalog.
    """
    with get_db() as db:
        product_id = request.id or str(uuid.uuid4())

        existing = db.query(Product).filter(Product.id == product_id).first()
        if existing:
            raise ValidationError(
                message="Product with this id already exists",
                code="PRODUCT_EXISTS",
                details={"field": "id", "value": product_id},
            )

        product = Product(
            id=product_id,
            name=request.name,
            sku=request.sku,
            variant=request.variant,
            size_value=request.size_value,
            size_unit=request.size_unit,
            category=request.category,
            description=request.description,
        )
        db.add(product)
        db.flush()

        logger.info(f"Created product {product_id}")
        return to_product_response(product)


@router.patch("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, request: ProductUpdate) -> ProductResponse:
    """
    Update product fields.
    """
    if request.model_dump(exclude_unset=True) == {}:
        raise ValidationError(
            message="No fields provided for update",
            code="VALIDATION_ERROR",
            details={"field": "product"},
        )

    with get_db() as db:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ProductNotFoundError(
                message=f"Product {product_id} not found",
                code="PRODUCT_NOT_FOUND",
            )

        update_data = request.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)

        db.flush()
        return to_product_response(product)


@router.delete("/products/{product_id}")
async def delete_product(product_id: str) -> dict:
    """
    Delete a product from the catalog.
    """
    with get_db() as db:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ProductNotFoundError(
                message=f"Product {product_id} not found",
                code="PRODUCT_NOT_FOUND",
            )

        db.delete(product)
        db.flush()

        return {"deleted": True, "product_id": product_id}
