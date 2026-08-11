import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { EmailVerificationBanner } from '../auth/EmailVerificationBanner';
import { SettingsModal } from '../modals/SettingsModal';
import { User, Conversation, api } from '../../../services/api';

export interface AppLayoutProps {
  user: User; onUpdateUser: (user: User) => void; onLogout: () => void;
  activeTab: string; onTabChange: (tabId: string) => void;
  children: React.ReactNode;
  conversations: Conversation[]; onSelectConversation: (id: string) => void; selectedConversationId?: string;
  onNewChat: () => void; onRefreshConversations: () => void;
  searchQuery: string; onSearchChange: (q: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  user, onUpdateUser, onLogout, activeTab, onTabChange, children,
  conversations, onSelectConversation, selectedConversationId, onNewChat, onRefreshConversations,
  searchQuery, onSearchChange,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-body text-slate-900 dark:text-slate-100">
      <EmailVerificationBanner isVerified={user.isVerified} onVerified={() => onUpdateUser({ ...user, isVerified: true })} />
      <div className="flex flex-1 w-full relative">
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} isOpenMobile={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)} onLogout={onLogout} userName={user.name}
          conversations={conversations} onSelectConversation={onSelectConversation} selectedConversationId={selectedConversationId} onNewChat={onNewChat} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header onOpenMobileMenu={() => setIsMobileSidebarOpen(true)} userName={user.name} searchQuery={searchQuery} onSearchChange={onSearchChange} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} onUpdateUser={onUpdateUser} onLogout={onLogout} />
    </div>
  );
};
