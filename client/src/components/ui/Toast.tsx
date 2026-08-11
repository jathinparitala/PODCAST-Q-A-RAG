import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

let toastIdCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
  };

  const borders = {
    success: 'border-emerald-200 dark:border-emerald-800',
    error: 'border-red-200 dark:border-red-800',
    info: 'border-blue-200 dark:border-blue-800',
    warning: 'border-amber-200 dark:border-amber-800',
  };

  return (
    <div className={clsx(
      'pointer-events-auto bg-white dark:bg-slate-900 border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-up',
      borders[toast.type]
    )}>
      <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
      <p className="text-sm text-slate-700 dark:text-slate-200 flex-1">{toast.message}</p>
      <button onClick={onDismiss} className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
