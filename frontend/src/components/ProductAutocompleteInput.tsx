'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { debounce } from '@/utils/helpers';
import { searchProducts } from '@/lib/api/products';
import type { Product } from '@/lib/types';

interface ProductAutocompleteInputProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelectProduct?: (product: Product) => void;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  className?: string;
  minQueryLength?: number;
  limit?: number;
  id?: string;
}

export function ProductAutocompleteInput({
  label,
  value,
  onValueChange,
  onSelectProduct,
  placeholder,
  helpText,
  disabled,
  className,
  minQueryLength = 2,
  limit = 8,
  id,
}: ProductAutocompleteInputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const fetchSuggestions = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < minQueryLength) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const data = await searchProducts(trimmed, limit);
      if (requestId !== requestIdRef.current) return;
      setSuggestions(data.items);
      setIsOpen(true);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [limit, minQueryLength]);

  const debouncedFetch = useMemo(() => debounce(fetchSuggestions, 250), [fetchSuggestions]);

  useEffect(() => {
    debouncedFetch(value);
  }, [value, debouncedFetch]);

  const handleSelect = (product: Product) => {
    onValueChange(product.name);
    onSelectProduct?.(product);
    setIsOpen(false);
  };

  const formatProductMeta = (product: Product) => {
    const parts: string[] = [];
    if (product.variant) parts.push(product.variant);
    if (product.size_value && product.size_unit) {
      parts.push(`${product.size_value}${product.size_unit}`);
    }
    if (product.category) parts.push(product.category);
    return parts.join(' / ');
  };

  return (
    <div className={clsx('relative w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 150);
        }}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        className={clsx(
          'w-full px-3 py-2 border rounded-xl bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-colors',
          disabled ? 'bg-neutral-100 cursor-not-allowed' : 'border-neutral-300'
        )}
      />

      {isOpen && (
        <div className="absolute z-10 mt-2 w-full rounded-xl border border-neutral-200 bg-white shadow-lg">
          {isLoading && (
            <div className="px-3 py-2 text-xs text-neutral-500">Searching catalog...</div>
          )}
          {!isLoading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-neutral-500">No matches in catalog</div>
          )}
          {!isLoading && suggestions.length > 0 && (
            <ul role="listbox" className="max-h-56 overflow-auto">
              {suggestions.map((product) => (
                <li key={product.id} role="option">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(product)}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 focus:outline-none"
                  >
                    <div className="text-sm text-neutral-900">{product.name}</div>
                    {(product.variant || product.size_value || product.category || product.description) && (
                      <div className="text-xs text-neutral-500">
                        {formatProductMeta(product) || 'Uncategorized'}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {helpText && (
        <p className="mt-1 text-sm text-neutral-500">{helpText}</p>
      )}
    </div>
  );
}
