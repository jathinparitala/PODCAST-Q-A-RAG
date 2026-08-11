import React, { useState } from 'react';
import { Menu, Search, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { audioService } from '../../../utils/audio';

export interface HeaderProps {
  onOpenMobileMenu: () => void;
  userName: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, userName, searchQuery, onSearchChange }) => {
  const [isMuted, setIsMuted] = useState(audioService.getIsMuted());
  const initial = userName ? userName.charAt(0).toUpperCase() : 'U';

  const handleToggleSound = () => {
    const nextState = audioService.toggleMute();
    setIsMuted(nextState);
    if (!nextState) {
      audioService.playClick();
    }
  };

  return (
    <header className="h-[64px] border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 gap-4 shrink-0">
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button onClick={onOpenMobileMenu} className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search podcasts, episodes, topics..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full h-[40px] pl-10 pr-12 text-sm bg-slate-100/70 dark:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Sound FX Toggle Button */}
        <button
          onClick={handleToggleSound}
          title={isMuted ? "Unmute UI Sound FX" : "Mute UI Sound FX"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-brand-500 animate-pulse" />}
          <span className="hidden sm:inline-block">{isMuted ? 'Muted' : 'Audio FX'}</span>
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center font-bold text-xs text-white shadow-sm ring-2 ring-brand-500/20">
            {initial}
          </div>
          <span className="hidden md:inline-block text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
};
