'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface TerminalTypingTextProps {
  text: string | string[];
  loop?: boolean;
  cursor?: boolean;
  duration?: number;
  holdDelay?: number;
  className?: string;
}

export function TerminalTypingText({
  text,
  loop = false,
  cursor = true,
  duration = 80,
  holdDelay = 2000,
  className = '',
}: TerminalTypingTextProps) {
  const texts = Array.isArray(text) ? text : [text];
  const [displayText, setDisplayText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!cursor) return;
    const interval = setInterval(() => setShowCursor((prev) => !prev), 530);
    return () => clearInterval(interval);
  }, [cursor]);

  const tick = useCallback(() => {
    const currentText = texts[textIndex];

    if (!isDeleting) {
      if (displayText.length < currentText.length) {
        setDisplayText(currentText.slice(0, displayText.length + 1));
        timeoutRef.current = setTimeout(tick, duration);
      } else {
        if (loop || textIndex < texts.length - 1) {
          timeoutRef.current = setTimeout(() => {
            setIsDeleting(true);
            tick();
          }, holdDelay);
        }
      }
    } else {
      if (displayText.length > 0) {
        setDisplayText(displayText.slice(0, -1));
        timeoutRef.current = setTimeout(tick, duration / 2);
      } else {
        setIsDeleting(false);
        setTextIndex((prev) => (prev + 1) % texts.length);
      }
    }
  }, [displayText, isDeleting, textIndex, texts, duration, holdDelay, loop]);

  useEffect(() => {
    timeoutRef.current = setTimeout(tick, duration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [tick, duration]);

  return (
    <span className={className}>
      {displayText}
      {cursor && (
        <span
          className={`inline-block w-[3px] h-[1em] bg-current ml-0.5 align-text-bottom transition-opacity ${
            showCursor ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </span>
  );
}
