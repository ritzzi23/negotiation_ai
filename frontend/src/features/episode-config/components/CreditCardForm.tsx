'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/Input';
import { NumberInput } from '@/components/NumberInput';
import { Button } from '@/components/Button';
import type { CreditCardConfig, CreditCardReward, CreditCardVendorOffer } from '@/lib/types';
import { generateId } from '@/utils/helpers';

const REWARD_CATEGORIES = ['electronics', 'dining', 'travel', 'groceries', 'general', 'online_shopping', 'home', 'fashion', 'books'] as const;

const emptyCard = (): CreditCardConfig => ({
  card_id: '',
  card_name: '',
  issuer: '',
  rewards: [],
  vendor_offers: [],
  annual_fee: 0,
});

function cloneCard(c: CreditCardConfig): CreditCardConfig {
  return {
    card_id: c.card_id,
    card_name: c.card_name,
    issuer: c.issuer,
    rewards: c.rewards.map((r) => ({ category: r.category, cashback_pct: r.cashback_pct })),
    vendor_offers: c.vendor_offers.map((v) => ({
      vendor_keyword: v.vendor_keyword,
      discount_pct: v.discount_pct,
      max_discount: v.max_discount,
    })),
    annual_fee: c.annual_fee,
  };
}

export interface CreditCardFormProps {
  initialCard?: CreditCardConfig | null;
  onSave: (card: CreditCardConfig) => void;
  onCancel?: () => void;
}

export function CreditCardForm({ initialCard, onSave, onCancel }: CreditCardFormProps) {
  const isEditing = initialCard != null;
  const [card, setCard] = useState<CreditCardConfig>(() =>
    initialCard ? cloneCard(initialCard) : emptyCard()
  );

  useEffect(() => {
    if (initialCard) setCard(cloneCard(initialCard));
    else setCard(emptyCard());
  }, [initialCard]);

  const update = (patch: Partial<CreditCardConfig>) => setCard((c) => ({ ...c, ...patch }));

  const addReward = () => {
    setCard((c) => ({
      ...c,
      rewards: [...c.rewards, { category: 'general', cashback_pct: 1 }],
    }));
  };
  const updateReward = (i: number, r: CreditCardReward) => {
    setCard((c) => ({
      ...c,
      rewards: c.rewards.map((x, j) => (j === i ? r : x)),
    }));
  };
  const removeReward = (i: number) => {
    setCard((c) => ({ ...c, rewards: c.rewards.filter((_, j) => j !== i) }));
  };

  const addVendorOffer = () => {
    setCard((c) => ({
      ...c,
      vendor_offers: [...c.vendor_offers, { vendor_keyword: '', discount_pct: 5, max_discount: 0 }],
    }));
  };
  const updateVendorOffer = (i: number, v: CreditCardVendorOffer) => {
    setCard((c) => ({
      ...c,
      vendor_offers: c.vendor_offers.map((x, j) => (j === i ? v : x)),
    }));
  };
  const removeVendorOffer = (i: number) => {
    setCard((c) => ({ ...c, vendor_offers: c.vendor_offers.filter((_, j) => j !== i) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cardId = card.card_id?.trim() || `card_${generateId()}`;
    const name = card.card_name?.trim();
    const issuer = card.issuer?.trim();
    if (!name || !issuer) return;
    onSave({
      ...card,
      card_id: cardId,
      card_name: name,
      issuer,
      annual_fee: Number(card.annual_fee) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Card name"
        value={card.card_name}
        onChange={(e) => update({ card_name: e.target.value })}
        placeholder="e.g. Chase Sapphire Preferred"
        required
      />
      <Input
        label="Issuer"
        value={card.issuer}
        onChange={(e) => update({ issuer: e.target.value })}
        placeholder="e.g. Chase, Amex, Citi"
        required
      />
      <Input
        label="Card ID (optional)"
        value={card.card_id}
        onChange={(e) => update({ card_id: e.target.value })}
        placeholder="e.g. chase_sapphire — leave blank to auto-generate"
      />
      <NumberInput
        label="Annual fee ($)"
        value={card.annual_fee}
        onChange={(e) => update({ annual_fee: Number(e.target.value) || 0 })}
        min={0}
        step={1}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-neutral-700">Rewards (category + cashback %)</label>
          <Button type="button" variant="ghost" size="sm" onClick={addReward}>
            + Add reward
          </Button>
        </div>
        <div className="space-y-2">
          {card.rewards.map((r, i) => (
            <div key={i} className="flex gap-2 items-center flex-wrap">
              <select
                value={r.category}
                onChange={(e) => updateReward(i, { ...r, category: e.target.value })}
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm w-40"
              >
                {REWARD_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <NumberInput
                value={r.cashback_pct}
                onChange={(e) => updateReward(i, { ...r, cashback_pct: Number(e.target.value) || 0 })}
                min={0}
                max={30}
                step={0.5}
                placeholder="%"
              />
              <span className="text-sm text-neutral-500">%</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeReward(i)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-neutral-700">Vendor offers (optional)</label>
          <Button type="button" variant="ghost" size="sm" onClick={addVendorOffer}>
            + Add offer
          </Button>
        </div>
        <div className="space-y-2">
          {card.vendor_offers.map((v, i) => (
            <div key={i} className="flex gap-2 items-center flex-wrap">
              <Input
                value={v.vendor_keyword}
                onChange={(e) => updateVendorOffer(i, { ...v, vendor_keyword: e.target.value })}
                placeholder="Vendor name (e.g. TechStore)"
                className="w-36"
              />
              <NumberInput
                value={v.discount_pct}
                onChange={(e) => updateVendorOffer(i, { ...v, discount_pct: Number(e.target.value) || 0 })}
                min={0}
                max={50}
                step={1}
                placeholder="%"
              />
              <span className="text-sm">% off, max $</span>
              <NumberInput
                value={v.max_discount}
                onChange={(e) => updateVendorOffer(i, { ...v, max_discount: Number(e.target.value) || 0 })}
                min={0}
                step={5}
                placeholder="0 = no cap"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeVendorOffer(i)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit">
          {isEditing ? 'Save card' : 'Add card'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
