import React from 'react';
import { clsx } from 'clsx';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ children, className, padding = 'md' }) => {
  const paddings = { sm: 'p-4', md: 'p-6', lg: 'p-8' };
  return (
    <div className={clsx(
      'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm',
      paddings[padding],
      className
    )}>
      {children}
    </div>
  );
};
