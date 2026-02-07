'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useConfig } from '@/store/configStore';
import { AddSellerForm } from '@/features/episode-config/components/AddSellerForm';
import { Button } from '@/components/Button';
import { ROUTES } from '@/lib/router';

export default function SellerPage() {
  const { sellers, addSeller, updateSeller, removeSeller } = useConfig();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const initialSeller = editingIndex !== null ? sellers[editingIndex] ?? null : null;

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
          <h1 className="text-3xl font-bold text-neutral-900">Seller – Your bots</h1>
          <p className="text-neutral-600 mt-2">
            Add and edit seller bots (name, profile, inventory). Use Admin to run a session with these sellers.
          </p>
        </div>

        <div className="space-y-6">
          <AddSellerForm
            initialSeller={initialSeller ?? undefined}
            onAdd={addSeller}
            onSave={editingIndex !== null ? (seller) => { updateSeller(editingIndex, seller); setEditingIndex(null); } : undefined}
            onCancel={editingIndex !== null ? () => setEditingIndex(null) : undefined}
          />

          {sellers.length > 0 && (
            <section className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900 mb-3">Your seller bots</h2>
              <ul className="space-y-3">
                {sellers.map((s, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-2 py-2 border-b border-neutral-100 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <span className="font-medium text-neutral-900">{s.name}</span>
                      <span className="text-neutral-500 text-sm ml-2">
                        ({s.inventory.length} item{s.inventory.length !== 1 ? 's' : ''})
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
                      <Button variant="danger" size="sm" onClick={() => { removeSeller(i); if (editingIndex === i) setEditingIndex(null); }}>
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
