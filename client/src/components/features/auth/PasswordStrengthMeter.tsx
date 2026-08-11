import React from 'react';
import { clsx } from 'clsx';

interface Criteria { hasMinLength: boolean; hasUppercase: boolean; hasLowercase: boolean; hasNumber: boolean; hasSpecial: boolean; }

export const PasswordStrengthMeter: React.FC<{ password: string }> = ({ password }) => {
  const c: Criteria = {
    hasMinLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(c).filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'];
  const textColors = ['', 'text-red-600', 'text-orange-600', 'text-amber-600', 'text-emerald-600', 'text-emerald-700'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={clsx('h-1 flex-1 rounded-full transition-colors', i <= score ? colors[score] : 'bg-slate-200 dark:bg-slate-700')} />
        ))}
      </div>
      <p className={clsx('text-xs font-medium', textColors[score])}>{labels[score]}</p>
      <div className="grid grid-cols-2 gap-1 text-xs">
        {[
          { key: 'hasMinLength', label: '8+ characters' },
          { key: 'hasUppercase', label: 'Uppercase letter' },
          { key: 'hasLowercase', label: 'Lowercase letter' },
          { key: 'hasNumber', label: 'Number' },
          { key: 'hasSpecial', label: 'Special character' },
        ].map(item => (
          <span key={item.key} className={clsx(c[item.key as keyof Criteria] ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>
            {c[item.key as keyof Criteria] ? '✓' : '○'} {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};
