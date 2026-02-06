"""
RAG service: ingest documents, embed, and retrieve by similarity.

WHAT: Vector store for credit card info (and other uploads); chunk text, embed, upsert/delete/clear.
WHY: Support RAG retrieval for per-seller context (section 3–4 of plan).
HOW: sentence-transformers for embeddings; persist meta.json + vectors.npy in RAG_DATA_DIR.
"""

import json
import os
from pathlib import Path
from typing import List, Optional, Dict, Any

from ..core.config import settings
from ..utils.logger import get_logger

logger = get_logger(__name__)

# Lazy-loaded model
_embedding_model = None


def _get_model():
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedding_model = SentenceTransformer(settings.RAG_EMBEDDING_MODEL)
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    return _embedding_model


def _get_rag_dir() -> Path:
    d = Path(settings.RAG_DATA_DIR)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    """Split text into overlapping chunks."""
    if not text or len(text) <= chunk_size:
        return [text] if text else []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
        if start >= len(text):
            break
    return chunks


def _load_index() -> tuple:
    """Load meta and vectors from disk. Returns (meta_list, vectors_2d or None)."""
    d = _get_rag_dir()
    meta_path = d / "meta.json"
    vectors_path = d / "vectors.npy"
    meta = []
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
    vectors = None
    if vectors_path.exists():
        import numpy as np
        vectors = np.load(vectors_path)
    return meta, vectors


def _save_index(meta: List[Dict], vectors: Optional[Any]) -> None:
    """Persist meta and vectors to disk."""
    d = _get_rag_dir()
    with open(d / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=0)
    if vectors is not None:
        import numpy as np
        np.save(d / "vectors.npy", vectors)


def ingest_documents(documents: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Ingest documents: chunk text, embed, upsert by id.
    Each document: {"id": str, "text": str, "metadata": dict (optional)}.
    If id exists, existing chunks for that id are removed then new ones added.
    Returns {"indexed_documents": N, "indexed_chunks": M}.
    """
    import numpy as np
    meta, vectors = _load_index()
    ids_to_replace = {d.get("id", "") for d in documents}
    # Keep only chunks whose doc_id is not being replaced
    keep_indices = [i for i, m in enumerate(meta) if m["doc_id"] not in ids_to_replace]
    meta = [meta[i] for i in keep_indices]
    vectors = vectors[keep_indices] if vectors is not None and len(vectors) > 0 else None
    vectors_list = list(vectors) if vectors is not None else []
    start_len = len(meta)
    model = _get_model()
    chunk_size = getattr(settings, "RAG_CHUNK_SIZE", 500)
    overlap = getattr(settings, "RAG_CHUNK_OVERLAP", 50)
    for doc in documents:
        doc_id = doc.get("id", "")
        text = doc.get("text", "")
        metadata = doc.get("metadata") or {}
        if not text:
            continue
        chunks = _chunk_text(text, chunk_size, overlap)
        if not chunks:
            continue
        embeddings = model.encode(chunks)
        for i, (chunk_text, emb) in enumerate(zip(chunks, embeddings)):
            meta.append({
                "doc_id": doc_id,
                "chunk_idx": i,
                "text": chunk_text,
                "metadata": metadata,
            })
            vectors_list.append(emb)
    if not vectors_list:
        _save_index(meta, None)
        return {"indexed_documents": len(documents), "indexed_chunks": len(meta) - start_len}
    new_vectors = np.array(vectors_list, dtype="float32")
    _save_index(meta, new_vectors)
    return {"indexed_documents": len(documents), "indexed_chunks": len(meta) - start_len}


def retrieve(query: str, top_k: int = 5, metadata_filter: Optional[Dict] = None) -> List[Dict]:
    """
    Retrieve top_k chunks most similar to query.
    Returns list of {"doc_id", "text", "metadata", "score"}.
    """
    import numpy as np
    meta, vectors = _load_index()
    if not meta or vectors is None or len(vectors) == 0:
        return []
    model = _get_model()
    q_emb = model.encode([query])
    scores = np.dot(vectors, q_emb.T).flatten()
    indices = np.argsort(-scores)[: top_k]
    results = []
    for idx in indices:
        m = meta[idx]
        if metadata_filter:
            md = m.get("metadata", {})
            if not all(md.get(k) == v for k, v in metadata_filter.items()):
                continue
        results.append({
            "doc_id": m["doc_id"],
            "text": m["text"],
            "metadata": m.get("metadata", {}),
            "score": float(scores[idx]),
        })
    return results


def delete_by_id(doc_id: str) -> bool:
    """Remove all chunks for the given document id. Returns True if any were removed."""
    import numpy as np
    meta, vectors = _load_index()
    if not meta:
        return False
    keep = [m for m in meta if m["doc_id"] != doc_id]
    if len(keep) == len(meta):
        return False
    if not keep:
        _save_index([], None)
        return True
    # Rebuild vectors for kept chunks (we need to re-embed or keep indices)
    # We stored meta and vectors in parallel order, so we need indices to keep
    keep_indices = [i for i, m in enumerate(meta) if m["doc_id"] != doc_id]
    new_vectors = vectors[keep_indices]
    _save_index(keep, new_vectors)
    return True


def clear_all() -> int:
    """Remove all chunks. Returns number of chunks removed."""
    meta, _ = _load_index()
    n = len(meta)
    _save_index([], None)
    return n


def list_document_ids() -> List[str]:
    """Return unique document ids in the index."""
    meta, _ = _load_index()
    return list({m["doc_id"] for m in meta})
