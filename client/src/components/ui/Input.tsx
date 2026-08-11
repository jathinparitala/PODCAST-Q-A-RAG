import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isAuthForm?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  isAuthForm = false,
  leftIcon,
  rightIcon,
  className,
  id,
  type = 'text',
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const heightClass = isAuthForm ? 'h-[56px] text-base px-4 rounded-lg' : 'h-[48px] text-sm px-3.5 rounded-md';

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center justify-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={clsx(
            'w-full bg-white dark:bg-slate-900 border transition-colors duration-150',
            'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            error
              ? 'border-danger focus:ring-danger focus:border-danger'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
            leftIcon && (isAuthForm ? 'pl-11' : 'pl-10'),
            rightIcon && (isAuthForm ? 'pr-11' : 'pr-10'),
            heightClass,
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 flex items-center justify-center text-slate-400 dark:text-slate-500">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs font-medium text-danger mt-0.5">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
