'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useConfig } from '@/store/configStore';
import { useSession } from '@/store/sessionStore';
import { AddBuyerForm } from '@/features/episode-config/components/AddBuyerForm';
import { CreditCardForm } from '@/features/episode-config/components/CreditCardForm';
import { ProductCatalogGrid } from '@/components/ProductCatalogGrid';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { ItemCard } from '@/features/negotiation-room/components/ItemCard';
import { initializeSession } from '@/lib/api/simulation';
import { startNegotiation } from '@/lib/api/negotiation';
import { validateEpisodeConfig } from '@/utils/validators';
import { ROUTES } from '@/lib/router';
import type { CreditCardConfig, Product, ShoppingItem } from '@/lib/types';
import { APIError } from '@/lib/api/client';

export default function BuyerPage() {
  const router = useRouter();
  const { buyers, sellers, llmConfig, creditCards, setCreditCards, addBuyer, updateBuyer, removeBuyer } = useConfig();
  const { sessionId, negotiationRooms, initializeSession: setSession, updateNegotiationRoomStatus } = useSession();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [selectedBuyerIndex, setSelectedBuyerIndex] = useState(0);
  const [sellerMode, setSellerMode] = useState<'all' | 'custom'>('all');
  const [selectedSellerIndices, setSelectedSellerIndices] = useState<Set<number>>(new Set());
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingStartAll, setLoadingStartAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showCatalog, setShowCatalog] = useState(true);
  const [catalogProduct, setCatalogProduct] = useState<Product | null>(null);
  const [catalogQty, setCatalogQty] = useState(1);
  const [catalogMinPrice, setCatalogMinPrice] = useState(0);
  const [catalogMaxPrice, setCatalogMaxPrice] = useState(0);

  useEffect(() => setMounted(true), []);

  const initialBuyer = editingIndex !== null ? buyers[editingIndex] ?? null : null;
  const initialCard = editingCardIndex !== null ? creditCards[editingCardIndex] ?? null : null;
  const selectedBuyer = buyers[selectedBuyerIndex] ?? null;
  const selectedSellers = sellerMode === 'all'
    ? sellers
    : Array.from(selectedSellerIndices)
      .sort((a, b) => a - b)
      .map((i) => sellers[i])
      .filter(Boolean);

  const handleSaveCard = (card: CreditCardConfig) => {
    if (editingCardIndex !== null) {
      setCreditCards(creditCards.map((c, i) => (i === editingCardIndex ? card : c)));
      setEditingCardIndex(null);
    } else {
      setCreditCards([...creditCards, card]);
      setShowAddCard(false);
    }
  };

  const handleRemoveCard = (i: number) => {
    setCreditCards(creditCards.filter((_, j) => j !== i));
    if (editingCardIndex === i) setEditingCardIndex(null);
    else if (editingCardIndex !== null && editingCardIndex > i) setEditingCardIndex(editingCardIndex - 1);
  };

  const handleStartSession = async () => {
    if (!selectedBuyer || selectedSellers.length === 0) {
      setError('Please add a buyer and at least one seller before starting.');
      return;
    }

    const errors = validateEpisodeConfig(selectedBuyer, selectedSellers);
    if (errors.length > 0) {
      setError(`Configuration errors:\n${errors.map((e) => `- ${e.field}: ${e.message}`).join('\n')}`);
      return;
    }

    setLoadingSession(true);
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
      setLoadingSession(false);
    }
  };

  const handleStartAllNegotiations = async () => {
    if (!sessionId || negotiationRooms.length === 0) return;

    setLoadingStartAll(true);
    setError(null);

    try {
      const pendingRooms = negotiationRooms.filter((room) => room.status === 'pending');
      await Promise.all(
        pendingRooms.map(async (room) => {
          await startNegotiation(room.room_id);
          updateNegotiationRoomStatus(room.room_id, 'active');
        })
      );
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('Failed to start all negotiations. Please try again.');
    } finally {
      setLoadingStartAll(false);
    }
  };

  const toggleSeller = (index: number) => {
    setSelectedSellerIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSelectAllSellers = () => {
    if (selectedSellerIndices.size === sellers.length) {
      setSelectedSellerIndices(new Set());
    } else {
      setSelectedSellerIndices(new Set(sellers.map((_, i) => i)));
    }
  };

  const handleCatalogProductSelect = (product: Product) => {
    setCatalogProduct(product);
    setCatalogQty(1);
    setCatalogMinPrice(0);
    setCatalogMaxPrice(0);
  };

  const handleAddFromCatalog = () => {
    if (!catalogProduct || catalogMaxPrice <= catalogMinPrice || catalogQty < 1) return;
    const item: ShoppingItem = {
      item_id: catalogProduct.id,
      item_name: catalogProduct.name,
      variant: catalogProduct.variant || undefined,
      size_value: catalogProduct.size_value || undefined,
      size_unit: catalogProduct.size_unit || undefined,
      quantity_needed: catalogQty,
      min_price_per_unit: catalogMinPrice,
      max_price_per_unit: catalogMaxPrice,
    };
    // If a buyer exists, add item to their shopping list
    if (selectedBuyer) {
      const updated = { ...selectedBuyer, shopping_list: [...selectedBuyer.shopping_list, item] };
      updateBuyer(selectedBuyerIndex, updated);
    }
    setCatalogProduct(null);
  };

  // Agent readiness indicator
  const isAgentReady = selectedBuyer && selectedBuyer.shopping_list.length > 0 && llmConfig.model;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading..." />
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
          <h1 className="text-3xl font-bold text-neutral-900">Buyer – Your agents</h1>
          <p className="text-neutral-600 mt-2">
            Add and edit buyer agents (name and purchase plan). Add your credit cards so we can show you the best card for each deal.
          </p>
        </div>

        <div className="space-y-6">
          {/* Agent Readiness Indicator */}
          <div className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
            isAgentReady
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}>
            <span className={`h-2.5 w-2.5 rounded-full ${isAgentReady ? 'bg-green-500' : 'bg-amber-500'}`} />
            {isAgentReady ? 'Agent Ready' : 'Setup Required'}
            {!selectedBuyer && <span className="ml-2 text-xs">— Add a buyer agent below</span>}
            {selectedBuyer && selectedBuyer.shopping_list.length === 0 && <span className="ml-2 text-xs">— Add items to shopping list</span>}
          </div>

          {error && (
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          )}

          {/* Product Catalog Quick-Add */}
          <section className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Product Catalog</h2>
                <p className="text-sm text-neutral-600">Browse and add products to your shopping list</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setShowCatalog(!showCatalog)}>
                {showCatalog ? 'Hide Catalog' : 'Browse Catalog'}
              </Button>
            </div>

            {showCatalog && (
              <div className="mt-4">
                <ProductCatalogGrid onSelectProduct={handleCatalogProductSelect} selectable={!!selectedBuyer} />
              </div>
            )}

            {catalogProduct && (
              <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 p-4">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">
                  Add &quot;{catalogProduct.name}&quot; to shopping list
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Quantity</label>
                    <input type="number" min={1} value={catalogQty} onChange={(e) => setCatalogQty(Number(e.target.value))}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Min Price ($)</label>
                    <input type="number" min={0} step={0.01} value={catalogMinPrice} onChange={(e) => setCatalogMinPrice(Number(e.target.value))}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Max Price ($)</label>
                    <input type="number" min={0} step={0.01} value={catalogMaxPrice} onChange={(e) => setCatalogMaxPrice(Number(e.target.value))}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" onClick={handleAddFromCatalog}
                    disabled={catalogMaxPrice <= catalogMinPrice || catalogQty < 1 || !selectedBuyer}>
                    Add to Shopping List
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setCatalogProduct(null)}>
                    Cancel
                  </Button>
                  {!selectedBuyer && <span className="text-xs text-amber-600">Create a buyer first</span>}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Start negotiation</h2>
            <p className="text-sm text-neutral-600 mb-4">
              Choose a buyer and decide whether to use all sellers or a curated subset.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Buyer</label>
                <select
                  value={selectedBuyerIndex}
                  onChange={(e) => setSelectedBuyerIndex(Number(e.target.value))}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
                  disabled={buyers.length === 0}
                >
                  {buyers.length === 0 ? (
                    <option>No buyers yet</option>
                  ) : (
                    buyers.map((buyer, index) => (
                      <option key={buyer.name + index} value={index}>
                        {buyer.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Sellers</label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSellerMode('all')}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      sellerMode === 'all'
                        ? 'border-primary-200 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    All configured ({sellers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellerMode('custom')}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      sellerMode === 'custom'
                        ? 'border-primary-200 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    Select specific
                  </button>
                </div>
              </div>
              <div className="flex md:justify-end">
                {sessionId ? (
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button size="md" variant="secondary" onClick={() => router.push(ROUTES.NEGOTIATIONS)}>
                      View product options
                    </Button>
                    <Button size="md" onClick={handleStartAllNegotiations} loading={loadingStartAll}>
                      Start all negotiations
                    </Button>
                  </div>
                ) : (
                  <Button size="md" onClick={handleStartSession} loading={loadingSession}>
                    Start negotiations
                  </Button>
                )}
              </div>
            </div>

            {sellerMode === 'custom' && sellers.length > 0 && (
              <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={handleSelectAllSellers}
                    className="text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    {selectedSellerIndices.size === sellers.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sellers.map((seller, index) => (
                  <label key={seller.name + index} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={selectedSellerIndices.has(index)}
                      onChange={() => toggleSeller(index)}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-300"
                    />
                    <span>{seller.name}</span>
                  </label>
                ))}
                </div>
              </div>
            )}
          </section>

          {sessionId && negotiationRooms.length > 0 && (
            <section className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900 mb-3">Product-wise options</h2>
              <p className="text-sm text-neutral-600 mb-4">
                Each item below can be negotiated independently.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {negotiationRooms.map((room) => (
                  <ItemCard key={room.room_id} room={room} />
                ))}
              </div>
            </section>
          )}

          <AddBuyerForm
            initialBuyer={initialBuyer ?? undefined}
            onAdd={addBuyer}
            onSave={editingIndex !== null ? (buyer) => { updateBuyer(editingIndex, buyer); setEditingIndex(null); } : undefined}
            onCancel={editingIndex !== null ? () => setEditingIndex(null) : undefined}
          />

          {buyers.length > 0 && (
            <section className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900 mb-3">Your buyer agents</h2>
              <ul className="space-y-3">
                {buyers.map((b, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-2 py-2 border-b border-neutral-100 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <span className="font-medium text-neutral-900">{b.name}</span>
                      <span className="text-neutral-500 text-sm ml-2">
                        ({b.shopping_list.length} item{b.shopping_list.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingIndex(i)}
                        disabled={editingIndex !== null}
                      >
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => { removeBuyer(i); if (editingIndex === i) setEditingIndex(null); }}>
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* My credit cards – used for deal benefits and recommended card */}
          <section className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">My credit cards</h2>
            <p className="text-sm text-neutral-600 mb-4">
              Add the cards you have. When you run a negotiation, we use these to show your effective price and recommend the best card for each deal. You can add multiple cards.
            </p>
            {!showAddCard && editingCardIndex === null && (
              <Button variant="secondary" size="sm" onClick={() => setShowAddCard(true)} className="mb-4">
                + Add card
              </Button>
            )}
            {(showAddCard || editingCardIndex !== null) && (
              <div className="mb-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <CreditCardForm
                  initialCard={initialCard ?? undefined}
                  onSave={handleSaveCard}
                  onCancel={() => { setShowAddCard(false); setEditingCardIndex(null); }}
                />
              </div>
            )}
            {creditCards.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <h3 className="text-sm font-medium text-neutral-700 mb-2">Your cards</h3>
                <ul className="space-y-2">
                  {creditCards.map((c, i) => (
                    <li
                      key={i}
                      className="flex flex-col gap-2 py-2 border-b border-neutral-100 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <span className="font-medium text-neutral-900">{c.card_name}</span>
                        <span className="text-neutral-500 text-sm ml-2">({c.issuer})</span>
                        {c.rewards.length > 0 && (
                          <span className="text-neutral-500 text-xs ml-2">
                            {c.rewards.length} reward tier{c.rewards.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => { setEditingCardIndex(i); setShowAddCard(false); }}
                          disabled={editingCardIndex !== null || showAddCard}
                        >
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleRemoveCard(i)}>
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
