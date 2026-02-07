'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/store/sessionStore';
import { useConfig } from '@/store/configStore';
import { ProviderSelector } from './ProviderSelector';
import { ROUTES } from '@/lib/router';

export function Header() {
  const { session, llmProvider, setLLMProvider } = useSession();
  const { llmConfig, updateLLMConfig } = useConfig();
  const hasSession = !!session?.session_id;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Sync configStore -> sessionStore on mount (if configStore has provider set)
  useEffect(() => {
    if (llmConfig.provider && llmConfig.provider !== llmProvider) {
      console.log('[Header] Syncing configStore provider to sessionStore:', llmConfig.provider);
      setLLMProvider(llmConfig.provider);
    }
  }, [llmConfig.provider, llmProvider, setLLMProvider]);

  // Sync provider changes to configStore (which is used in API requests)
  const handleProviderChange = (provider: 'openrouter' | 'lm_studio') => {
    console.log('[Header] Provider change requested:', provider);
    
    // Update sessionStore for UI consistency
    setLLMProvider(provider);
    
    // Always switch to provider-appropriate default model when provider changes
    // This ensures we never send an LM Studio model to OpenRouter or vice versa
    const defaultModel = provider === 'lm_studio' 
      ? 'qwen/qwen3-1.7b' 
      : 'google/gemini-2.5-flash-lite';
    
    updateLLMConfig({
      provider: provider,
      model: defaultModel, // Always use provider-appropriate default
    });
    
    console.log('[Header] Synced provider to configStore:', provider, 'with model:', defaultModel);
  };

  // Use configStore provider as source of truth, fallback to sessionStore
  const displayProvider = llmConfig.provider || llmProvider;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
      <div className="container-custom py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={ROUTES.HOME} className="flex items-center space-x-3 text-neutral-900 hover:text-primary-700">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-sm font-semibold">DF</span>
              <span className="text-lg font-semibold tracking-tight">DealForge</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link href={ROUTES.ADMIN} className="text-neutral-600 hover:text-neutral-900">Admin</Link>
              <Link href={ROUTES.SELLER} className="text-neutral-600 hover:text-neutral-900">Seller</Link>
              <Link href={ROUTES.BUYER} className="text-neutral-600 hover:text-neutral-900">Buyer</Link>
              <Link href={ROUTES.HISTORY} className="text-neutral-600 hover:text-neutral-900">History</Link>
              {hasSession && (
                <Link href={ROUTES.NEGOTIATIONS} className="text-primary-700 hover:text-primary-800 font-medium">Negotiations</Link>
              )}
            </nav>
          </div>
          <div className="hidden md:block">
            <ProviderSelector selectedProvider={displayProvider} onProviderChange={handleProviderChange} />
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-200 p-2 text-neutral-700 hover:bg-neutral-50 md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={mobileNavOpen}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div className={`${mobileNavOpen ? 'mt-3 flex' : 'hidden'} flex-col gap-3 md:hidden`}>
          <nav className="flex flex-col gap-2 text-sm">
            <Link href={ROUTES.ADMIN} className="text-neutral-600 hover:text-neutral-900">Admin</Link>
            <Link href={ROUTES.SELLER} className="text-neutral-600 hover:text-neutral-900">Seller</Link>
            <Link href={ROUTES.BUYER} className="text-neutral-600 hover:text-neutral-900">Buyer</Link>
            <Link href={ROUTES.HISTORY} className="text-neutral-600 hover:text-neutral-900">History</Link>
            {hasSession && (
              <Link href={ROUTES.NEGOTIATIONS} className="text-primary-700 hover:text-primary-800 font-medium">Negotiations</Link>
            )}
          </nav>
          <ProviderSelector selectedProvider={displayProvider} onProviderChange={handleProviderChange} />
        </div>
      </div>
    </header>
  );
}

