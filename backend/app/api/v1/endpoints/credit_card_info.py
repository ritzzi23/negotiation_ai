"""
Credit card info (RAG) management endpoints.

WHAT: List, upload, delete by id, and clear all RAG documents.
WHY: Section 7 of plan – manage RAG source data for credit card context.
HOW: GET list doc ids, POST JSON body to ingest, DELETE by id, DELETE to clear all.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from ....services.rag_service import (
    ingest_documents,
    retrieve,
    delete_by_id,
    clear_all,
    list_document_ids,
)
from ....utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


class RAGDocumentItem(BaseModel):
    """Single document for RAG ingest."""
    id: str = Field(..., min_length=1, description="Unique document id")
    text: str = Field(..., description="Content to index")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class RAGUploadRequest(BaseModel):
    """Request body for RAG upload."""
    documents: List[RAGDocumentItem] = Field(..., min_length=1)


@router.get("/credit-card-info")
async def list_rag_documents() -> Dict[str, List[str]]:
    """
    List all document ids in the RAG index.
    """
    ids = list_document_ids()
    return {"document_ids": ids}


@router.post("/credit-card-info/upload")
async def upload_rag_documents(body: RAGUploadRequest) -> Dict[str, Any]:
    """
    Ingest documents into the RAG index. Each item: id, text, metadata.
    Replaces existing documents with the same id.
    """
    try:
        docs = [{"id": d.id, "text": d.text, "metadata": d.metadata or {}} for d in body.documents]
        result = ingest_documents(docs)
        return {"ok": True, **result}
    except Exception as e:
        logger.exception("RAG upload failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/credit-card-info/upload/{doc_id:path}")
async def delete_rag_document(doc_id: str) -> Dict[str, str]:
    """
    Remove a single document from the RAG index by id.
    """
    if not doc_id:
        raise HTTPException(status_code=400, detail="doc_id required")
    removed = delete_by_id(doc_id)
    if not removed:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    return {"ok": True, "message": f"Deleted document {doc_id}"}


@router.delete("/credit-card-info/upload")
async def clear_all_rag_documents() -> Dict[str, Any]:
    """
    Remove all documents from the RAG index (clear all uploaded data).
    """
    n = clear_all()
    return {"ok": True, "cleared_chunks": n}


@router.get("/credit-card-info/retrieve")
async def retrieve_rag(query: str, top_k: int = 5) -> Dict[str, Any]:
    """
    Retrieve top_k chunks similar to query (for debugging or UI preview).
    """
    chunks = retrieve(query, top_k=top_k)
    return {"query": query, "chunks": chunks}
