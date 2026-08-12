import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageSquare, Clock, ChevronRight, FileText, Sparkles, Filter, Layers, Mic } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { api, Message, Citation, Conversation } from '../../../services/api';
import { useToast } from '../../ui/Toast';
import { audioService } from '../../../utils/audio';

// ─── CitationChip ─────────────────────────────────────────────────────────────
const CitationChip: React.FC<{ citation: Citation; index: number; onClick: () => void }> = ({ citation, index, onClick }) => {
  const isPdf = Boolean(citation.documentId || citation.documentName || citation.pageNumber || citation.sourceType === 'pdf');

  const formatTime = (s?: number) => {
    if (s === undefined || s === null) return '00:00';
    const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 dark:bg-brand-950/60 border border-brand-200/80 dark:border-brand-800 rounded-lg text-xs font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/60 transition-colors group shadow-2xs">
      <FileText className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
      {isPdf ? (
        <span className="font-sans">
          Source: PDF — <strong className="font-semibold">{citation.documentName || 'Document'}</strong>, Page {citation.pageNumber || 1}
        </span>
      ) : (
        <span className="font-sans">
          Source: Episode — <strong className="font-semibold">{citation.episodeTitle || 'Podcast Episode'}</strong>, {formatTime(citation.startTime)}–{formatTime(citation.endTime)}
        </span>
      )}
      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 shrink-0 text-brand-500" />
    </button>
  );
};

// ─── CitationDetailPanel ──────────────────────────────────────────────────────
const CitationDetailPanel: React.FC<{ citation: Citation; index: number; onClose: () => void }> = ({ citation, index, onClose }) => {
  const isPdf = Boolean(citation.documentId || citation.documentName || citation.pageNumber);

  const formatTime = (s?: number) => {
    if (s === undefined || s === null) return '00:00';
    const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 rounded-lg p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Source {index + 1}
        </h4>
        <div className="flex items-center gap-2">
          {isPdf ? (
            <span className="text-xs font-mono text-brand-600 dark:text-brand-400 flex items-center gap-1">
              <FileText className="w-3 h-3" /> {citation.documentName || 'Document'} (Page {citation.pageNumber || 1})
            </span>
          ) : (
            <span className="text-xs font-mono text-brand-600 dark:text-brand-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatTime(citation.startTime)} – {formatTime(citation.endTime)}
            </span>
          )}
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">✕</button>
        </div>
      </div>
      <blockquote className="text-sm text-slate-700 dark:text-slate-300 italic border-l-2 border-brand-400 pl-3">
        "{citation.snippetText}"
      </blockquote>
    </div>
  );
};

// ─── Simple Markdown Renderer ──────────────────────────────────────────────────
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) return <div key={lineIdx} className="h-1" />;

        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
        const cleanLine = isBullet ? line.trim().substring(2) : line;

        const parts = [];
        let remaining = cleanLine;
        let keyCounter = 0;

        while (remaining.length > 0) {
          const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
          const sourceMatch = remaining.match(/\[Source (\d+)\]/);

          if (boldMatch && (!sourceMatch || boldMatch.index! < sourceMatch.index!)) {
            const pre = remaining.substring(0, boldMatch.index);
            if (pre) parts.push(<span key={keyCounter++}>{pre}</span>);
            parts.push(
              <strong key={keyCounter++} className="font-semibold text-slate-900 dark:text-slate-100">
                {boldMatch[1]}
              </strong>
            );
            remaining = remaining.substring(boldMatch.index! + boldMatch[0].length);
          } else if (sourceMatch) {
            const pre = remaining.substring(0, sourceMatch.index);
            if (pre) parts.push(<span key={keyCounter++}>{pre}</span>);
            parts.push(
              <span key={keyCounter++} className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 mx-0.5 border border-brand-200 dark:border-brand-800">
                Source {sourceMatch[1]}
              </span>
            );
            remaining = remaining.substring(sourceMatch.index! + sourceMatch[0].length);
          } else {
            parts.push(<span key={keyCounter++}>{remaining}</span>);
            break;
          }
        }

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 shrink-0" />
              <div>{parts}</div>
            </div>
          );
        }

        return <p key={lineIdx}>{parts}</p>;
      })}
    </div>
  );
};

