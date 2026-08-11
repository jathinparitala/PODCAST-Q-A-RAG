import React, { useState } from 'react';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { api } from '../../../services/api';

export const ForgotPasswordForm: React.FC<{ onNavigateLogin: () => void; onSimulateTokenReceived: (token: string) => void; }> = ({ onNavigateLogin, onSimulateTokenReceived }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    if (!email.trim()) { setErrorMsg('Email is required.'); return; }
    setIsLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setSuccessMsg(res.message);
      if (res.resetToken) { setTimeout(() => onSimulateTokenReceived(res.resetToken!), 1500); }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {errorMsg && <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2.5 text-xs font-medium text-red-700 dark:text-red-300"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>}
      {successMsg && <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle className="w-4 h-4 shrink-0" /><span>{successMsg}</span></div>}
      <Input label="Email address" type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} isAuthForm leftIcon={<Mail className="w-5 h-5" />} autoComplete="email" required />
      <Button type="submit" variant="primary" size="auth" isLoading={isLoading}>Send Reset Instructions</Button>
      <div className="text-center text-xs text-slate-500 dark:text-slate-400">
        <button type="button" onClick={onNavigateLogin} className="font-bold text-brand-600 dark:text-brand-400 hover:underline">← Back to Sign In</button>
      </div>
    </form>
  );
};
