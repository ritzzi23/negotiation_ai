'use client';

import Link from 'next/link';
import { useSession } from '@/store/sessionStore';
import { Button } from '@/components/Button';
import { ROUTES } from '@/lib/router';

export default function LandingPage() {
  const { session } = useSession();
  const hasSession = !!session?.session_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-purple-950">
      <div className="container-custom">
        {/* Header/Nav */}
        <header className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">DealForge</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs font-mono text-blue-300 bg-blue-900/50 px-3 py-1 rounded-full border border-blue-700/50">
                Powered by Snapdragon X Elite
              </span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center py-12">
          <div className="max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-900/80 to-purple-900/80 border border-blue-700/50 mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              <span className="text-sm text-blue-200">On-Device AI &bull; NPU Accelerated &bull; Real-Time Streaming</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Your AI Negotiates.
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mt-2">
                You Get The Best Deal.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Set your constraints once. Your AI agent negotiates with up to 10 sellers simultaneously,
              factors in your credit card rewards, and returns the optimal deal with full transparency.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:border-blue-500/50 transition-all">
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="text-sm font-semibold text-white mb-1">10 Parallel Agents</h3>
                <p className="text-xs text-slate-400">Negotiate with 10 sellers at once</p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:border-purple-500/50 transition-all">
                <div className="text-3xl mb-3">💳</div>
                <h3 className="text-sm font-semibold text-white mb-1">Card Rewards</h3>
                <p className="text-xs text-slate-400">Factors in your credit card cashback</p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:border-pink-500/50 transition-all">
                <div className="text-3xl mb-3">📱</div>
                <h3 className="text-sm font-semibold text-white mb-1">Multi-Device</h3>
                <p className="text-xs text-slate-400">PC dashboard + phone companion</p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:border-green-500/50 transition-all">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="text-sm font-semibold text-white mb-1">On-Device LLM</h3>
                <p className="text-xs text-slate-400">Runs locally on Snapdragon NPU</p>
              </div>
            </div>

            {/* Role selection / CTA */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-slate-300 text-sm font-medium">Choose your role</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href={ROUTES.ADMIN}>
                  <Button
                    size="lg"
                    className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white"
                  >
                    Admin
                  </Button>
                </Link>
                <Link href={ROUTES.SELLER}>
                  <Button
                    size="lg"
                    className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white"
                  >
                    Seller
                  </Button>
                </Link>
                <Link href={ROUTES.BUYER}>
                  <Button
                    size="lg"
                    className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white"
                  >
                    Buyer
                  </Button>
                </Link>
                {hasSession && (
                  <Link href={ROUTES.NEGOTIATIONS}>
                    <Button
                      size="lg"
                      className="px-8 py-4 shadow-2xl shadow-blue-500/25 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
                    >
                      Negotiations
                    </Button>
                  </Link>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Admin: run session, clear/export/import data. Seller: add bots. Buyer: add agents.
              </p>
            </div>

            {/* Tech Stack */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> FastAPI + LangGraph
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> Next.js 14
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> LM Studio (Qwen3)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full"></span> SSE Streaming
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Snapdragon NPU
              </span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-white/10">
          <div className="text-center text-sm text-slate-500">
            <p className="mb-2">
              Built for the{' '}
              <span className="font-semibold text-blue-400">Snapdragon Multiverse Hackathon 2026</span>
              {' '}at Columbia University
            </p>
            <p className="text-xs text-slate-600">
              Powered by Qualcomm Snapdragon X Elite &bull; On-device AI inference &bull; No cloud dependency required
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
