'use client';

import React, { useState } from 'react';
import { Button } from '@/components/Button';

interface MessageInputProps {
  onSend: (message: string) => void;
  onApprove?: () => void;
  onEdit?: (editedMessage: string) => void;
  onSkip?: () => void;
  pendingMessage?: string | null;
  mode: 'manual' | 'approval';
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onApprove,
  onEdit,
  onSkip,
  pendingMessage,
  mode,
  disabled = false,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleSend = () => {
    const text = message.trim();
    if (!text) return;
    onSend(text);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (mode === 'approval' && pendingMessage) {
    return (
      <div className="border-t border-neutral-200 bg-neutral-50 p-4 rounded-b-xl">
        <p className="text-xs font-medium text-neutral-500 mb-2">AI suggests:</p>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm resize-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              rows={3}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => { onEdit?.(editedMessage); setIsEditing(false); }}>
                Send Edited
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="bg-white rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800">
              {pendingMessage}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={onApprove} disabled={disabled}>
                Approve
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setEditedMessage(pendingMessage); setIsEditing(true); }}
              >
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={onSkip}>
                Skip
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'manual') {
    return (
      <div className="border-t border-neutral-200 bg-neutral-50 p-4 rounded-b-xl">
        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm resize-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            rows={2}
            disabled={disabled}
          />
          <Button size="sm" onClick={handleSend} disabled={disabled || !message.trim()}>
            Send
          </Button>
        </div>
        <p className="text-xs text-neutral-400 mt-1">Press Enter to send, Shift+Enter for new line</p>
      </div>
    );
  }

  return null;
}
