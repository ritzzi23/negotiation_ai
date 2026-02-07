import React from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'pending' | 'active' | 'completed' | 'failed' | 'warning' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'info', className }: BadgeProps) {
  const variantClasses = {
    pending: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    active: 'bg-primary-50 text-primary-700 border-primary-100',
    completed: 'bg-secondary-50 text-secondary-700 border-secondary-100',
    failed: 'bg-danger-50 text-danger-700 border-danger-100',
    warning: 'bg-warning-50 text-warning-700 border-warning-100',
    info: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

