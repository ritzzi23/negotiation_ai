/**
 * DealForge config persistence: localStorage, export, import.
 * Single source of truth for storage key and serialization shape.
 */

import type {
  BuyerConfig,
  SellerConfig,
  LLMConfig,
  CreditCardConfig,
} from './types';

export const CONFIG_STORAGE_KEY = 'dealforge_config';
export const EXPORT_VERSION = 1;

export interface PersistedConfig {
  version: number;
  buyers: BuyerConfig[];
  sellers: SellerConfig[];
  llmConfig: LLMConfig;
  creditCards: CreditCardConfig[];
  savedAt: string;
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isBuyerConfig(x: unknown): x is BuyerConfig {
  if (!isObject(x)) return false;
  return (
    typeof x.name === 'string' &&
    Array.isArray(x.shopping_list) &&
    x.shopping_list.every(
      (i: unknown) =>
        isObject(i) &&
        typeof (i as ShoppingItemLike).item_name === 'string' &&
        typeof (i as ShoppingItemLike).quantity_needed === 'number' &&
        typeof (i as ShoppingItemLike).min_price_per_unit === 'number' &&
        typeof (i as ShoppingItemLike).max_price_per_unit === 'number'
    )
  );
}

interface ShoppingItemLike {
  item_name: string;
  quantity_needed: number;
  min_price_per_unit: number;
  max_price_per_unit: number;
}

function isSellerConfig(x: unknown): x is SellerConfig {
  if (!isObject(x)) return false;
  if (typeof x.name !== 'string') return false;
  if (!isObject(x.profile)) return false;
  const p = x.profile as Record<string, unknown>;
  if (typeof p.priority !== 'string' || typeof p.speaking_style !== 'string' || typeof p.strategy !== 'string')
    return false;
  if (!Array.isArray(x.inventory)) return false;
  return x.inventory.every((i: unknown) => {
    if (!isObject(i)) return false;
    const inv = i as Record<string, unknown>;
    return (
      typeof inv.item_name === 'string' &&
      typeof inv.cost_price === 'number' &&
      typeof inv.selling_price === 'number' &&
      typeof inv.least_price === 'number' &&
      typeof inv.quantity_available === 'number'
    );
  });
}

function isLLMConfig(x: unknown): x is LLMConfig {
  if (!isObject(x)) return false;
  return (
    typeof x.model === 'string' &&
    typeof x.temperature === 'number' &&
    typeof x.max_tokens === 'number'
  );
}

function isCreditCardConfig(x: unknown): x is CreditCardConfig {
  if (!isObject(x)) return false;
  return (
    typeof x.card_name === 'string' &&
    typeof x.issuer === 'string' &&
    Array.isArray(x.rewards) &&
    Array.isArray(x.vendor_offers) &&
    typeof x.annual_fee === 'number'
  );
}

export function loadFromStorage(): PersistedConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!isObject(data)) return null;
    const version = typeof data.version === 'number' ? data.version : 0;
    const buyers = Array.isArray(data.buyers) ? data.buyers.filter(isBuyerConfig) : [];
    const sellers = Array.isArray(data.sellers) ? data.sellers.filter(isSellerConfig) : [];
    const llmConfig = isLLMConfig(data.llmConfig) ? data.llmConfig : null;
    const creditCards = Array.isArray(data.creditCards) ? data.creditCards.filter(isCreditCardConfig) : [];
    if (!llmConfig) return null;
    return {
      version,
      buyers,
      sellers,
      llmConfig,
      creditCards,
      savedAt: typeof data.savedAt === 'string' ? data.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveToStorage(config: Omit<PersistedConfig, 'version' | 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const toSave: PersistedConfig = {
      ...config,
      version: EXPORT_VERSION,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore quota or parse errors
  }
}

export function clearStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CONFIG_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Build downloadable JSON file content and trigger download */
export function downloadConfigAsJson(config: Omit<PersistedConfig, 'savedAt'>): void {
  const payload: PersistedConfig = {
    ...config,
    savedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dealforge-config-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse uploaded JSON file. Returns parsed config or throws with a message.
 */
export function parseImportedJson(jsonString: string): PersistedConfig {
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON file');
  }
  if (!isObject(data)) throw new Error('Config must be an object');
  const buyers = Array.isArray(data.buyers) ? data.buyers.filter(isBuyerConfig) : [];
  const sellers = Array.isArray(data.sellers) ? data.sellers.filter(isSellerConfig) : [];
  const llmConfig = isLLMConfig(data.llmConfig) ? data.llmConfig : null;
  const creditCards = Array.isArray(data.creditCards) ? data.creditCards.filter(isCreditCardConfig) : [];
  if (!llmConfig) throw new Error('Invalid or missing LLM config in file');
  return {
    version: typeof data.version === 'number' ? data.version : EXPORT_VERSION,
    buyers,
    sellers,
    llmConfig,
    creditCards,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : new Date().toISOString(),
  };
}
