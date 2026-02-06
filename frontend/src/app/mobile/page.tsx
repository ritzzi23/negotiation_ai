'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL, API_PREFIX } from '@/lib/constants';

interface DealNotification {
  item_name: string;
  winner_seller?: string;
  final_price?: number;
  effective_price?: number;
  total_savings?: number;
  card_tip: string;
  status: string;
  summary: string;
}

interface ConstraintForm {
  item_name: string;
  max_budget: string;
  quantity: string;
  notes: string;
}

export default function MobileCompanion() {
  const [sessionId, setSessionId] = useState('');
  const [paired, setPaired] = useState(false);
  const [notifications, setNotifications] = useState<DealNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'scan' | 'deals' | 'wallet'>('scan');
  const [constraint, setConstraint] = useState<ConstraintForm>({
    item_name: '', max_budget: '', quantity: '1', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Poll for deal updates when paired
  useEffect(() => {
    if (paired && sessionId) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}${API_PREFIX}/mobile/session/${sessionId}/status`);
          if (res.ok) {
            const data = await res.json();
            setNotifications(data.notifications || []);
          }
        } catch { /* ignore polling errors */ }
      }, 3000);
      setPollInterval(interval);
      return () => clearInterval(interval);
    }
  }, [paired, sessionId]);

  const handlePair = async () => {
    if (!sessionId.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/mobile/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (res.ok) {
        setPaired(true);
        setActiveTab('deals');
      }
    } catch (err) {
      alert('Could not connect to PC. Make sure the backend is running.');
    }
  };

  const handleSubmitConstraint = async () => {
    if (!constraint.item_name || !constraint.max_budget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/mobile/constraints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: constraint.item_name,
          max_budget: parseFloat(constraint.max_budget),
          quantity: parseInt(constraint.quantity) || 1,
          notes: constraint.notes || null,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
        setConstraint({ item_name: '', max_budget: '', quantity: '1', notes: '' });
      }
    } catch (err) {
      alert('Failed to send. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Mobile Header */}
      <header className="bg-gradient-to-r from-blue-900 to-purple-900 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold">DealForge</span>
          <span className="text-[10px] text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded-full">Mobile</span>
        </div>
        {paired && (
          <span className="flex items-center text-xs text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
            Connected
          </span>
        )}
      </header>

      {/* Pairing Screen */}
      {!paired && (
        <div className="flex flex-col items-center justify-center p-8 min-h-[calc(100vh-56px)]">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
            <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Pair with PC</h2>
          <p className="text-slate-400 text-sm text-center mb-8 max-w-xs">
            Enter the session ID from your DealForge PC dashboard to sync
          </p>
          <input
            type="text"
            placeholder="Paste Session ID"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 mb-4 text-center font-mono text-sm"
          />
          <button
            onClick={handlePair}
            disabled={!sessionId.trim()}
            className="w-full max-w-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl py-3 font-semibold disabled:opacity-50 transition-all"
          >
            Connect
          </button>
          <p className="text-xs text-slate-600 mt-6 text-center">
            Or scan constraints below without pairing
          </p>
          <button
            onClick={() => { setPaired(true); setActiveTab('scan'); }}
            className="mt-2 text-blue-400 text-sm underline"
          >
            Skip pairing &rarr; Quick Scan
          </button>
        </div>
      )}

      {/* Main Content (Paired) */}
      {paired && (
        <div className="pb-20">
          {/* Tab Content */}
          {activeTab === 'scan' && (
            <div className="p-4 space-y-4">
              <h2 className="text-xl font-bold">Quick Capture</h2>
              <p className="text-sm text-slate-400">Paste a product link or enter details to send to your PC agent</p>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="What are you looking for? (e.g., MacBook Pro M3)"
                  value={constraint.item_name}
                  onChange={(e) => setConstraint({ ...constraint, item_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Max Budget ($)"
                    value={constraint.max_budget}
                    onChange={(e) => setConstraint({ ...constraint, max_budget: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={constraint.quantity}
                    onChange={(e) => setConstraint({ ...constraint, quantity: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                  />
                </div>
                <textarea
                  placeholder="Notes (optional) - e.g., prefer new condition, need warranty"
                  value={constraint.notes}
                  onChange={(e) => setConstraint({ ...constraint, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none"
                />
                <button
                  onClick={handleSubmitConstraint}
                  disabled={submitting || !constraint.item_name || !constraint.max_budget}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50 transition-all flex items-center justify-center"
                >
                  {submitting ? (
                    <span className="flex items-center"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>Sending...</span>
                  ) : (
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send to PC Agent
                    </span>
                  )}
                </button>
                {submitted && (
                  <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-3 text-green-300 text-sm text-center">
                    Sent to your PC! Check the dashboard for live negotiations.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'deals' && (
            <div className="p-4 space-y-4">
              <h2 className="text-xl font-bold">Deal Results</h2>
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-4xl mb-4">⏳</div>
                  <p>Waiting for negotiations to complete...</p>
                  <p className="text-xs mt-2">Results will appear here in real-time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-4 border ${
                        n.status === 'deal'
                          ? 'bg-green-900/20 border-green-700/50'
                          : n.status === 'in_progress'
                          ? 'bg-blue-900/20 border-blue-700/50'
                          : 'bg-red-900/20 border-red-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{n.item_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          n.status === 'deal' ? 'bg-green-500/20 text-green-300' :
                          n.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {n.status === 'deal' ? 'Deal!' : n.status === 'in_progress' ? 'In Progress' : 'No Deal'}
                        </span>
                      </div>
                      {n.final_price && (
                        <div className="text-2xl font-bold text-green-400 mb-1">${n.final_price.toFixed(2)}</div>
                      )}
                      {n.winner_seller && (
                        <p className="text-sm text-slate-300">from {n.winner_seller}</p>
                      )}
                      {n.card_tip && (
                        <p className="text-xs text-purple-300 mt-2">{n.card_tip}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{n.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="p-4 space-y-4">
              <h2 className="text-xl font-bold">Credit Card Wallet</h2>
              <p className="text-sm text-slate-400">Your cards are factored into every deal analysis</p>
              {[
                { name: 'Chase Sapphire Preferred', issuer: 'Chase', color: 'from-blue-600 to-blue-800', rewards: '5% travel, 3% dining, 2% electronics' },
                { name: 'Amex Blue Cash Preferred', issuer: 'Amex', color: 'from-purple-600 to-purple-800', rewards: '6% groceries, 3% electronics' },
                { name: 'Discover it Cash Back', issuer: 'Discover', color: 'from-orange-600 to-orange-800', rewards: '5% electronics (rotating), 1% everything' },
              ].map((card, i) => (
                <div key={i} className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 shadow-lg`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs text-white/60 font-medium">{card.issuer}</span>
                    <svg className="w-8 h-8 text-white/30" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                    </svg>
                  </div>
                  <div className="text-lg font-bold text-white mb-1">{card.name}</div>
                  <div className="text-xs text-white/60">{card.rewards}</div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Tab Bar */}
          <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex">
            {[
              { id: 'scan' as const, label: 'Scan', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' },
              { id: 'deals' as const, label: 'Deals', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              { id: 'wallet' as const, label: 'Wallet', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 flex flex-col items-center ${
                  activeTab === tab.id ? 'text-blue-400' : 'text-slate-500'
                }`}
              >
                <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span className="text-[10px]">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
