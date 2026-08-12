/**
 * Centralized API Client Service
 */

const API_BASE = ((import.meta as any).env?.VITE_API_URL || '/api').replace(/\/$/, '');

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Podcast {
  id: string;
  userId: string;
  title: string;
  description: string;
  publisher: string;
  coverImageUrl: string;
  episodeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Episode {
  id: string;
  podcastId: string;
  title: string;
  description: string;
  publishDate: string;
  duration: number;
  audioUrl: string;
  transcriptStatus: 'pending' | 'processing' | 'ready' | 'failed';
  transcriptFormat: string;
  hasApproximateTiming: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  id: string;
  episodeId: string;
  segmentIndex: number;
  startTime: number;
  endTime: number;
  speaker: string;
  text: string;
}

export interface Citation {
  id: string;
  messageId: string;
  chunkId: string;
  startTime?: number;
  endTime?: number;
  snippetText: string;
  episodeId?: string;
  sourceType?: 'podcast' | 'pdf';
  documentId?: string;
  documentName?: string;
  pageNumber?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  citations: Citation[];
}

export interface Conversation {
  id: string;
  userId: string;
  episodeId: string | null;
  documentId?: string | null;
  title: string;
  scope: 'episode' | 'document' | 'library';
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  episode?: {
    id: string;
    title: string;
    podcastTitle: string;
    audioUrl: string;
  };
  document?: {
    id: string;
    fileName: string;
    pageCount: number;
  };
  episodeTitle?: string;
  podcastTitle?: string;
  documentName?: string;
  lastMessage?: {
    content: string;
    role: string;
    createdAt: string;
  };
  messageCount?: number;
}

// ─── Request Helper ───────────────────────────────────────────────────────────

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers as Record<string, string>),
    },
    credentials: 'include',
  });

  let data: any = {};
  const text = await response.text();
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { error: { message: text } };
    }
  }

  if (!response.ok) {
    const errorMsg = data.error?.message || data.message || response.statusText || `HTTP ${response.status} Error`;
    const error = new Error(errorMsg) as Error & { statusCode?: number; code?: string };
    error.statusCode = response.status;
    error.code = data.error?.code || data.code;
    throw error;
  }

  return data;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const api = {
  // Auth
  register: async (body: any) => {
    const res = await request<{ success: boolean; user: User; token?: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) });
    if (res.token) localStorage.setItem('access_token', res.token);
    return res;
  },
  login: async (body: any) => {
    const res = await request<{ success: boolean; user: User; token?: string }>('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    if (res.token) localStorage.setItem('access_token', res.token);
    return res;
  },
  logout: async () => {
    localStorage.removeItem('access_token');
    return request<{ success: boolean }>('/auth/logout', { method: 'POST' });
  },
  getMe: () => request<{ success: boolean; user: User }>('/auth/me'),
  verifyEmail: (token: string) => request<{ success: boolean; message: string }>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  forgotPassword: (email: string) => request<{ success: boolean; resetToken?: string; message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body: any) => request<{ success: boolean; message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  // Podcasts
  getPodcasts: (q?: string) => request<{ success: boolean; podcasts: Podcast[] }>(`/podcasts${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createPodcast: (body: any) => request<{ success: boolean; podcast: Podcast }>('/podcasts', { method: 'POST', body: JSON.stringify(body) }),
  getPodcast: (id: string) => request<{ success: boolean; podcast: Podcast }>(`/podcasts/${id}`),
  updatePodcast: (id: string, body: any) => request<{ success: boolean; podcast: Podcast }>(`/podcasts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePodcast: (id: string) => request<{ success: boolean }>(`/podcasts/${id}`, { method: 'DELETE' }),

  // Episodes
  getEpisodes: (podcastId: string) => request<{ success: boolean; episodes: Episode[] }>(`/podcasts/${podcastId}/episodes`),
  createEpisode: (body: any) => request<{ success: boolean; episode: Episode }>('/episodes', { method: 'POST', body: JSON.stringify(body) }),
  getEpisode: (id: string) => request<{ success: boolean; episode: Episode }>(`/episodes/${id}`),
  uploadTranscript: (episodeId: string, body: { content: string; format?: string }) =>
    request<{ success: boolean; message: string; status: string }>(`/episodes/${episodeId}/transcript`, { method: 'POST', body: JSON.stringify(body) }),
  getTranscriptStatus: (episodeId: string) =>
    request<{ success: boolean; status: string; hasApproximateTiming: boolean }>(`/episodes/${episodeId}/transcript/status`),
  getTranscript: (episodeId: string) =>
    request<{ success: boolean; episodeId: string; transcriptStatus: string; hasApproximateTiming: boolean; segments: TranscriptSegment[] }>(`/episodes/${episodeId}/transcript`),

  // Documents (PDFs)
  getDocuments: () => request<{ success: boolean; documents: Document[] }>('/documents'),
  uploadDocument: (body: { fileName: string; fileData: string; fileSize?: number }) =>
    request<{ success: boolean; message: string; document: Document }>('/documents', { method: 'POST', body: JSON.stringify(body) }),
  getDocument: (id: string) => request<{ success: boolean; document: Document }>(`/documents/${id}`),
  getDocumentStatus: (id: string) => request<{ success: boolean; status: string; pageCount: number; errorMessage: string }>(`/documents/${id}/status`),
  deleteDocument: (id: string) => request<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' }),

  // Conversations
  getConversations: (episodeId?: string) =>
    request<{ success: boolean; conversations: Conversation[] }>(`/conversations${episodeId ? `?episodeId=${episodeId}` : ''}`),
  createConversation: (body: { episodeId?: string; documentId?: string; scope?: string; title?: string }) =>
    request<{ success: boolean; conversation: Conversation }>('/conversations', { method: 'POST', body: JSON.stringify(body) }),
  getConversation: (id: string) =>
    request<{ success: boolean; conversation: Conversation }>(`/conversations/${id}`),
  sendMessage: (conversationId: string, message: string, sourceType?: 'podcast' | 'pdf' | 'all') =>
    request<{ success: boolean; message: Message; citations: Citation[] }>(`/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ message, sourceType }) }),
  deleteConversation: (id: string) =>
    request<{ success: boolean }>(`/conversations/${id}`, { method: 'DELETE' }),

  // User
  updateProfile: (body: any) => request<{ success: boolean; user: User }>('/user/profile', { method: 'PUT', body: JSON.stringify(body) }),
  updatePassword: (body: any) => request<{ success: boolean }>('/user/password', { method: 'PUT', body: JSON.stringify(body) }),
};
