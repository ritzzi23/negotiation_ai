'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ProductAutocompleteInput } from '@/components/ProductAutocompleteInput';
import { NumberInput } from '@/components/NumberInput';
import { RadioGroup } from '@/components/RadioGroup';
import { Button } from '@/components/Button';
import type { SellerConfig, InventoryItem } from '@/lib/types';
import { SellerPriority, SpeakingStyle, SellerStrategy, STRATEGY_LABELS, STRATEGY_DESCRIPTIONS } from '@/lib/constants';
import { generateId } from '@/utils/helpers';
import { validateSellerConfig } from '@/utils/validators';

const emptySeller = (): SellerConfig => ({
  name: '',
  inventory: [],
  profile: {
    priority: SellerPriority.CUSTOMER_RETENTION,
    speaking_style: SpeakingStyle.PROFESSIONAL,
    strategy: SellerStrategy.FIRM_PRICING,
  },
});

function cloneSeller(s: SellerConfig): SellerConfig {
  return {
    name: s.name,
    inventory: s.inventory.map((item) => ({ ...item })),
    profile: { ...s.profile },
  };
}

export interface AddSellerFormProps {
  initialSeller?: SellerConfig | null;
  onAdd: (seller: SellerConfig) => void;
  onSave?: (seller: SellerConfig) => void;
  onCancel?: () => void;
  error?: string | null;
  onClearError?: () => void;
}

