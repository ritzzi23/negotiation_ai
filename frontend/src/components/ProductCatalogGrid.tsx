'use client';

import React, { useState, useEffect } from 'react';
import { listProducts } from '@/lib/api/products';
import type { Product } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ProductCatalogGridProps {
  onSelectProduct?: (product: Product) => void;
  selectable?: boolean;
  showActions?: boolean;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: '\uD83D\uDCBB',
  Furniture: '\uD83E\uDE91',
  Appliances: '\u2615',
  Office: '\uD83D\uDDA8\uFE0F',
  Beverages: '\uD83E\uDD64',
};

export function ProductCatalogGrid({
  onSelectProduct,
  selectable = true,
  showActions = false,
  onEditProduct,
  onDeleteProduct,
}: ProductCatalogGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async (query?: string) => {
    setLoading(true);
    try {
      const response = await listProducts(query || '', 50);
      setProducts(response.items);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    loadProducts(q);
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" label="Loading product catalog..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search products..."
          className="w-full max-w-sm rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-neutral-500 py-4">No products found. Seed the catalog first.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={`group rounded-2xl border border-neutral-200 bg-white overflow-hidden transition-shadow hover:shadow-md ${
                selectable ? 'cursor-pointer' : ''
              }`}
              onClick={() => selectable && onSelectProduct?.(product)}
            >
              <div className="aspect-[3/2] bg-neutral-100 relative overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    {CATEGORY_ICONS[product.category || ''] || '\uD83D\uDCE6'}
                  </div>
                )}
                {selectable && (
                  <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-primary-700 text-xs font-medium bg-white/90 rounded-full px-3 py-1 transition-opacity">
                      + Add
                    </span>
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <h3 className="text-sm font-medium text-neutral-900 truncate">{product.name}</h3>
                <p className="text-xs text-neutral-500">
                  {product.category || 'Uncategorized'}
                  {product.variant && ` \u00B7 ${product.variant}`}
                  {product.size_value && product.size_unit && ` \u00B7 ${product.size_value}${product.size_unit}`}
                </p>
                {showActions && (
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditProduct?.(product); }}
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteProduct?.(product.id); }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
