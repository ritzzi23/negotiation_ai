'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ProductAutocompleteInput } from '@/components/ProductAutocompleteInput';
import { NumberInput } from '@/components/NumberInput';
import { Button } from '@/components/Button';
import type { BuyerConfig, ShoppingItem } from '@/lib/types';
import { generateId } from '@/utils/helpers';
import { validateBuyerConfig } from '@/utils/validators';

const emptyBuyer = (): BuyerConfig => ({
  name: '',
  shopping_list: [],
});

function cloneBuyer(b: BuyerConfig): BuyerConfig {
  return {
    name: b.name,
    shopping_list: b.shopping_list.map((item) => ({
      ...item,
      item_id: item.item_id,
      item_name: item.item_name,
      variant: item.variant,
      size_value: item.size_value,
      size_unit: item.size_unit,
      quantity_needed: item.quantity_needed,
      min_price_per_unit: item.min_price_per_unit,
      max_price_per_unit: item.max_price_per_unit,
    })),
  };
}

export interface AddBuyerFormProps {
  initialBuyer?: BuyerConfig | null;
  onAdd: (buyer: BuyerConfig) => void;
  onSave?: (buyer: BuyerConfig) => void;
  onCancel?: () => void;
  error?: string | null;
  onClearError?: () => void;
}

export function AddBuyerForm({ initialBuyer, onAdd, onSave, onCancel, error, onClearError }: AddBuyerFormProps) {
  const isEditing = initialBuyer != null;
  const [buyer, setBuyer] = useState<BuyerConfig>(() => (initialBuyer ? cloneBuyer(initialBuyer) : emptyBuyer()));
  const [formError, setFormError] = useState<string | null>(null);
  const prevInitialRef = useRef<BuyerConfig | null | undefined>(initialBuyer);

  useEffect(() => {
    if (initialBuyer !== prevInitialRef.current) {
      prevInitialRef.current = initialBuyer;
      setBuyer(initialBuyer ? cloneBuyer(initialBuyer) : emptyBuyer());
    }
  }, [initialBuyer]);

  const updateName = (name: string) => setBuyer((b) => ({ ...b, name }));

  const addItem = () => {
    const newItem: ShoppingItem = {
      item_id: `item_${generateId()}`,
      item_name: '',
      variant: '',
      size_value: undefined,
      size_unit: '',
      quantity_needed: 1,
      min_price_per_unit: 0,
      max_price_per_unit: 100,
    };
    setBuyer((b) => ({ ...b, shopping_list: [...b.shopping_list, newItem] }));
  };

  const updateItem = (index: number, item: ShoppingItem) => {
    setBuyer((b) => ({
      ...b,
      shopping_list: b.shopping_list.map((x, i) => (i === index ? item : x)),
    }));
  };

  const removeItem = (index: number) => {
    setBuyer((b) => ({
      ...b,
      shopping_list: b.shopping_list.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    onClearError?.();
    setFormError(null);
    // Filter out ghost/incomplete items before submitting
    const cleanedBuyer = {
      ...buyer,
      shopping_list: buyer.shopping_list.filter((item) => item.item_name.trim() !== ''),
    };
    const errors = validateBuyerConfig(cleanedBuyer);
    if (errors.length > 0) {
      setFormError(errors.map((e) => e.message).join('. '));
      return;
    }
    if (isEditing && onSave) {
      onSave(cleanedBuyer);
    } else {
      onAdd(cleanedBuyer);
      setBuyer(emptyBuyer());
    }
  };

  const handleCancel = () => {
    setFormError(null);
    onClearError?.();
    if (initialBuyer) setBuyer(cloneBuyer(initialBuyer));
    else setBuyer(emptyBuyer());
    onCancel?.();
  };

  return (
    <Card
      header={
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              {isEditing ? 'Edit buyer agent' : 'Add buyer agent'}
            </h2>
            <p className="text-sm text-neutral-600">Name and purchase plan (multiple items)</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <Input
          label="Buyer name"
          value={buyer.name}
          onChange={(e) => updateName(e.target.value)}
          placeholder="e.g. John Doe"
        />

        <div>
          <button
            type="button"
            onClick={() => setBuyer((b) => ({ ...b, _showPrompt: !((b as any)._showPrompt) }))}
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-3"
          >
            <svg className={`w-4 h-4 transition-transform ${(buyer as any)._showPrompt ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced: Custom Prompt
          </button>
          {(buyer as any)._showPrompt && (
            <div className="mb-4">
              <textarea
                value={buyer.custom_prompt || ''}
                onChange={(e) => setBuyer((b) => ({ ...b, custom_prompt: e.target.value }))}
                placeholder="Add custom instructions for your agent (optional). This will be appended to the system prompt."
                maxLength={500}
                rows={3}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              <p className="text-xs text-neutral-400 mt-1">{(buyer.custom_prompt || '').length}/500</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">Purchase plan (items)</label>
          <div className="space-y-4">
            {buyer.shopping_list.map((item, index) => (
              <div key={item.item_id} className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <ProductAutocompleteInput
                    label="Item name"
                    value={item.item_name}
                    onValueChange={(value) => updateItem(index, { ...item, item_name: value })}
                    onSelectProduct={(product) =>
                      updateItem(index, {
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
                  <NumberInput
                    label="Quantity"
                    value={item.quantity_needed}
                    onChange={(e) => updateItem(index, { ...item, quantity_needed: Number(e.target.value) })}
                    min={1}
                  />
                  <NumberInput
                    label="Min price (per unit)"
                    value={item.min_price_per_unit}
                    onChange={(e) => updateItem(index, { ...item, min_price_per_unit: Number(e.target.value) })}
                    min={0}
                    step={0.01}
                  />
                  <NumberInput
                    label="Max price (per unit)"
                    value={item.max_price_per_unit}
                    onChange={(e) => updateItem(index, { ...item, max_price_per_unit: Number(e.target.value) })}
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Variant"
                    value={item.variant || ''}
                    onChange={(e) => updateItem(index, { ...item, variant: e.target.value })}
                    placeholder="e.g. Bottle"
                  />
                  <NumberInput
                    label="Size value"
                    value={item.size_value ?? ''}
                    onChange={(e) =>
                      updateItem(index, {
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
                    onChange={(e) => updateItem(index, { ...item, size_unit: e.target.value })}
                    placeholder="e.g. ml"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button variant="danger" size="sm" onClick={() => removeItem(index)}>
                    Remove item
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" onClick={addItem} className="mt-4">
            + Add item to plan
          </Button>
        </div>

        {(formError || error) && (
          <div className="text-sm text-danger-600">{formError || error}</div>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={handleSubmit} disabled={buyer.shopping_list.length === 0 || !buyer.name.trim()}>
            {isEditing ? 'Save changes' : 'Add buyer agent'}
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
