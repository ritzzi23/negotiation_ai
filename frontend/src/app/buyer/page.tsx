'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useConfig } from '@/store/configStore';
import { AddBuyerForm } from '@/features/episode-config/components/AddBuyerForm';
import { CreditCardForm } from '@/features/episode-config/components/CreditCardForm';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/lib/router';
import type { CreditCardConfig } from '@/lib/types';

export default function BuyerPage() {
  const { buyers, creditCards, setCreditCards, addBuyer, updateBuyer, removeBuyer } = useConfig();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const initialBuyer = editingIndex !== null ? buyers[editingIndex] ?? null : null;
  const initialCard = editingCardIndex !== null ? creditCards[editingCardIndex] ?? null : null;

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
                    className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0"
                  >
                    <div>
                      <span className="font-medium text-neutral-900">{b.name}</span>
                      <span className="text-neutral-500 text-sm ml-2">
                        ({b.shopping_list.length} item{b.shopping_list.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
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
                      className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0"
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
                      <div className="flex gap-2">
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
