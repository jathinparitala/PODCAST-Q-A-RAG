import React, { useState } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { api } from '../../../services/api';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';

export const EmailVerificationBanner: React.FC<{ isVerified: boolean; onVerified: () => void }> = ({ isVerified, onVerified }) => {
  const [verificationToken, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { showToast } = useToast();

  if (isVerified || isDismissed) return null;

  const handleVerify = async () => {
    if (!verificationToken.trim()) return;
    setIsLoading(true);
    try {
      await api.verifyEmail(verificationToken);
      showToast('Email verified successfully!', 'success');
      onVerified();
    } catch (err: any) {
      showToast(err.message || 'Verification failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/50 px-4 py-2 text-xs transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Verify your email to enable full account permissions.</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Paste token"
            value={verificationToken}
            onChange={e => setToken(e.target.value)}
            className="h-7 px-2.5 text-xs border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 rounded-md w-36 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <Button size="sm" variant="primary" onClick={handleVerify} isLoading={isLoading} className="h-7 px-3 text-xs">
            Verify
          </Button>
          <button onClick={() => setIsDismissed(true)} className="p-1 text-amber-600 hover:text-amber-800 dark:hover:text-amber-200 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
