import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { api, User } from '../../../services/api';
import { useToast } from '../../ui/Toast';

export const LoginForm: React.FC<{ onSuccess: (user: User) => void; onNavigateRegister: () => void; onNavigateForgotPassword: () => void; }> = ({ onSuccess, onNavigateRegister, onNavigateForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !password) { setErrorMsg('Please enter both email and password.'); return; }
    setIsLoading(true);
    try {
      const res = await api.login({ email, password, rememberMe });
      showToast('Welcome back! Successfully authenticated.', 'success');
      onSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {errorMsg && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2.5 text-xs font-medium text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span>
        </div>
      )}
      <Input label="Email address" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} isAuthForm leftIcon={<Mail className="w-5 h-5" />} autoComplete="email" required />
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
          <button type="button" onClick={onNavigateForgotPassword} className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">Forgot password?</button>
        </div>
        <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} isAuthForm leftIcon={<Lock className="w-5 h-5" />}
          rightIcon={<button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 hover:text-slate-700 dark:hover:text-slate-200" tabIndex={-1}>{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>}
          autoComplete="current-password" required />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        <span>Remember me on this device</span>
      </label>
      <Button type="submit" variant="primary" size="auth" isLoading={isLoading} className="mt-2">Sign in to Account</Button>
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
        Don't have an account?{' '}<button type="button" onClick={onNavigateRegister} className="font-bold text-brand-600 dark:text-brand-400 hover:underline">Create free account</button>
      </div>
    </form>
  );
};
