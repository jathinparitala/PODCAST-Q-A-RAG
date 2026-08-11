import React from 'react';
import { Mic } from 'lucide-react';

export interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 font-body">
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md mb-3">
          <Mic className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          PodcastQ&A
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          AI-powered transcript research & citation engine
        </p>
      </div>
      <div className="w-full max-w-[460px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[20px] shadow-lg p-8 sm:p-10 transition-all">
        <div className="mb-6 text-center sm:text-left">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
        </div>
        {children}
      </div>
      <div className="mt-8 flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
        <a href="#terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms of Service</a>
        <span>•</span>
        <a href="#privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy Policy</a>
        <span>•</span>
        <a href="#security" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Security Overview</a>
      </div>
    </div>
  );
};
