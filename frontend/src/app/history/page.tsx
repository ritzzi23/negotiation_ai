'use client';

import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/utils/formatters';

const mockSessions = [
  {
    id: 'session_a1b2c3d4',
    created_at: '2026-02-05T10:12:00Z',
    items: 4,
    completed: 3,
    total_savings: 48.25,
    status: 'completed',
  },
  {
    id: 'session_9f8e7d6c',
    created_at: '2026-02-04T16:40:00Z',
    items: 2,
    completed: 2,
    total_savings: 22.9,
    status: 'completed',
  },
  {
    id: 'session_1234abcd',
    created_at: '2026-02-03T09:05:00Z',
    items: 3,
    completed: 1,
    total_savings: 0,
    status: 'active',
  },
];

export default function SessionHistoryPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container-custom py-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Session History</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">Past episodes</h1>
          <p className="text-sm text-neutral-600 mt-2">Mock data for now. Ready to wire to backend when available.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockSessions.map((session) => (
            <Card
              key={session.id}
              header={
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500">Session</p>
                    <p className="text-sm font-semibold text-neutral-900">{session.id.slice(0, 10)}...</p>
                  </div>
                  <Badge variant={session.status === 'completed' ? 'completed' : 'active'}>
                    {session.status === 'completed' ? 'Completed' : 'Active'}
                  </Badge>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Items</span>
                  <span className="font-semibold text-neutral-900">
                    {session.completed}/{session.items}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Savings</span>
                  <span className="font-semibold text-secondary-700">
                    {formatCurrency(session.total_savings)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Created</span>
                  <span className="text-neutral-700">{new Date(session.created_at).toLocaleString()}</span>
                </div>
                <div className="pt-2">
                  <Button variant="secondary" className="w-full">View details</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
