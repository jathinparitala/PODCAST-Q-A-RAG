import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Tabs } from '../../ui/Tabs';
import { User, api } from '../../../services/api';
import { useToast } from '../../ui/Toast';
import { User as UserIcon, Shield, Palette } from 'lucide-react';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User; onUpdateUser: (u: User) => void; onLogout: () => void }> = ({ isOpen, onClose, user, onUpdateUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { showToast } = useToast();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  ];

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      const res = await api.updateProfile({ name });
      onUpdateUser(res.user);
      showToast('Profile updated!', 'success');
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsUpdating(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setIsUpdating(true);
    try {
      await api.updatePassword({ currentPassword, newPassword });
      showToast('Password updated!', 'success');
      setCurrentPassword(''); setNewPassword('');
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsUpdating(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" maxWidth="lg">
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} className="mb-6" />

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-2xl font-bold text-brand-700 dark:text-brand-300">{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
              <p className="text-xs text-slate-400 mt-1">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <Input label="Display name" value={name} onChange={e => setName(e.target.value)} />
          <div className="flex justify-between items-center pt-2">
            <Button variant="primary" size="default" onClick={handleUpdateProfile} isLoading={isUpdating}>Save Changes</Button>
            <Button variant="ghost" size="default" onClick={onLogout} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">Sign Out</Button>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-5">
          <Input label="Current password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" />
          <Input label="New password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
          <Button variant="primary" size="default" onClick={handleChangePassword} isLoading={isUpdating} disabled={!currentPassword || !newPassword}>Update Password</Button>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Theme preferences coming soon. The app follows your system preference for dark/light mode.</p>
        </div>
      )}
    </Modal>
  );
};
