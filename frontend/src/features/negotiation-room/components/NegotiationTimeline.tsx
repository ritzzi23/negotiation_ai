'use client';

import { useMemo } from 'react';
import { useNegotiation } from '@/store/negotiationStore';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { formatCurrency, formatDuration, formatTimestamp } from '@/utils/formatters';

interface NegotiationTimelineProps {
  roomId: string;
}

export function NegotiationTimeline({ roomId }: NegotiationTimelineProps) {
  const { rooms } = useNegotiation();
  const timeline = rooms[roomId]?.roundTimeline || [];

  const sortedTimeline = useMemo(
    () => [...timeline].sort((a, b) => a.round - b.round),
    [timeline]
  );

  if (sortedTimeline.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Negotiation Timeline</h2>
            <p className="text-sm text-neutral-600">Round-by-round activity</p>
          </div>
          <Badge variant="pending">Waiting</Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card
      header={
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Negotiation Timeline</h2>
          <p className="text-sm text-neutral-600">Round-by-round activity</p>
        </div>
      }
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {sortedTimeline.map((entry) => (
          <div
            key={entry.round}
            className="min-w-[220px] rounded-2xl border border-neutral-200 bg-white p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Round {entry.round}</p>
                {entry.startedAt && (
                  <p className="text-xs text-neutral-500 mt-1">Started {formatTimestamp(entry.startedAt, 'h:mm a')}</p>
                )}
              </div>
              <Badge variant="active">Live</Badge>
            </div>

            <div className="mt-3 space-y-2">
              <div>
                <p className="text-xs text-neutral-500">Seller responses</p>
                {entry.sellerResponses.length === 0 ? (
                  <p className="text-sm text-neutral-700">Waiting...</p>
                ) : (
                  <div className="space-y-1">
                    {entry.sellerResponses.map((response) => (
                      <div key={`${response.sellerId}-${response.responseMs}`} className="text-xs text-neutral-700">
                        <span className="font-medium">{response.sellerName}</span>
                        <span className="text-neutral-500"> · {formatDuration(response.responseMs / 1000)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-neutral-500">Best offer</p>
                {entry.bestOffer ? (
                  <p className="text-sm font-semibold text-neutral-900">
                    {entry.bestOffer.sellerName} · {formatCurrency(entry.bestOffer.price)}/unit
                  </p>
                ) : (
                  <p className="text-sm text-neutral-700">Pending</p>
                )}
              </div>

              {typeof entry.cardSavings === 'number' && (
                <div>
                  <p className="text-xs text-neutral-500">Card savings</p>
                  <p className="text-sm font-semibold text-secondary-700">
                    {formatCurrency(entry.cardSavings)}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
