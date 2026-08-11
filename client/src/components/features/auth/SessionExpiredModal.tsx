import React from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { ShieldAlert } from 'lucide-react';

export const SessionExpiredModal: React.FC<{ isOpen: boolean; onReauth: () => void }> = ({ isOpen, onReauth }) => (
  <Modal isOpen={isOpen} onClose={onReauth} maxWidth="sm" showCloseButton={false}>
    <div className="flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
        <ShieldAlert className="w-7 h-7 text-amber-600" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Session Expired</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">Your session has expired for security. Please sign in again.</p>
      <Button variant="primary" size="default" onClick={onReauth} className="w-full mt-2">Sign In Again</Button>
    </div>
  </Modal>
);