// ─── ChatMessage ──────────────────────────────────────────────────────────────
const ChatMessage: React.FC<{ message: Message; onCitationClick: (c: Citation, i: number) => void }> = ({ message, onCitationClick }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[88%] lg:max-w-[78%] ${isUser ? 'order-2' : ''}`}>
        <div className={`rounded-2xl px-5 py-4 ${isUser
          ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-br-sm shadow-md'
          : 'bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-bl-sm shadow-sm'
        }`}>
          {isUser ? (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
          ) : (
            <FormattedText text={message.content} />
          )}
        </div>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 ml-1">
            {message.citations.map((c, i) => (
              <CitationChip key={c.id || i} citation={c} index={i} onClick={() => onCitationClick(c, i)} />
            ))}
          </div>
        )}

        <p className={`text-[10px] font-medium mt-1.5 px-1 ${isUser ? 'text-right text-slate-400' : 'text-slate-400'}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

// ─── ChatView ─────────────────────────────────────────────────────────────────
export const ChatView: React.FC<{
  conversationId: string | null;
  episodeId: string | null;
  episodeTitle: string;
  documentId?: string | null;
  documentName?: string;
  onConversationCreated: (id: string) => void;
  onBack: () => void;
  onOpenUpload?: (episodeId: string) => void;
}> = ({
  conversationId, episodeId, episodeTitle, documentId, documentName,
  onConversationCreated, onBack, onOpenUpload
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string>('');
  const [episodeStatus, setEpisodeStatus] = useState<string>('ready');
  const [activeCitation, setActiveCitation] = useState<{ citation: Citation; index: number } | null>(null);
  const [currentConvId, setCurrentConvId] = useState(conversationId);
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'all' | 'podcast' | 'pdf'>(
    documentId ? 'pdf' : (episodeId ? 'podcast' : 'all')
  );

  const threadRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    setCurrentConvId(conversationId);
    if (conversationId) loadConversation(conversationId);
    else setMessages([]);
  }, [conversationId]);

  useEffect(() => {
    if (documentId) setSourceTypeFilter('pdf');
    else if (episodeId) setSourceTypeFilter('podcast');
  }, [documentId, episodeId]);

  useEffect(() => {
    if (episodeId) {
      api.getEpisode(episodeId)
        .then(res => {
          if (res.episode) setEpisodeStatus(res.episode.transcriptStatus);
        })
        .catch(() => {});
    } else {
      setEpisodeStatus('ready');
    }
  }, [episodeId]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  const loadConversation = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await api.getConversation(id);
      setMessages(res.conversation.messages || []);
    } catch (err) {} finally { setIsLoading(false); }
  };

  const handleSend = async (overrideQuestion?: string) => {
    const question = (overrideQuestion || inputValue).trim();
    if (!question || isSending) return;
    if (!overrideQuestion) setInputValue('');
    setIsSending(true);
    setSendError(null);
    setLastQuestion(question);
    setActiveCitation(null);
    audioService.playSend();

    try {
      let convId = currentConvId;

      if (!convId) {
        const res = await api.createConversation({
          episodeId: episodeId || undefined,
          documentId: documentId || undefined,
          scope: documentId ? 'document' : (episodeId ? 'episode' : 'library'),
          title: question.length > 50 ? question.substring(0, 47) + '...' : question,
        });
        convId = res.conversation.id;
        setCurrentConvId(convId);
        onConversationCreated(convId);
      }

      const tempUserMsg: Message = { id: 'temp-' + Date.now(), conversationId: convId!, role: 'user', content: question, createdAt: new Date().toISOString(), citations: [] };
      setMessages(prev => [...prev, tempUserMsg]);

      const res = await api.sendMessage(convId!, question, sourceTypeFilter);
      audioService.playSuccess();

      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempUserMsg.id);
        const userMsg: Message = { ...tempUserMsg, id: 'user-' + Date.now() };
        const assistantMsg: Message = { ...res.message, citations: res.citations || [] };
        return [...withoutTemp, userMsg, assistantMsg];
      });
    } catch (err: any) {
      const msg = err.message || 'Failed to generate answer. Please try again.';
      setSendError(msg);
      showToast(msg, 'error');
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isTranscriptMissing = episodeId && episodeStatus !== 'ready';

  const viewHeaderTitle = documentName
    ? `PDF Q&A: ${documentName}`
    : episodeTitle
    ? `Q&A: ${episodeTitle}`
    : 'Unified Q&A Engine (Podcasts & PDFs)';

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline shrink-0">← Back</button>
          <div className="min-w-0">
            <h2 className="font-h3 text-slate-900 dark:text-slate-100 truncate">
              {viewHeaderTitle}
            </h2>
            <p className="text-xs text-slate-400">Ask questions grounded strictly in your uploaded transcripts and PDF documents</p>
          </div>
        </div>

        {/* Source selector toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSourceTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              sourceTypeFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> All Sources
          </button>
          <button
            onClick={() => setSourceTypeFilter('podcast')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              sourceTypeFilter === 'podcast'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> Podcasts
          </button>
          <button
            onClick={() => setSourceTypeFilter('pdf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              sourceTypeFilter === 'pdf'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> PDFs
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div ref={threadRef} className="flex-1 overflow-y-auto py-6 space-y-4">
        {isTranscriptMissing && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-5 text-center my-4 animate-fade-in">
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">No Transcript Uploaded Yet</h4>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-4 max-w-md mx-auto">Upload a transcript for this episode before asking questions to ensure grounded answers with timestamps.</p>
            {episodeId && onOpenUpload && (
              <Button size="sm" variant="primary" onClick={() => onOpenUpload(episodeId)}>
                Upload Transcript Now
              </Button>
            )}
          </div>
        )}

        {messages.length === 0 && !isLoading && !isTranscriptMissing && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-950 flex items-center justify-center mx-auto mb-4 border border-brand-200 dark:border-brand-800">
              <Sparkles className="w-8 h-8 text-brand-500" />
            </div>
            <h3 className="font-h3 text-slate-700 dark:text-slate-300 mb-2">
              {documentName ? `Ask questions about ${documentName}` : 'Ask anything about your transcripts & PDFs'}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Answers are generated strictly using retrieved content with page numbers and timestamp citations.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {[
                'What is Retrieval-Augmented Generation?',
                'What are embeddings and vector databases?',
                'Summarize the main points discussed',
              ].map(q => (
                <button key={q} onClick={() => setInputValue(q)} className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-brand-300 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-500 mx-auto" /></div>}

        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} onCitationClick={(c, i) => setActiveCitation({ citation: c, index: i })} />
        ))}

        {isSending && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-5 py-3.5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse-dot" />
                  <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
                </div>
                <span>Retrieving context & generating answer...</span>
              </div>
            </div>
          </div>
        )}

        {sendError && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between gap-3 text-xs text-red-700 dark:text-red-300 animate-fade-in">
            <span>{sendError}</span>
            {lastQuestion && (
              <Button size="sm" variant="outline" onClick={() => handleSend(lastQuestion)}>Retry</Button>
            )}
          </div>
        )}
      </div>

      {/* Citation Detail Panel */}
      {activeCitation && (
        <div className="mb-3">
          <CitationDetailPanel citation={activeCitation.citation} index={activeCitation.index} onClose={() => setActiveCitation(null)} />
        </div>
      )}

      {/* Input Bar */}
      <div className="border-t border-slate-200/80 dark:border-slate-800/80 pt-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700/80 p-2 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 transition-all flex items-end gap-2">
          <textarea value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
            disabled={Boolean(isTranscriptMissing)}
            placeholder={isTranscriptMissing ? "Upload a transcript first..." : "Ask a question about your documents or transcripts..."}
            rows={1}
            className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed border-none shadow-none"
            style={{ minHeight: '40px', maxHeight: '120px' }}
            onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
          />
          <Button variant="primary" size="default" onClick={() => handleSend()} disabled={!inputValue.trim() || isSending || Boolean(isTranscriptMissing)}
            className="shrink-0 w-[42px] h-[42px] !p-0 rounded-xl shadow-xs">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
