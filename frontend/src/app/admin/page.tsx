'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useConfig } from '@/store/configStore';
import { useSession } from '@/store/sessionStore';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AddBuyerForm } from '@/features/episode-config/components/AddBuyerForm';
import { AddSellerForm } from '@/features/episode-config/components/AddSellerForm';
import { LLMConfigForm } from '@/features/episode-config/components/LLMConfigForm';
import { initializeSession, patchSessionCreditCards } from '@/lib/api/simulation';
import { validateEpisodeConfig } from '@/utils/validators';
import { ROUTES } from '@/lib/router';
import { APIError } from '@/lib/api/client';
import { MAX_SELLERS } from '@/lib/constants';

export default function AdminPage() {
  const router = useRouter();
  const {
    buyers,
    sellers,
    llmConfig,
    creditCards,
    addBuyer,
    updateBuyer,
    removeBuyer,
    addSeller,
    updateSeller,
    removeSeller,
    clearAllData,
    exportToJson,
    importFromJson,
    loadSampleData,
  } = useConfig();
  const { sessionId, initializeSession: setSession } = useSession();

  const [selectedBuyerIndex, setSelectedBuyerIndex] = useState<number>(0);
  const [selectedSellerIndices, setSelectedSellerIndices] = useState<Set<number>>(new Set());
  const [editingBuyerIndex, setEditingBuyerIndex] = useState<number | null>(null);
  const [editingSellerIndex, setEditingSellerIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [patchingCards, setPatchingCards] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const selectedBuyer = buyers[selectedBuyerIndex] ?? null;
  const selectedSellers = Array.from(selectedSellerIndices)
    .sort((a, b) => a - b)
    .map((i) => sellers[i])
    .filter(Boolean);

  const handleInitialize = async () => {
    if (!selectedBuyer || selectedSellers.length === 0) {
      setError('Please select one buyer and at least one seller.');
      return;
    }

    const errors = validateEpisodeConfig(selectedBuyer, selectedSellers);
    if (errors.length > 0) {
      setError(`Configuration errors:\n${errors.map((e) => `- ${e.field}: ${e.message}`).join('\n')}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await initializeSession({
        buyer: selectedBuyer,
        sellers: selectedSellers,
        llm_config: llmConfig,
        credit_cards: creditCards,
      });

      if (response.total_rooms === 0) {
        const skippedList = response.skipped_items?.join(', ') || 'all items';
        setError(
          `No negotiation rooms created. Unmatched items: ${skippedList}. Ensure sellers have matching inventory for the buyer's shopping list.`
        );
        return;
      }

      setSession(response);
      router.push(ROUTES.NEGOTIATIONS);
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('Failed to initialize session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = () => {
    if (typeof window !== 'undefined' && window.confirm('Clear all buyers, sellers, and config? This cannot be undone.')) {
      clearAllData();
      setSelectedBuyerIndex(0);
      setSelectedSellerIndices(new Set());
      setEditingBuyerIndex(null);
      setEditingSellerIndex(null);
      setError(null);
    }
  };

  const handleRemoveBuyer = (i: number) => {
    removeBuyer(i);
    if (editingBuyerIndex === i) setEditingBuyerIndex(null);
    else if (editingBuyerIndex !== null && editingBuyerIndex > i) setEditingBuyerIndex(editingBuyerIndex - 1);
    if (selectedBuyerIndex === i) setSelectedBuyerIndex(Math.max(0, i - 1));
    else if (selectedBuyerIndex > i) setSelectedBuyerIndex(selectedBuyerIndex - 1);
  };

  const handleRemoveSeller = (i: number) => {
    removeSeller(i);
    setSelectedSellerIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx === i) return;
        next.add(idx > i ? idx - 1 : idx);
      });
      return next;
    });
    if (editingSellerIndex === i) setEditingSellerIndex(null);
    else if (editingSellerIndex !== null && editingSellerIndex > i) setEditingSellerIndex(editingSellerIndex - 1);
  };

  const handleExport = () => {
    exportToJson();
    setError(null);
  };

  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        importFromJson(text);
        setSelectedBuyerIndex(0);
        setSelectedSellerIndices(new Set());
        setError(null);
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Invalid JSON or config format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toggleSeller = (index: number) => {
    setSelectedSellerIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else if (next.size < MAX_SELLERS) next.add(index);
      return next;
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="container-custom py-8 flex items-center justify-center min-h-[40vh]">
          <LoadingSpinner size="lg" label="Loading..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container-custom py-8">
        <div className="mb-8">
          <Link
            href={ROUTES.HOME}
            className="inline-flex items-center text-sm text-neutral-600 hover:text-neutral-900 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900">Admin – Run Session</h1>
          <p className="text-neutral-600 mt-2">
            Select a buyer and sellers, then initialize the episode. Manage data with clear, export, and import.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-danger-50 border border-danger-200 rounded-lg p-4 flex items-start justify-between">
            <div className="text-sm text-danger-700 whitespace-pre-line">{error}</div>
            <button onClick={() => setError(null)} className="text-danger-500 hover:text-danger-700">Dismiss</button>
          </div>
        )}

        {importError && (
          <div className="mb-6 bg-danger-50 border border-danger-200 rounded-lg p-4 flex items-start justify-between">
            <div className="text-sm text-danger-700">{importError}</div>
            <button onClick={() => setImportError(null)} className="text-danger-500 hover:text-danger-700">Dismiss</button>
          </div>
        )}

        {/* Credit card database (RAG) – prominent entry */}
        <Link
          href={ROUTES.ADMIN_CREDIT_CARD_INFO}
          className="block mb-6 p-5 rounded-xl border-2 border-primary-200 bg-primary-50/50 hover:bg-primary-50 hover:border-primary-300 transition-colors"
        >
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-neutral-900">Credit card database (RAG)</h2>
              <p className="text-sm text-neutral-600 mt-0.5">
                Upload card benefit documents, add card data for retrieval, and manage the RAG index. Supports multiple cards and clear/delete by id.
              </p>
            </div>
            <span className="text-primary-600 font-medium shrink-0">Manage &gt;</span>
          </div>
        </Link>

        <div className="space-y-6">
          {/* Manage buyers */}
          <section className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Manage buyers</h2>
            <p className="text-sm text-neutral-600 mb-4">Create and edit buyer agents below. Use the dropdown under &quot;Run session&quot; to choose one for the episode.</p>
            <AddBuyerForm
              initialBuyer={editingBuyerIndex !== null ? buyers[editingBuyerIndex] ?? undefined : undefined}
              onAdd={addBuyer}
              onSave={editingBuyerIndex !== null ? (buyer) => { updateBuyer(editingBuyerIndex, buyer); setEditingBuyerIndex(null); } : undefined}
              onCancel={editingBuyerIndex !== null ? () => setEditingBuyerIndex(null) : undefined}
            />
            {buyers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <h3 className="text-sm font-medium text-neutral-700 mb-2">Existing buyers</h3>
                <ul className="space-y-2">
                  {buyers.map((b, i) => (
                    <li key={i} className="flex flex-col gap-2 py-1.5 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm">{b.name}</span>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditingBuyerIndex(i)} disabled={editingBuyerIndex !== null}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleRemoveBuyer(i)}>Remove</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Manage sellers */}
          <section className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Manage sellers</h2>
            <p className="text-sm text-neutral-600 mb-4">Create and edit seller bots below. Select which to use in the session under &quot;Run session&quot;.</p>
            <AddSellerForm
              initialSeller={editingSellerIndex !== null ? sellers[editingSellerIndex] ?? undefined : undefined}
              onAdd={addSeller}
              onSave={editingSellerIndex !== null ? (seller) => { updateSeller(editingSellerIndex, seller); setEditingSellerIndex(null); } : undefined}
              onCancel={editingSellerIndex !== null ? () => setEditingSellerIndex(null) : undefined}
            />
            {sellers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <h3 className="text-sm font-medium text-neutral-700 mb-2">Existing sellers</h3>
                <ul className="space-y-2">
                  {sellers.map((s, i) => (
                    <li key={i} className="flex flex-col gap-2 py-1.5 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm">{s.name}</span>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditingSellerIndex(i)} disabled={editingSellerIndex !== null}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleRemoveSeller(i)}>Remove</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Run session */}
          <section className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Run session</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Buyer for this session</label>
                {buyers.length === 0 ? (
                  <p className="text-neutral-500 text-sm">Add a buyer above first.</p>
                ) : (
                  <select
                    value={selectedBuyerIndex}
                    onChange={(e) => setSelectedBuyerIndex(Number(e.target.value))}
                    className="w-full max-w-md rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  >
                    {buyers.map((b, i) => (
                      <option key={i} value={i}>{b.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Sellers for this session (select 1–{MAX_SELLERS})
                </label>
                {sellers.length === 0 ? (
                  <p className="text-neutral-500 text-sm">Add sellers above first.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {sellers.map((s, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSellerIndices.has(i)}
                          onChange={() => toggleSeller(i)}
                          disabled={!selectedSellerIndices.has(i) && selectedSellerIndices.size >= MAX_SELLERS}
                          className="rounded border-neutral-300"
                        />
                        <span className="text-sm">{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Credit cards (buyer) – sent on Initialize; optional live update for existing session */}
          <section className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Credit cards (buyer)</h2>
            <p className="text-sm text-neutral-600 mb-2">
              {creditCards.length === 0
                ? 'No credit cards in config. They are sent when you initialize the episode.'
                : `${creditCards.length} card(s): ${creditCards.map((c) => c.card_name).join(', ')}.`}
            </p>
            {sessionId && creditCards.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  setPatchingCards(true);
                  setError(null);
                  try {
                    await patchSessionCreditCards(sessionId, creditCards);
                  } catch (e: unknown) {
                    setError(e instanceof Error ? e.message : 'Failed to update session cards');
                  } finally {
                    setPatchingCards(false);
                  }
                }}
                disabled={patchingCards}
              >
                {patchingCards ? 'Updating…' : 'Update session cards'}
              </Button>
            )}
          </section>

          <LLMConfigForm />
        </div>

        {/* Actions */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-neutral-200 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={handleInitialize} disabled={loading || !selectedBuyer || selectedSellers.length === 0} loading={loading}>
              {loading ? 'Initializing...' : 'Initialize Episode'}
            </Button>
            <Button variant="ghost" onClick={() => { loadSampleData(); setError(null); }} disabled={loading}>
              Use Sample Data
            </Button>
          </div>

          <div className="border-t border-neutral-200 pt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={handleExport} disabled={loading}>
              Download JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button variant="secondary" onClick={handleImportClick} disabled={loading}>
              Import JSON
            </Button>
            <Button variant="danger" onClick={handleClearData} disabled={loading}>
              Clear all data
            </Button>
          </div>

          {(!selectedBuyer || selectedSellers.length === 0) && (
            <p className="text-sm text-neutral-600">
              Select one buyer and at least one seller to initialize.
            </p>
          )}
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8">
              <LoadingSpinner size="lg" label="Initializing marketplace..." />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
