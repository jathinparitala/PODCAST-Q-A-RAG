import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'processing';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'sm', className, dot }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    danger: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
    processing: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  };

  const dotColors: Record<string, string> = {
    default: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    processing: 'bg-amber-500 animate-pulse',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 font-medium rounded-full',
      variants[variant],
      sizes[size],
      className
    )}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};
