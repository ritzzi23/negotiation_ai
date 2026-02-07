'use client';

import { useState } from 'react';
import { useConfig } from '@/store/configStore';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ProductAutocompleteInput } from '@/components/ProductAutocompleteInput';
import { NumberInput } from '@/components/NumberInput';
import { RadioGroup } from '@/components/RadioGroup';
import { Button } from '@/components/Button';
import type { SellerConfig, InventoryItem } from '@/lib/types';
import { SellerPriority, SpeakingStyle, SellerStrategy, STRATEGY_LABELS, STRATEGY_DESCRIPTIONS, MAX_SELLERS } from '@/lib/constants';
import { generateId } from '@/utils/helpers';
import { getSellerColor } from '@/lib/constants';

export function SellersConfigForm() {
  const { sellers, addSeller, updateSeller, removeSeller } = useConfig();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAddSeller = () => {
    const newSeller: SellerConfig = {
      name: '',
      inventory: [],
      profile: {
        priority: SellerPriority.CUSTOMER_RETENTION,
        speaking_style: SpeakingStyle.PROFESSIONAL,
        strategy: SellerStrategy.FIRM_PRICING,
      },
    };
    addSeller(newSeller);
  };

  const handleAddInventoryItem = (sellerIndex: number) => {
    const seller = sellers[sellerIndex];
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
    updateSeller(sellerIndex, {
      ...seller,
      inventory: [...seller.inventory, newItem],
    });
  };

  const handleRemoveInventoryItem = (sellerIndex: number, itemIndex: number) => {
    const seller = sellers[sellerIndex];
    updateSeller(sellerIndex, {
      ...seller,
      inventory: seller.inventory.filter((_, i) => i !== itemIndex),
    });
  };

  const handleUpdateInventoryItem = (sellerIndex: number, itemIndex: number, item: InventoryItem) => {
    const seller = sellers[sellerIndex];
    updateSeller(sellerIndex, {
      ...seller,
      inventory: seller.inventory.map((inv, i) => (i === itemIndex ? item : inv)),
    });
  };

  return (
    <Card
      className="transition-all duration-200"
      header={
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">
                Sellers Configuration ({sellers.length}/{MAX_SELLERS})
              </h2>
              <p className="text-sm text-neutral-600">Add up to {MAX_SELLERS} seller agents</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-neutral-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      }
    >
      {isExpanded && (
        <div className="space-y-6">
          {sellers.map((seller, sellerIndex) => (
            <div
              key={sellerIndex}
              className="border-2 rounded-lg p-6"
              style={{ borderColor: getSellerColor(sellerIndex) + '40' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: getSellerColor(sellerIndex) }}>
                  Seller #{sellerIndex + 1}
                </h3>
                {sellers.length > 1 && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeSeller(sellerIndex)}
                  >
                    Remove Seller
                  </Button>
                )}
              </div>

              {/* Seller Name */}
              <Input
                label="Name"
                value={seller.name}
                onChange={(e) => updateSeller(sellerIndex, { ...seller, name: e.target.value })}
                placeholder="Enter seller name"
                className="mb-4"
              />

              {/* Profile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <RadioGroup
                  label="Priority"
                  name={`priority-${sellerIndex}`}
                  value={seller.profile.priority}
                  onChange={(value) =>
                    updateSeller(sellerIndex, {
                      ...seller,
                      profile: { ...seller.profile, priority: value as SellerPriority },
                    })
                  }
                  options={[
                    { value: SellerPriority.CUSTOMER_RETENTION, label: 'Customer Retention' },
                    { value: SellerPriority.MAXIMIZE_PROFIT, label: 'Maximize Profit' },
                  ]}
                />

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Speaking Style</label>
                  <select
                    value={seller.profile.speaking_style}
                    onChange={(e) =>
                      updateSeller(sellerIndex, {
                        ...seller,
                        profile: { ...seller.profile, speaking_style: e.target.value as SpeakingStyle },
                      })
                    }
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
                    onChange={(e) =>
                      updateSeller(sellerIndex, {
                        ...seller,
                        profile: { ...seller.profile, strategy: e.target.value as SellerStrategy },
                      })
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  >
                    {Object.values(SellerStrategy).map((s) => (
                      <option key={s} value={s}>{STRATEGY_LABELS[s]}</option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 mt-1">
                    {STRATEGY_DESCRIPTIONS[seller.profile.strategy as SellerStrategy] || ''}
                  </p>
                </div>
              </div>

              {/* Inventory */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">Inventory</label>
                <div className="space-y-4">
                  {seller.inventory.map((item, itemIndex) => (
                    <div key={item.item_id} className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <ProductAutocompleteInput
                          label="Item"
                          value={item.item_name}
                          onValueChange={(value) =>
                            handleUpdateInventoryItem(sellerIndex, itemIndex, {
                              ...item,
                              item_name: value,
                            })
                          }
                          onSelectProduct={(product) =>
                            handleUpdateInventoryItem(sellerIndex, itemIndex, {
                              ...item,
                              item_id: product.id,
                              item_name: product.name,
                              variant: product.variant || '',
                              size_value: product.size_value ?? undefined,
                              size_unit: product.size_unit || '',
                            })
                          }
                          placeholder="e.g., Laptop"
                          helpText="Start typing to search the catalog"
                        />
                        <NumberInput
                          label="Cost"
                          value={item.cost_price}
                          onChange={(e) =>
                            handleUpdateInventoryItem(sellerIndex, itemIndex, {
                              ...item,
                              cost_price: Number(e.target.value),
                            })
                          }
                          min={0}
                          step={0.01}
                        />
                        <NumberInput
                          label="Selling"
                          value={item.selling_price}
                          onChange={(e) =>
                            handleUpdateInventoryItem(sellerIndex, itemIndex, {
                              ...item,
                              selling_price: Number(e.target.value),
                            })
                          }
                          min={0}
                          step={0.01}
                        />
                        <NumberInput
                          label="Least"
                          value={item.least_price}
                          onChange={(e) =>
                            handleUpdateInventoryItem(sellerIndex, itemIndex, {
                              ...item,
                              least_price: Number(e.target.value),
                            })
                          }
                          min={0}
                          step={0.01}
                        />
                        <NumberInput
                          label="Stock"
                          value={item.quantity_available}
                          onChange={(e) =>
                            handleUpdateInventoryItem(sellerIndex, itemIndex, {
                              ...item,
                              quantity_available: Number(e.target.value),
                            })
                          }
                          min={0}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="Variant"
                          value={item.variant || ''}
                          onChange={(e) =>
                            handleUpdateInventoryItem(sellerIndex, itemIndex, {
                              ...item,
                              variant: e.target.value,
                            })
                          }
                          placeholder="e.g. Bottle"
                        />
                        <NumberInput
                          label="Size value"
                          value={item.size_value ?? ''}
                          onChange={(e) =>
                            handleUpdateInventoryItem(sellerIndex, itemIndex, {
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
                          onChange={(e) =>
                            handleUpdateInventoryItem(sellerIndex, itemIndex, {
                              ...item,
                              size_unit: e.target.value,
                            })
                          }
                          placeholder="e.g. ml"
                        />
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveInventoryItem(sellerIndex, itemIndex)}
                        >
                          Remove Item
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddInventoryItem(sellerIndex)}
                  className="mt-3"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Inventory Item
                </Button>
              </div>
            </div>
          ))}

          {sellers.length < MAX_SELLERS && (
            <Button variant="secondary" onClick={handleAddSeller}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Another Seller
            </Button>
          )}

          {sellers.length >= MAX_SELLERS && (
            <p className="text-sm text-warning-600">Maximum number of sellers ({MAX_SELLERS}) reached</p>
          )}
        </div>
      )}
    </Card>
  );
}

