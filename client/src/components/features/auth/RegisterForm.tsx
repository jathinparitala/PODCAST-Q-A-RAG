import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { api, User } from '../../../services/api';
import { useToast } from '../../ui/Toast';

export const RegisterForm: React.FC<{ onSuccess: (user: User) => void; onNavigateLogin: () => void; }> = ({ onSuccess, onNavigateLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim() || !email.trim() || !password) { setErrorMsg('All fields are required.'); return; }
    if (password.length < 8) { setErrorMsg('Password must be at least 8 characters.'); return; }
    setIsLoading(true);
    try {
      const res = await api.register({ email, password, name });
      showToast('Account created! Welcome to PodcastQ&A.', 'success');
      onSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
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
      <Input label="Full name" type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} isAuthForm leftIcon={<UserIcon className="w-5 h-5" />} autoComplete="name" required />
      <Input label="Email address" type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} isAuthForm leftIcon={<Mail className="w-5 h-5" />} autoComplete="email" required />
      <div>
        <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} isAuthForm leftIcon={<Lock className="w-5 h-5" />}
          rightIcon={<button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 hover:text-slate-700 dark:hover:text-slate-200" tabIndex={-1}>{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>}
          autoComplete="new-password" required />
        <PasswordStrengthMeter password={password} />
      </div>
      <Button type="submit" variant="primary" size="auth" isLoading={isLoading} className="mt-2">Create Account</Button>
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
        Already have an account?{' '}<button type="button" onClick={onNavigateLogin} className="font-bold text-brand-600 dark:text-brand-400 hover:underline">Sign in</button>
      </div>
    </form>
  );
};
