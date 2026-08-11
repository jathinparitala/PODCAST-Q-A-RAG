import React, { useState } from 'react';
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { api } from '../../../services/api';

export const ResetPasswordForm: React.FC<{ token: string; onSuccess: () => void; }> = ({ token, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (newPassword !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setErrorMsg('Password must be at least 8 characters.'); return; }
    setIsLoading(true);
    try {
      const res = await api.resetPassword({ token, newPassword });
      setSuccessMsg(res.message);
      setTimeout(onSuccess, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {errorMsg && <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2.5 text-xs font-medium text-red-700 dark:text-red-300"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>}
      {successMsg && <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle className="w-4 h-4 shrink-0" /><span>{successMsg}</span></div>}
      <div>
        <Input label="New password" type={showPassword ? 'text' : 'password'} placeholder="Enter new password" value={newPassword} onChange={e => setNewPassword(e.target.value)} isAuthForm leftIcon={<Lock className="w-5 h-5" />}
          rightIcon={<button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 hover:text-slate-700 dark:hover:text-slate-200" tabIndex={-1}>{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>}
          autoComplete="new-password" required />
        <PasswordStrengthMeter password={newPassword} />
      </div>
      <Input label="Confirm password" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} isAuthForm leftIcon={<Lock className="w-5 h-5" />} autoComplete="new-password" required />
      <Button type="submit" variant="primary" size="auth" isLoading={isLoading}>Reset Password</Button>
    </form>
  );
};
