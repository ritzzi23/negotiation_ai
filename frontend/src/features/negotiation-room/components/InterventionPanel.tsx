'use client';

import React from 'react';
import { Button } from '@/components/Button';
import type { NegotiationMode } from './NegotiationModeSelector';

interface InterventionPanelProps {
  isActive: boolean;
  isPaused: boolean;
  mode: NegotiationMode;
  onPause: () => void;
  onResume: () => void;
  onTakeOver: () => void;
  onContinueWithAI: () => void;
  onForceDecision: () => void;
}

export function InterventionPanel({
  isActive,
  isPaused,
  mode,
  onPause,
  onResume,
  onTakeOver,
  onContinueWithAI,
  onForceDecision,
}: InterventionPanelProps) {
  if (!isActive) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <span className="text-xs font-medium text-neutral-500 mr-1">Controls:</span>

      {isPaused ? (
        <Button size="sm" variant="secondary" onClick={onResume}>
          Resume
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={onPause}>
          Pause
        </Button>
      )}

      {mode === 'auto' || mode === 'approval' ? (
        <Button size="sm" variant="secondary" onClick={onTakeOver}>
          Take Over
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={onContinueWithAI}>
          Continue with AI
        </Button>
      )}

      <Button size="sm" variant="secondary" onClick={onForceDecision}>
        Let Me Decide
      </Button>
    </div>
  );
}
