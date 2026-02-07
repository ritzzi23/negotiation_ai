'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from '@/store/sessionStore';
import { Button } from '@/components/Button';
import { ROUTES } from '@/lib/router';

const previewCopy = {
  buyer: {
    title: 'Buyer view',
    subtitle: 'Track live offers and pick the best effective price.',
    statLeft: 'Best offer',
    statRight: 'Card savings',
  },
  seller: {
    title: 'Seller view',
    subtitle: 'Run multiple strategies and respond in real time.',
    statLeft: 'Active bots',
    statRight: 'Avg. response',
  },
  admin: {
    title: 'Admin view',
    subtitle: 'Configure sessions, sellers, and reward rules.',
    statLeft: 'Rooms',
    statRight: 'Completion',
  },
} as const;

export default function LandingPage() {
  const { session } = useSession();
  const hasSession = !!session?.session_id;
  const [activePreview, setActivePreview] = useState<'buyer' | 'seller' | 'admin'>('buyer');

  return (
    <div className="min-h-screen bg-white">
      <div className="container-custom">
        {/* Hero Section */}
        <main className="py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="mt-4 text-4xl md:text-[3.6rem] leading-[1.05] font-display tracking-tight text-neutral-900">
                Your AI negotiates.
                <br />
                You get the best deal.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-neutral-600 animate-fade-up" style={{ animationDelay: '60ms' }}>
                Set your constraints once. Your agent negotiates with up to 10 sellers in parallel,
                factors in your credit card rewards, and returns the optimal deal with clear tradeoffs.
              </p>

              <div className="mt-8 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: '120ms' }}>
                <Link href={ROUTES.ADMIN}>
                  <Button size="lg" className="px-7">Admin</Button>
                </Link>
                <Link href={ROUTES.SELLER}>
                  <Button size="lg" variant="secondary" className="px-7">Seller</Button>
                </Link>
                <Link href={ROUTES.BUYER}>
                  <Button size="lg" variant="secondary" className="px-7">Buyer</Button>
                </Link>
                {hasSession && (
                  <Link href={ROUTES.NEGOTIATIONS}>
                    <Button size="lg" className="px-7">Negotiations</Button>
                  </Link>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Sellers', value: 'Up to 10', helper: 'Parallel agents' },
                  { label: 'Decisioning', value: 'Card-aware', helper: 'Effective price ranking' },
                  { label: 'Telemetry', value: 'Live SSE', helper: 'Instant status updates' },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 animate-fade-up"
                    style={{ animationDelay: `${160 + index * 60}ms` }}
                  >
                    <p className="text-xs text-neutral-500 uppercase tracking-wide">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold text-neutral-900">{item.value}</p>
                    <p className="text-xs text-neutral-500">{item.helper}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 w-full max-w-lg mx-auto lg:mx-0">
              <div className="rounded-[28px] border border-neutral-200 bg-white p-4 sm:p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.45)] animate-fade-up" style={{ animationDelay: '120ms' }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Live Preview</p>
                    <h3 className="text-lg font-semibold text-neutral-900">{previewCopy[activePreview].title}</h3>
                    <p className="text-sm text-neutral-600">{previewCopy[activePreview].subtitle}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[10px] font-medium text-primary-700">
                      Live
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(['buyer', 'seller', 'admin'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActivePreview(tab)}
                          className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                            activePreview === tab
                              ? 'border-primary-200 text-primary-700 bg-primary-50'
                              : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-neutral-200 p-4">
                    <p className="text-xs text-neutral-500">{previewCopy[activePreview].statLeft}</p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-900">$842</p>
                    <p className="text-xs text-neutral-500">with 5% cashback</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 p-4">
                    <p className="text-xs text-neutral-500">{previewCopy[activePreview].statRight}</p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-900">$68</p>
                    <p className="text-xs text-neutral-500">this session</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>Seller responses</span>
                    <span>Round 3/10</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[85, 72, 64].map((value) => (
                      <div key={value} className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary-500" />
                        <div className="h-2 flex-1 rounded-full bg-neutral-100 overflow-hidden">
                          <div className="h-full bg-primary-500" style={{ width: `${value}%` }} />
                        </div>
                        <span className="text-xs text-neutral-500">{value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Feature Grid */}
        <section className="pb-12 md:pb-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Capabilities</p>
              <h2 className="mt-2 text-2xl md:text-3xl font-display text-neutral-900">Negotiation intelligence, end to end</h2>
            </div>
            <p className="hidden md:block text-sm text-neutral-500 max-w-xs text-right">
              Built for fast tradeoffs, clear rationale, and card-aware decisions.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: (
                  <svg className="h-6 w-6 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5l-4.5 4.5-4.5-4.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v7.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 21h12" />
                  </svg>
                ),
                title: '10 Parallel Agents',
                body: 'Negotiate with up to 10 sellers simultaneously.',
              },
              {
                icon: (
                  <svg className="h-6 w-6 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
                  </svg>
                ),
                title: 'Card Rewards',
                body: 'Effective price includes cashback and offers.',
              },
              {
                icon: (
                  <svg className="h-6 w-6 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="12" rx="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 20h8" />
                  </svg>
                ),
                title: 'Multi-Device',
                body: 'Desktop dashboard with a phone companion view.',
              },
              {
                icon: (
                  <svg className="h-6 w-6 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 3l-7 10h6l-1 8 7-10h-6l1-8z" />
                  </svg>
                ),
                title: 'On-Device LLM',
                body: 'Local inference with LM Studio on Snapdragon.',
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.35)] interactive-tile animate-fade-up"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-1">{feature.title}</h3>
                <p className="text-xs text-neutral-600">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-12 md:pb-16">
          <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-6 md:p-8 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.45)] animate-fade-up">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500">Operating Principles</p>
                <h3 className="mt-2 text-2xl font-semibold text-neutral-900">Built for local, transparent deal flow</h3>
              </div>
              <div className="self-start md:self-auto rounded-full border border-neutral-200 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                Core
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: 'On-device AI',
                  body: 'Runs locally with LM Studio. No cloud dependency.',
                },
                {
                  title: 'Real-time negotiation',
                  body: 'Parallel seller replies with streaming updates.',
                },
                {
                  title: 'Full transparency',
                  body: 'Every offer, card reward, and tradeoff is visible.',
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 animate-fade-up"
                  style={{ animationDelay: `${120 + index * 70}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-secondary-500" />
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                      <p className="text-xs text-neutral-600">{item.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-12 md:pb-16">
          <div className="surface p-6 md:p-8 animate-fade-up">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">How it works</p>
                <h2 className="mt-2 text-2xl md:text-3xl font-display text-neutral-900">Set constraints. Run negotiations. Pick the best deal.</h2>
                <p className="mt-2 text-sm text-neutral-600 max-w-2xl">
                  Configure a buyer, pick sellers, then watch negotiations unfold in real time with transparent pricing and rewards.
                </p>
              </div>
              <div className="flex gap-3">
                <Link href={ROUTES.ADMIN}>
                  <Button size="lg" className="px-8">Start an Episode</Button>
                </Link>
                <Link href={ROUTES.NEGOTIATIONS}>
                  <Button size="lg" variant="secondary" className="px-8">View Dashboard</Button>
                </Link>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { step: '01', title: 'Define the buyer', text: 'Add shopping list, budgets, and quantity constraints.' },
                { step: '02', title: 'Select sellers', text: 'Choose seller strategies and inventory coverage.' },
                { step: '03', title: 'Review outcomes', text: 'Compare offers, rewards, and the final deal.' },
              ].map((item, index) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-neutral-200 p-4 interactive-tile animate-fade-up"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <p className="text-xs text-neutral-400">{item.step}</p>
                  <h3 className="mt-2 text-sm font-semibold text-neutral-900">{item.title}</h3>
                  <p className="mt-2 text-xs text-neutral-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-neutral-200">
          <div className="text-center text-sm text-neutral-500">
            <p className="mb-2">
              Built for the Snapdragon Multiverse Hackathon 2026 at Columbia University
            </p>
            <p className="text-xs text-neutral-500">
              Qualcomm Snapdragon X Elite - On-device AI inference - No cloud dependency required
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
