import React from 'react';
import { clsx } from 'clsx';
import { Mic, Library, FileText, MessageSquare, ScrollText, Settings, X, LogOut, Plus } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Conversation } from '../../../services/api';
import { audioService } from '../../../utils/audio';

export interface SidebarProps {
  activeTab: string; onTabChange: (tabId: string) => void; isOpenMobile: boolean; onCloseMobile: () => void;
  onOpenSettings: () => void; onLogout: () => void; userName?: string;
  conversations: Conversation[]; onSelectConversation: (id: string) => void; selectedConversationId?: string;
  onNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isOpenMobile, onCloseMobile, onOpenSettings, onLogout, userName = 'User', conversations, onSelectConversation, selectedConversationId, onNewChat }) => {
  const navItems = [
    { id: 'library', label: 'Podcast Library', icon: Library },
    { id: 'documents', label: 'PDF Documents', icon: FileText },
    { id: 'chat', label: 'Q&A Chat', icon: MessageSquare },
    { id: 'transcript', label: 'Transcript Viewer', icon: ScrollText },
  ];

  return (
    <>
      {isOpenMobile && <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden" onClick={onCloseMobile} />}
      <aside className={clsx(
        'fixed lg:sticky top-0 left-0 z-40 h-screen w-[300px] bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between p-6 transition-transform duration-300 ease-in-out shrink-0',
        isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex flex-col gap-6 min-h-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('library')}>
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 tracking-tight leading-tight">PodcastQ&A</h2>
                <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">RAG Engine</span>
              </div>
            </div>
            <button onClick={onCloseMobile} className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"><X className="w-5 h-5" /></button>
          </div>

          <Button variant="primary" size="default" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { onNewChat(); onCloseMobile(); }} className="w-full shadow-md">
            New Q&A Chat
          </Button>

          <nav className="flex flex-col gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'chat' && activeTab === 'chat');
              return (
                <button key={item.id} onClick={() => { audioService.playClick(); onTabChange(item.id); onCloseMobile(); }}
                  className={clsx('h-[44px] w-full px-3.5 flex items-center gap-3 rounded-xl text-sm font-medium transition-all select-none',
                    isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-semibold border border-brand-200/60 dark:border-brand-800/60 shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                  )}>
                  <Icon className={clsx('w-5 h-5', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Conversation History */}
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">Recent Conversations</h3>
            <div className="flex-1 overflow-y-auto space-y-0.5">
              {conversations.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 px-2 py-3">No conversations yet. Start a new Q&A chat!</p>}
              {conversations.slice(0, 20).map(conv => (
                <button key={conv.id} onClick={() => { onSelectConversation(conv.id); onCloseMobile(); }}
                  className={clsx('w-full px-3 py-2.5 rounded-lg text-left transition-colors group',
                    selectedConversationId === conv.id ? 'bg-brand-50 dark:bg-brand-950/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  )}>
                  <p className={clsx('text-sm truncate', selectedConversationId === conv.id ? 'font-semibold text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300')}>{conv.title}</p>
                  {(conv.documentName || conv.episodeTitle) && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {conv.documentName ? `📄 ${conv.documentName}` : `🎙️ ${conv.episodeTitle}`}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
          <button onClick={onOpenSettings} className="h-[48px] w-full px-3 flex items-center justify-between rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 truncate">Account Settings</p>
              </div>
            </div>
            <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0" />
          </button>
          <button onClick={onLogout} className="h-9 w-full px-3 flex items-center gap-2.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
            <LogOut className="w-4 h-4" /><span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
