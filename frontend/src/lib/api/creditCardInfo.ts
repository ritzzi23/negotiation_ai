import { api } from './client';

export interface RAGDocumentItem {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface RAGUploadResponse {
  ok: boolean;
  indexed_documents: number;
  indexed_chunks: number;
}

export interface RAGListResponse {
  document_ids: string[];
}

export async function listRAGDocuments(): Promise<RAGListResponse> {
  return api.get<RAGListResponse>('/api/v1/credit-card-info');
}

export async function uploadRAGDocuments(documents: RAGDocumentItem[]): Promise<RAGUploadResponse> {
  return api.post<RAGUploadResponse>('/api/v1/credit-card-info/upload', { documents });
}

export async function deleteRAGDocument(docId: string): Promise<{ ok: boolean; message: string }> {
  return api.delete<{ ok: boolean; message: string }>(`/api/v1/credit-card-info/upload/${encodeURIComponent(docId)}`);
}

export async function clearAllRAGDocuments(): Promise<{ ok: boolean; cleared_chunks: number }> {
  return api.delete<{ ok: boolean; cleared_chunks: number }>('/api/v1/credit-card-info/upload');
}