export function AddSellerForm({ initialSeller, onAdd, onSave, onCancel, error, onClearError }: AddSellerFormProps) {
  const isEditing = initialSeller != null;
  const [seller, setSeller] = useState<SellerConfig>(() => (initialSeller ? cloneSeller(initialSeller) : emptySeller()));
  const [formError, setFormError] = useState<string | null>(null);
  const prevInitialRef = useRef<SellerConfig | null | undefined>(initialSeller);

  useEffect(() => {
    if (initialSeller !== prevInitialRef.current) {
      prevInitialRef.current = initialSeller;
      setSeller(initialSeller ? cloneSeller(initialSeller) : emptySeller());
    }
  }, [initialSeller]);

  const updateName = (name: string) => setSeller((s) => ({ ...s, name }));

  const updateProfile = (patch: Partial<SellerConfig['profile']>) => {
    setSeller((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  };

  const addInventoryItem = () => {
    const newItem: InventoryItem = {
      item_id: `item_${generateId()}`,
      item_name: '',
      variant: '',
      size_value: undefined,
      size_unit: '',
      cost_price: 0,
      selling_price: 100,
      least_price: 50,
      quantity_available: 10,
    };
    setSeller((s) => ({ ...s, inventory: [...s.inventory, newItem] }));
  };

  const updateInventoryItem = (index: number, item: InventoryItem) => {
    setSeller((s) => ({
      ...s,
      inventory: s.inventory.map((x, i) => (i === index ? item : x)),
    }));
  };

  const removeInventoryItem = (index: number) => {
    setSeller((s) => ({
      ...s,
      inventory: s.inventory.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    onClearError?.();
    setFormError(null);
    const errors = validateSellerConfig(seller, 0);
    if (errors.length > 0) {
      setFormError(errors.map((e) => e.message).join('. '));
      return;
    }
    if (isEditing && onSave) {
      onSave(seller);
    } else {
      onAdd(seller);
      setSeller(emptySeller());
    }
  };

  const handleCancel = () => {
    setFormError(null);
    onClearError?.();
    setSeller(initialSeller ? cloneSeller(initialSeller) : emptySeller());
    onCancel?.();
  };

  return (
    <Card
      header={
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              {isEditing ? 'Edit seller bot' : 'Add seller bot'}
            </h2>
            <p className="text-sm text-neutral-600">Name, profile, and inventory (multiple items)</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <Input
          label="Seller name"
          value={seller.name}
          onChange={(e) => updateName(e.target.value)}
          placeholder="e.g. TechStore"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup
            label="Priority"
            name="add-seller-priority"
            value={seller.profile.priority}
            onChange={(value) => updateProfile({ priority: value as SellerPriority })}
            options={[
              { value: SellerPriority.CUSTOMER_RETENTION, label: 'Customer Retention' },
              { value: SellerPriority.MAXIMIZE_PROFIT, label: 'Maximize Profit' },
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Speaking style</label>
            <select
              value={seller.profile.speaking_style}
              onChange={(e) => updateProfile({ speaking_style: e.target.value as SpeakingStyle })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value={SpeakingStyle.PROFESSIONAL}>Professional</option>
              <option value={SpeakingStyle.VERY_SWEET}>Very Sweet</option>
              <option value={SpeakingStyle.RUDE}>Rude</option>
              <option value={SpeakingStyle.CASUAL}>Casual</option>
              <option value={SpeakingStyle.ENTHUSIASTIC}>Enthusiastic</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Strategy</label>
            <select
              value={seller.profile.strategy}
              onChange={(e) => updateProfile({ strategy: e.target.value as SellerStrategy })}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              {Object.values(SellerStrategy).map((s) => (
                <option key={s} value={s}>{STRATEGY_LABELS[s]}</option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 mt-1">
              {STRATEGY_DESCRIPTIONS[seller.profile.strategy] || ''}
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setSeller((s) => ({ ...s, _showPrompt: !((s as any)._showPrompt) }))}
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-3"
          >
            <svg className={`w-4 h-4 transition-transform ${(seller as any)._showPrompt ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced: Custom Prompt
          </button>
          {(seller as any)._showPrompt && (
            <div className="mb-4">
              <textarea
                value={seller.custom_prompt || ''}
                onChange={(e) => setSeller((s) => ({ ...s, custom_prompt: e.target.value }))}
                placeholder="Add custom instructions for your seller bot (optional). This will be appended to the system prompt."
                maxLength={500}
                rows={3}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              <p className="text-xs text-neutral-400 mt-1">{(seller.custom_prompt || '').length}/500</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">Inventory</label>
          <div className="space-y-4">
            {seller.inventory.map((item, itemIndex) => (
              <div key={item.item_id} className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <ProductAutocompleteInput
                    label="Item"
                    value={item.item_name}
                    onValueChange={(value) => updateInventoryItem(itemIndex, { ...item, item_name: value })}
                    onSelectProduct={(product) =>
                      updateInventoryItem(itemIndex, {
                        ...item,
                        item_id: product.id,
                        item_name: product.name,
                        variant: product.variant || '',
                        size_value: product.size_value ?? undefined,
                        size_unit: product.size_unit || '',
                      })
                    }
                    placeholder="e.g. Laptop"
                    helpText="Start typing to search the catalog"
                  />
                  <NumberInput label="Cost" value={item.cost_price} onChange={(e) => updateInventoryItem(itemIndex, { ...item, cost_price: Number(e.target.value) })} min={0} step={0.01} />
                  <NumberInput label="Selling" value={item.selling_price} onChange={(e) => updateInventoryItem(itemIndex, { ...item, selling_price: Number(e.target.value) })} min={0} step={0.01} />
                  <NumberInput label="Least" value={item.least_price} onChange={(e) => updateInventoryItem(itemIndex, { ...item, least_price: Number(e.target.value) })} min={0} step={0.01} />
                  <NumberInput label="Stock" value={item.quantity_available} onChange={(e) => updateInventoryItem(itemIndex, { ...item, quantity_available: Number(e.target.value) })} min={0} />
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Variant"
                    value={item.variant || ''}
                    onChange={(e) => updateInventoryItem(itemIndex, { ...item, variant: e.target.value })}
                    placeholder="e.g. Bottle"
                  />
                  <NumberInput
                    label="Size value"
                    value={item.size_value ?? ''}
                    onChange={(e) =>
                      updateInventoryItem(itemIndex, {
                        ...item,
                        size_value: Number(e.target.value) > 0 ? Number(e.target.value) : undefined,
                      })
                    }
                    min={0.01}
                    step={0.01}
                  />
                  <Input
                    label="Size unit"
                    value={item.size_unit || ''}
                    onChange={(e) => updateInventoryItem(itemIndex, { ...item, size_unit: e.target.value })}
                    placeholder="e.g. ml"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button variant="danger" size="sm" onClick={() => removeInventoryItem(itemIndex)}>
                    Remove item
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={addInventoryItem} className="mt-3">
            + Add inventory item
          </Button>
        </div>

        {(formError || error) && (
          <div className="text-sm text-danger-600">{formError || error}</div>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={handleSubmit} disabled={seller.inventory.length === 0 || !seller.name.trim()}>
            {isEditing ? 'Save changes' : 'Add seller bot'}
          </Button>
          {isEditing && onCancel && (
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
