'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import {
  listRAGDocuments,
  uploadRAGDocuments,
  deleteRAGDocument,
  clearAllRAGDocuments,
  type RAGDocumentItem,
} from '@/lib/api/creditCardInfo';
import { ROUTES } from '@/lib/router';

export default function CreditCardInfoPage() {
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addCardId, setAddCardId] = useState('');
  const [addCardName, setAddCardName] = useState('');
  const [addCardText, setAddCardText] = useState('');
  const [addingCard, setAddingCard] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listRAGDocuments();
      setDocumentIds(res.document_ids || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as RAGDocumentItem[];
      if (!Array.isArray(parsed)) {
        throw new Error('JSON must be an array of { id, text, metadata }');
      }
      const documents = parsed.map((d) => ({
        id: String(d.id),
        text: String(d.text),
        metadata: d.metadata && typeof d.metadata === 'object' ? d.metadata : {},
      }));
      await uploadRAGDocuments(documents);
      await fetchList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    setError(null);
    try {
      await deleteRAGDocument(docId);
      await fetchList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!clearConfirm) return;
    setUploading(true);
    setError(null);
    try {
      await clearAllRAGDocuments();
      setDocumentIds([]);
      setClearConfirm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Clear failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAddCardDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = addCardId.trim() || `card_${Date.now()}`;
    const text = addCardText.trim();
    if (!text) {
      setError('Description text is required.');
      return;
    }
    setAddingCard(true);
    setError(null);
    try {
      await uploadRAGDocuments([
        {
          id,
          text,
          metadata: { category: 'credit_cards', card_id: id, card_name: addCardName.trim() || id },
        },
      ]);
      setAddCardId('');
      setAddCardName('');
      setAddCardText('');
      await fetchList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add card document');
    } finally {
      setAddingCard(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container-custom py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={ROUTES.ADMIN}
              className="inline-flex items-center text-sm text-neutral-600 hover:text-neutral-900"
            >
              ← Back to Admin
            </Link>
            <h1 className="text-2xl font-bold text-neutral-900">Credit Card Database (RAG)</h1>
          </div>
        </div>

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} className="mb-6" />
        )}

        {/* Add one card document (for RAG) – supports multiple cards by adding multiple docs */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="mb-2 text-lg font-semibold text-neutral-800">Add card document</h2>
          <p className="mb-4 text-sm text-neutral-600">
            Add benefit/description text for one credit card. Each card can have one or more documents (add multiple for different benefit sections). Used by RAG to retrieve relevant card info during negotiations.
          </p>
          <form onSubmit={handleAddCardDocument} className="space-y-3 max-w-2xl">
            <Input
              label="Card ID"
              value={addCardId}
              onChange={(e) => setAddCardId(e.target.value)}
              placeholder="e.g. chase_sapphire (unique; leave blank to auto-generate)"
            />
            <Input
              label="Card name"
              value={addCardName}
              onChange={(e) => setAddCardName(e.target.value)}
              placeholder="e.g. Chase Sapphire Preferred"
            />
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Description / benefit text</label>
              <textarea
                value={addCardText}
                onChange={(e) => setAddCardText(e.target.value)}
                placeholder="e.g. 5% cashback on electronics, 3% on dining. Vendor offer: TechStore 10% off up to $50."
                rows={4}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                required
              />
            </div>
            <Button type="submit" disabled={addingCard || !addCardText.trim()}>
              {addingCard ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {addingCard ? 'Adding…' : 'Add card document'}
            </Button>
          </form>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-neutral-800">Upload JSON (bulk)</h2>
          <p className="mb-2 text-sm text-neutral-600">
            Upload a JSON file with an array of documents. Each item: <code className="rounded bg-neutral-100 px-1">id</code>, <code className="rounded bg-neutral-100 px-1">text</code>, <code className="rounded bg-neutral-100 px-1">metadata</code> (optional).
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {uploading ? 'Indexing…' : 'Choose JSON file'}
            </Button>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-800">Uploaded documents</h2>
            <div className="flex items-center gap-2">
              {clearConfirm ? (
                <>
                  <span className="text-sm text-danger-600">Clear all?</span>
                  <Button variant="ghost" size="sm" onClick={() => setClearConfirm(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={uploading}
                  >
                    Yes, clear all
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setClearConfirm(true)}
                  disabled={documentIds.length === 0}
                >
                  Clear all RAG data
                </Button>
              )}
            </div>
          </div>
          {loading ? (
            <LoadingSpinner label="Loading…" />
          ) : documentIds.length === 0 ? (
            <p className="text-sm text-neutral-500">No documents in the index. Upload a JSON file above.</p>
          ) : (
            <ul className="space-y-2">
              {documentIds.map((id) => (
                <li
                  key={id}
                  className="flex items-center justify-between rounded border border-neutral-100 bg-neutral-50 px-4 py-2"
                >
                  <span className="font-mono text-sm text-neutral-800">{id}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(id)}
                    disabled={deletingId === id}
                  >
                    {deletingId === id ? <LoadingSpinner size="sm" /> : 'Delete'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
