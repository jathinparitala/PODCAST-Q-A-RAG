import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/ui/Toast';
import { AuthLayout } from './components/features/auth/AuthLayout';
import { LoginForm } from './components/features/auth/LoginForm';
import { RegisterForm } from './components/features/auth/RegisterForm';
import { ForgotPasswordForm } from './components/features/auth/ForgotPasswordForm';
import { ResetPasswordForm } from './components/features/auth/ResetPasswordForm';
import { SessionExpiredModal } from './components/features/auth/SessionExpiredModal';
import { AppLayout } from './components/features/layout/AppLayout';
import { PodcastLibraryView } from './components/features/podcasts/PodcastLibraryView';
import { PdfLibraryView } from './components/features/documents/PdfLibraryView';
import { TranscriptViewer } from './components/features/transcript/TranscriptViewer';
import { ChatView } from './components/features/chat/ChatView';
import { api, User, Conversation, Episode } from './services/api';

type AuthScreen = 'login' | 'register' | 'forgot' | 'reset';

const AppContent: React.FC = () => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [resetToken, setResetToken] = useState<string>('');
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // App Navigation state
  const [activeTab, setActiveTab] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);

  // Scoped active target state for Chat / Transcript
  const [activeEpisode, setActiveEpisode] = useState<{ id: string; title: string } | null>(null);
  const [activeDocument, setActiveDocument] = useState<{ id: string; name: string } | null>(null);

  const { showToast } = useToast();

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.getMe();
        if (res.user) {
          setUser(res.user);
        }
      } catch (err: any) {
        if (err.code === 'TOKEN_EXPIRED') {
          setIsSessionExpired(true);
        }
      } finally {
        setIsInitializing(false);
      }
    };
    initAuth();
  }, []);

  // Load conversations when user is logged in
  const loadConversations = async () => {
    if (!user) return;
    try {
      const res = await api.getConversations();
      setConversations(res.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      // Ignore
    } finally {
      setUser(null);
      setSelectedConversationId(undefined);
      setActiveEpisode(null);
      setActiveDocument(null);
      showToast('Signed out successfully.', 'info');
    }
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      if (conv.documentId) {
        setActiveDocument({ id: conv.documentId, name: conv.documentName || 'PDF Document' });
        setActiveEpisode(null);
      } else if (conv.episodeId) {
        setActiveEpisode({ id: conv.episodeId, title: conv.episodeTitle || 'Episode' });
        setActiveDocument(null);
      }
    }
    setActiveTab('chat');
  };

  const handleNewChat = () => {
    setSelectedConversationId(undefined);
    setActiveEpisode(null);
    setActiveDocument(null);
    setActiveTab('chat');
  };

  const handleStartChatForEpisode = async (episodeId: string) => {
    try {
      const epRes = await api.getEpisode(episodeId);
      if (epRes.episode) {
        setActiveEpisode({ id: epRes.episode.id, title: epRes.episode.title });
        setActiveDocument(null);
        setSelectedConversationId(undefined);
        setActiveTab('chat');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load episode', 'error');
    }
  };

  const handleStartChatForDocument = (documentId: string, documentName: string) => {
    setActiveDocument({ id: documentId, name: documentName });
    setActiveEpisode(null);
    setSelectedConversationId(undefined);
    setActiveTab('chat');
  };

  const handleViewTranscriptForEpisode = async (episodeId: string) => {
    try {
      const epRes = await api.getEpisode(episodeId);
      if (epRes.episode) {
        setActiveEpisode({ id: epRes.episode.id, title: epRes.episode.title });
        setActiveTab('transcript');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load episode', 'error');
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading PodcastQ&A...</p>
        </div>
      </div>
    );
  }

  // ─── Unauthenticated Screens ──────────────────────────────────────────────
  if (!user) {
    return (
      <>
        {authScreen === 'login' && (
          <AuthLayout title="Welcome back" subtitle="Sign in to access your podcast Q&A engine">
            <LoginForm
              onSuccess={(u) => { setUser(u); loadConversations(); }}
              onNavigateRegister={() => setAuthScreen('register')}
              onNavigateForgotPassword={() => setAuthScreen('forgot')}
            />
          </AuthLayout>
        )}

        {authScreen === 'register' && (
          <AuthLayout title="Create account" subtitle="Start analyzing podcast transcripts & PDFs with AI">
            <RegisterForm
              onSuccess={(u) => { setUser(u); loadConversations(); }}
              onNavigateLogin={() => setAuthScreen('login')}
            />
          </AuthLayout>
        )}

        {authScreen === 'forgot' && (
          <AuthLayout title="Reset password" subtitle="Enter your email to receive recovery instructions">
            <ForgotPasswordForm
              onNavigateLogin={() => setAuthScreen('login')}
              onSimulateTokenReceived={(token) => {
                setResetToken(token);
                setAuthScreen('reset');
              }}
            />
          </AuthLayout>
        )}

        {authScreen === 'reset' && (
          <AuthLayout title="Set new password" subtitle="Create a strong password for your account">
            <ResetPasswordForm
              token={resetToken}
              onSuccess={() => setAuthScreen('login')}
            />
          </AuthLayout>
        )}

        <SessionExpiredModal
          isOpen={isSessionExpired}
          onReauth={() => setIsSessionExpired(false)}
        />
      </>
    );
  }

  // ─── Authenticated Main App ───────────────────────────────────────────────
  return (
    <AppLayout
      user={user}
      onUpdateUser={setUser}
      onLogout={handleLogout}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      conversations={conversations}
      onSelectConversation={handleSelectConversation}
      selectedConversationId={selectedConversationId}
      onNewChat={handleNewChat}
      onRefreshConversations={loadConversations}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      {activeTab === 'library' && (
        <PodcastLibraryView
          searchQuery={searchQuery}
          onSelectPodcast={() => {}}
          onSelectEpisode={() => {}}
          onStartChat={handleStartChatForEpisode}
          onViewTranscript={handleViewTranscriptForEpisode}
        />
      )}

      {activeTab === 'documents' && (
        <PdfLibraryView
          searchQuery={searchQuery}
          onStartChatForDocument={handleStartChatForDocument}
        />
      )}

      {activeTab === 'transcript' && (
        <TranscriptViewer
          episodeId={activeEpisode?.id || ''}
          episodeTitle={activeEpisode?.title || 'Select an episode from Library'}
          onBack={() => setActiveTab('library')}
        />
      )}

      {activeTab === 'chat' && (
        <ChatView
          conversationId={selectedConversationId || null}
          episodeId={activeEpisode?.id || null}
          episodeTitle={activeEpisode?.title || ''}
          documentId={activeDocument?.id || null}
          documentName={activeDocument?.name || ''}
          onConversationCreated={(id) => {
            setSelectedConversationId(id);
            loadConversations();
          }}
          onBack={() => setActiveTab('library')}
        />
      )}
    </AppLayout>
  );
};

export const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;
