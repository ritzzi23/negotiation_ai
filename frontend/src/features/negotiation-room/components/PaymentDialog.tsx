'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import type { CreditCardConfig } from '@/lib/types';
import { formatCurrency } from '@/utils/formatters';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cardId: string) => void;
  totalAmount: number;
  effectiveAmount?: number;
  creditCards: CreditCardConfig[];
  recommendedCardId?: string;
}

export function PaymentDialog({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
  effectiveAmount,
  creditCards,
  recommendedCardId,
}: PaymentDialogProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>(
    recommendedCardId || creditCards[0]?.card_id || ''
  );
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => {
      onConfirm(selectedCardId);
    }, 1500);
  };

  if (confirmed) {
    return (
      <Modal isOpen={isOpen} onClose={() => {}} size="sm" showCloseButton={false}>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">Payment Confirmed!</h3>
          <p className="text-sm text-neutral-600">Processing your order...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="py-4">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Complete Payment</h2>
        <p className="text-sm text-neutral-600 mb-6">Select a card to pay</p>

        <div className="bg-neutral-50 rounded-lg p-4 mb-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-600">Total Amount</span>
            <span className="text-xl font-bold text-neutral-900">{formatCurrency(totalAmount)}</span>
          </div>
          {effectiveAmount != null && effectiveAmount < totalAmount && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">After Card Rewards</span>
              <span className="text-lg font-bold text-secondary-600">{formatCurrency(effectiveAmount)}</span>
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {creditCards.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">No cards configured. Add cards in Settings.</p>
          ) : (
            creditCards.map((card) => (
              <label
                key={card.card_id}
                className={`flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                  selectedCardId === card.card_id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment-card"
                  value={card.card_id}
                  checked={selectedCardId === card.card_id}
                  onChange={() => setSelectedCardId(card.card_id)}
                  className="sr-only"
                />
                <div className="w-10 h-7 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded flex items-center justify-center text-white text-[8px] font-bold">
                  {card.issuer.slice(0, 4).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">{card.card_name}</p>
                  <p className="text-xs text-neutral-500">{card.issuer} **** {card.card_id.slice(-4)}</p>
                </div>
                {card.card_id === recommendedCardId && (
                  <span className="text-xs font-medium text-secondary-600 bg-secondary-100 px-2 py-0.5 rounded-full">
                    Best for this
                  </span>
                )}
              </label>
            ))
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button className="flex-1" onClick={handleConfirm} disabled={!selectedCardId}>
            Pay {formatCurrency(effectiveAmount ?? totalAmount)}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
