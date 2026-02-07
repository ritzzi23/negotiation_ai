'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatCurrency } from '@/utils/formatters';
import { listSessions } from '@/lib/api/simulation';
import type { SessionListItem } from '@/lib/types';

export default function SessionHistoryPage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await listSessions();
        setSessions(response.sessions);
      } catch (err: any) {
        console.error('Failed to load sessions:', err);
        setError(err.message || 'Failed to load session history');
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading session history..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container-custom py-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Session History</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">Past episodes</h1>
          <p className="text-sm text-neutral-600 mt-2">
            {sessions.length === 0
              ? 'No sessions yet. Start a negotiation to see it here.'
              : `${sessions.length} session${sessions.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-danger-50 text-danger-700 rounded-lg p-4 text-sm border border-danger-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map((session) => (
            <Card
              key={session.session_id}
              header={
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500">Session</p>
                    <p className="text-sm font-semibold text-neutral-900">{session.session_id.slice(0, 12)}...</p>
                  </div>
                  <Badge variant={session.status === 'completed' ? 'completed' : 'active'}>
                    {session.status === 'completed' ? 'Completed' : 'Active'}
                  </Badge>
                </div>
              }
            >
              <div className="space-y-3">
                {session.buyer_name && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Buyer</span>
                    <span className="font-semibold text-neutral-900">{session.buyer_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Items</span>
                  <span className="font-semibold text-neutral-900">
                    {session.completed_runs}/{session.total_runs}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Savings</span>
                  <span className="font-semibold text-secondary-700">
                    {formatCurrency(session.total_savings)}
                  </span>
                </div>
                {session.llm_model && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Model</span>
                    <span className="text-neutral-700 text-xs font-mono">{session.llm_model}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Created</span>
                  <span className="text-neutral-700">{new Date(session.created_at).toLocaleString()}</span>
                </div>
                <div className="pt-2">
                  <Button variant="secondary" className="w-full" onClick={() => window.location.href = `/summary?session=${session.session_id}`}>
                    View details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
