'use client';

import React from 'react';

export type NegotiationMode = 'auto' | 'approval' | 'manual';

interface NegotiationModeSelectorProps {
  mode: NegotiationMode;
  onModeChange: (mode: NegotiationMode) => void;
  disabled?: boolean;
}

const modes: { value: NegotiationMode; label: string; description: string }[] = [
  { value: 'auto', label: 'Full AI', description: 'AI auto-negotiates all rounds' },
  { value: 'approval', label: 'Per-Message', description: 'Approve each AI message' },
  { value: 'manual', label: 'Manual', description: 'Type messages yourself' },
];

export function NegotiationModeSelector({ mode, onModeChange, disabled }: NegotiationModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-neutral-100 p-1">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onModeChange(m.value)}
          disabled={disabled}
          title={m.description}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === m.value
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
