import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, subtitle, children, maxWidth = 'md', showCloseButton = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-[440px]',
    md: 'max-w-[540px]',
    lg: 'max-w-[640px]',
    xl: 'max-w-[760px]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200" onClick={onClose} />
      <div className={clsx(
        'relative w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-10 p-8 transform transition-all duration-200 animate-fade-in',
        maxWidths[maxWidth]
      )}>
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              {title && <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>}
              {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
            </div>
            {showCloseButton && (
              <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" aria-label="Close modal">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};
