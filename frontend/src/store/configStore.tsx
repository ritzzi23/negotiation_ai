'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { BuyerConfig, SellerConfig, LLMConfig, CreditCardConfig } from '@/lib/types';
import { SellerPriority, SpeakingStyle, SellerStrategy, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, DEFAULT_PROVIDER } from '@/lib/constants';
import {
  loadFromStorage,
  saveToStorage,
  clearStorage,
  downloadConfigAsJson,
  parseImportedJson,
} from '@/lib/configStorage';

export interface ConfigState {
  buyers: BuyerConfig[];
  sellers: SellerConfig[];
  llmConfig: LLMConfig;
  creditCards: CreditCardConfig[];
}

interface ConfigContextValue extends ConfigState {
  addBuyer: (buyer: BuyerConfig) => void;
  updateBuyer: (index: number, buyer: BuyerConfig) => void;
  removeBuyer: (index: number) => void;
  addSeller: (seller: SellerConfig) => void;
  updateSeller: (index: number, seller: SellerConfig) => void;
  removeSeller: (index: number) => void;
  updateLLMConfig: (config: Partial<LLMConfig>) => void;
  setCreditCards: (cards: CreditCardConfig[]) => void;
  loadSampleData: () => void;
  clearAllData: () => void;
  exportToJson: () => void;
  importFromJson: (jsonString: string) => void;
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

const initialLLMConfig: LLMConfig = {
  model: 'google/gemma-3-12b',
  temperature: DEFAULT_TEMPERATURE,
  max_tokens: DEFAULT_MAX_TOKENS,
  provider: DEFAULT_PROVIDER,
};

// Sample data constants (used for first-visit pre-population and loadSampleData)
const sampleBuyer: BuyerConfig = {
  name: 'John Doe',
  shopping_list: [
    { item_id: 'item_001', item_name: 'Laptop', quantity_needed: 2, min_price_per_unit: 900, max_price_per_unit: 1200 },
    { item_id: 'item_002', item_name: 'Mouse', quantity_needed: 5, min_price_per_unit: 15, max_price_per_unit: 25 },
  ],
};

const sampleSellers: SellerConfig[] = [
  { name: 'TechStore', inventory: [{ item_id: 'item_001', item_name: 'Laptop', cost_price: 800, selling_price: 1200, least_price: 1000, quantity_available: 10 }, { item_id: 'item_002', item_name: 'Mouse', cost_price: 8, selling_price: 30, least_price: 18, quantity_available: 50 }], profile: { priority: SellerPriority.CUSTOMER_RETENTION, speaking_style: SpeakingStyle.ENTHUSIASTIC, strategy: SellerStrategy.LOYALTY_BUILDER } },
  { name: 'GadgetHub', inventory: [{ item_id: 'item_001', item_name: 'Laptop', cost_price: 750, selling_price: 1150, least_price: 950, quantity_available: 5 }, { item_id: 'item_002', item_name: 'Mouse', cost_price: 10, selling_price: 28, least_price: 20, quantity_available: 30 }], profile: { priority: SellerPriority.MAXIMIZE_PROFIT, speaking_style: SpeakingStyle.RUDE, strategy: SellerStrategy.FIRM_PRICING } },
  { name: 'CompuWorld', inventory: [{ item_id: 'item_001', item_name: 'Laptop', cost_price: 820, selling_price: 1180, least_price: 1020, quantity_available: 8 }, { item_id: 'item_002', item_name: 'Mouse', cost_price: 12, selling_price: 25, least_price: 16, quantity_available: 100 }], profile: { priority: SellerPriority.CUSTOMER_RETENTION, speaking_style: SpeakingStyle.PROFESSIONAL, strategy: SellerStrategy.PRICE_MATCHER } },
  { name: 'BargainBytes', inventory: [{ item_id: 'item_001', item_name: 'Laptop', cost_price: 780, selling_price: 1100, least_price: 900, quantity_available: 3 }], profile: { priority: SellerPriority.MAXIMIZE_PROFIT, speaking_style: SpeakingStyle.CASUAL, strategy: SellerStrategy.AGGRESSIVE_DISCOUNTER } },
  { name: 'EliteElectronics', inventory: [{ item_id: 'item_001', item_name: 'Laptop', cost_price: 850, selling_price: 1350, least_price: 1100, quantity_available: 15 }], profile: { priority: SellerPriority.MAXIMIZE_PROFIT, speaking_style: SpeakingStyle.PROFESSIONAL, strategy: SellerStrategy.PREMIUM_POSITIONER } },
  { name: 'QuickDeal', inventory: [{ item_id: 'item_001', item_name: 'Laptop', cost_price: 760, selling_price: 1050, least_price: 880, quantity_available: 2 }, { item_id: 'item_002', item_name: 'Mouse', cost_price: 9, selling_price: 22, least_price: 14, quantity_available: 200 }], profile: { priority: SellerPriority.CUSTOMER_RETENTION, speaking_style: SpeakingStyle.ENTHUSIASTIC, strategy: SellerStrategy.CLEARANCE_SELLER } },
  { name: 'BundleMaster', inventory: [{ item_id: 'item_001', item_name: 'Laptop', cost_price: 810, selling_price: 1250, least_price: 1050, quantity_available: 6 }, { item_id: 'item_002', item_name: 'Mouse', cost_price: 7, selling_price: 35, least_price: 15, quantity_available: 75 }], profile: { priority: SellerPriority.CUSTOMER_RETENTION, speaking_style: SpeakingStyle.VERY_SWEET, strategy: SellerStrategy.BUNDLER } },
  { name: 'LastChance', inventory: [{ item_id: 'item_001', item_name: 'Laptop', cost_price: 790, selling_price: 1120, least_price: 920, quantity_available: 1 }], profile: { priority: SellerPriority.MAXIMIZE_PROFIT, speaking_style: SpeakingStyle.RUDE, strategy: SellerStrategy.LIMITED_INVENTORY } },
  { name: 'MarketPro', inventory: [{ item_id: 'item_001', item_name: 'Laptop', cost_price: 830, selling_price: 1200, least_price: 980, quantity_available: 12 }, { item_id: 'item_002', item_name: 'Mouse', cost_price: 11, selling_price: 26, least_price: 17, quantity_available: 60 }], profile: { priority: SellerPriority.MAXIMIZE_PROFIT, speaking_style: SpeakingStyle.PROFESSIONAL, strategy: SellerStrategy.HAGGLER } },
  { name: 'SlowShip', inventory: [{ item_id: 'item_001', item_name: 'Laptop', cost_price: 770, selling_price: 1080, least_price: 890, quantity_available: 7 }], profile: { priority: SellerPriority.CUSTOMER_RETENTION, speaking_style: SpeakingStyle.CASUAL, strategy: SellerStrategy.SLOW_RESPONDER } },
];

const sampleCreditCards: CreditCardConfig[] = [
  { card_id: 'chase_sapphire', card_name: 'Chase Sapphire Preferred', issuer: 'Chase', rewards: [{ category: 'dining', cashback_pct: 3 }, { category: 'travel', cashback_pct: 5 }, { category: 'electronics', cashback_pct: 2 }, { category: 'general', cashback_pct: 1 }], vendor_offers: [{ vendor_keyword: 'TechStore', discount_pct: 5, max_discount: 25 }], annual_fee: 95 },
  { card_id: 'amex_blue', card_name: 'Amex Blue Cash Preferred', issuer: 'American Express', rewards: [{ category: 'electronics', cashback_pct: 3 }, { category: 'groceries', cashback_pct: 6 }, { category: 'general', cashback_pct: 1 }], vendor_offers: [{ vendor_keyword: 'Elite', discount_pct: 10, max_discount: 50 }], annual_fee: 95 },
  { card_id: 'discover_it', card_name: 'Discover it Cash Back', issuer: 'Discover', rewards: [{ category: 'electronics', cashback_pct: 5 }, { category: 'general', cashback_pct: 1 }], vendor_offers: [], annual_fee: 0 },
];

function getInitialState(): ConfigState {
  const loaded = loadFromStorage();
  if (loaded) {
    return {
      // Clean ghost items (empty item_name) from loaded buyers
      buyers: loaded.buyers.map((b: BuyerConfig) => ({
        ...b,
        shopping_list: (b.shopping_list || []).filter(
          (item) => item.item_name && item.item_name.trim() !== ''
        ),
      })),
      sellers: loaded.sellers,
      llmConfig: loaded.llmConfig,
      creditCards: loaded.creditCards,
    };
  }
  // First visit: pre-populate with sample data
  return {
    buyers: [sampleBuyer],
    sellers: sampleSellers,
    llmConfig: initialLLMConfig,
    creditCards: sampleCreditCards,
  };
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfigState>(getInitialState);

  useEffect(() => {
    saveToStorage({
      buyers: state.buyers,
      sellers: state.sellers,
      llmConfig: state.llmConfig,
      creditCards: state.creditCards,
    });
  }, [state.buyers, state.sellers, state.llmConfig, state.creditCards]);

  const addBuyer = useCallback((buyer: BuyerConfig) => {
    setState((prev) => ({
      ...prev,
      buyers: [...prev.buyers, buyer],
    }));
  }, []);

  const updateBuyer = useCallback((index: number, buyer: BuyerConfig) => {
    setState((prev) => ({
      ...prev,
      buyers: prev.buyers.map((b, i) => (i === index ? buyer : b)),
    }));
  }, []);

  const removeBuyer = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      buyers: prev.buyers.filter((_, i) => i !== index),
    }));
  }, []);

  const addSeller = useCallback((seller: SellerConfig) => {
    setState((prev) => ({
      ...prev,
      sellers: [...prev.sellers, seller],
    }));
  }, []);

  const updateSeller = useCallback((index: number, seller: SellerConfig) => {
    setState((prev) => ({
      ...prev,
      sellers: prev.sellers.map((s, i) => (i === index ? seller : s)),
    }));
  }, []);

  const removeSeller = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      sellers: prev.sellers.filter((_, i) => i !== index),
    }));
  }, []);

  const updateLLMConfig = useCallback((config: Partial<LLMConfig>) => {
    setState((prev) => ({
      ...prev,
      llmConfig: { ...prev.llmConfig, ...config },
    }));
  }, []);

  const setCreditCards = useCallback((cards: CreditCardConfig[]) => {
    setState((prev) => ({
      ...prev,
      creditCards: cards,
    }));
  }, []);

  const loadSampleData = useCallback(() => {
    setState((prev) => ({
      buyers: [sampleBuyer],
      sellers: sampleSellers,
      llmConfig: prev.llmConfig,
      creditCards: sampleCreditCards,
    }));
  }, []);

  const clearAllData = useCallback(() => {
    clearStorage();
    setState({
      buyers: [],
      sellers: [],
      llmConfig: initialLLMConfig,
      creditCards: [],
    });
  }, []);

  const exportToJson = useCallback(() => {
    downloadConfigAsJson({
      version: 1,
      buyers: state.buyers,
      sellers: state.sellers,
      llmConfig: state.llmConfig,
      creditCards: state.creditCards,
    });
  }, [state.buyers, state.sellers, state.llmConfig, state.creditCards]);

  const importFromJson = useCallback((jsonString: string) => {
    const parsed = parseImportedJson(jsonString);
    setState({
      buyers: parsed.buyers,
      sellers: parsed.sellers,
      llmConfig: parsed.llmConfig,
      creditCards: parsed.creditCards,
    });
  }, []);

  const value: ConfigContextValue = {
    ...state,
    addBuyer,
    updateBuyer,
    removeBuyer,
    addSeller,
    updateSeller,
    removeSeller,
    updateLLMConfig,
    setCreditCards,
    loadSampleData,
    clearAllData,
    exportToJson,
    importFromJson,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
