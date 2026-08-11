import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Mic, Library as LibraryIcon, Upload, AlertCircle, FileText, MessageSquare, Clock, Calendar } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Podcast, Episode, api } from '../../../services/api';
import { useToast } from '../../ui/Toast';
import { IngestionStatusBadge } from './IngestionStatusBadge';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';

// ─── PodcastCard ──────────────────────────────────────────────────────────────
const PodcastCard: React.FC<{ podcast: Podcast; onClick: () => void }> = ({ podcast, onClick }) => (
  <button onClick={onClick} className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 hover:shadow-lg hover:border-brand-500/50 hover:-translate-y-0.5 transition-all group">
    <div className="flex items-start gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-700 flex items-center justify-center text-white text-2xl shrink-0 shadow-md group-hover:scale-105 transition-transform">
        🎙️
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{podcast.title}</h3>
        {podcast.publisher && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{podcast.publisher}</p>}
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          <span>{podcast.episodeCount} episode{podcast.episodeCount !== 1 ? 's' : ''}</span>
        </div>
        {podcast.description && <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">{podcast.description}</p>}
      </div>
    </div>
  </button>
);

// ─── EpisodeCard ──────────────────────────────────────────────────────────────
const EpisodeCard: React.FC<{ episode: Episode; onUploadTranscript: () => void; onViewTranscript: () => void; onStartChat: () => void }> = ({ episode, onUploadTranscript, onViewTranscript, onStartChat }) => {
  const formatDuration = (secs: number) => {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base truncate">{episode.title}</h4>
            <IngestionStatusBadge status={episode.transcriptStatus} />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-400">
            {episode.publishDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {episode.publishDate}
              </span>
            )}
            {episode.duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {formatDuration(episode.duration)}
              </span>
            )}
          </div>
          {episode.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">{episode.description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
        {episode.transcriptStatus === 'pending' ? (
          <Button size="sm" variant="outline" leftIcon={<Upload className="w-3.5 h-3.5" />} onClick={onUploadTranscript}>Upload Transcript</Button>
        ) : episode.transcriptStatus === 'failed' ? (
          <Button size="sm" variant="outline" leftIcon={<Upload className="w-3.5 h-3.5" />} onClick={onUploadTranscript} className="border-red-300 text-red-600 hover:bg-red-50">Retry Upload</Button>
        ) : episode.transcriptStatus === 'ready' ? (
          <>
            <Button size="sm" variant="outline" leftIcon={<FileText className="w-3.5 h-3.5" />} onClick={onViewTranscript}>View Transcript</Button>
            <Button size="sm" variant="primary" leftIcon={<MessageSquare className="w-3.5 h-3.5" />} onClick={onStartChat}>Ask Questions</Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" disabled className="animate-pulse">Processing Transcript...</Button>
        )}
      </div>
    </div>
  );
};

// ─── PodcastLibraryView ──────────────────────────────────────────────────────
export const PodcastLibraryView: React.FC<{
  searchQuery: string; onSelectPodcast: (podcast: Podcast) => void;
  onSelectEpisode: (episode: Episode, podcastTitle: string) => void;
  onStartChat: (episodeId: string) => void; onViewTranscript: (episodeId: string) => void;
}> = ({ searchQuery, onSelectPodcast, onSelectEpisode, onStartChat, onViewTranscript }) => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddPodcast, setShowAddPodcast] = useState(false);
  const [showAddEpisode, setShowAddEpisode] = useState(false);
  const [showUploadTranscript, setShowUploadTranscript] = useState<string | null>(null);

  // Form states
  const [podcastForm, setPodcastForm] = useState({ title: '', description: '', publisher: '' });
  const [episodeForm, setEpisodeForm] = useState({ title: '', description: '', publishDate: '', duration: '' });
  const [transcriptContent, setTranscriptContent] = useState('');
  const [transcriptFormat, setTranscriptFormat] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const loadPodcasts = async () => {
    try {
      const res = await api.getPodcasts(searchQuery || undefined);
      setPodcasts(res.podcasts || []);
    } catch (err) {} finally { setIsLoading(false); }
  };

  const loadEpisodes = async (podcastId: string) => {
    try {
      const res = await api.getEpisodes(podcastId);
      setEpisodes(res.episodes || []);
    } catch (err) {}
  };

  useEffect(() => { loadPodcasts(); }, [searchQuery]);

  useEffect(() => {
    if (selectedPodcast) loadEpisodes(selectedPodcast.id);
  }, [selectedPodcast]);

  // Polling loop for episodes currently in 'processing' status
  useEffect(() => {
    if (!selectedPodcast) return;

    const processingEpisodes = episodes.filter(e => e.transcriptStatus === 'processing');
    if (processingEpisodes.length === 0) return;

    const interval = setInterval(async () => {
      let changed = false;
      for (const ep of processingEpisodes) {
        try {
          const statusRes = await api.getTranscriptStatus(ep.id);
          if (statusRes.status && statusRes.status !== 'processing') {
            changed = true;
            if (statusRes.status === 'ready') {
              showToast(`Transcript for "${ep.title}" is ready! You can now ask questions.`, 'success');
            } else if (statusRes.status === 'failed') {
              showToast(`Transcript processing failed for "${ep.title}".`, 'error');
            }
          }
        } catch (err) {}
      }

      if (changed && selectedPodcast) {
        loadEpisodes(selectedPodcast.id);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [episodes, selectedPodcast]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    // Auto detect format from extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'srt' || ext === 'vtt' || ext === 'txt') {
      setTranscriptFormat(ext);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setTranscriptContent(content);
        showToast(`Loaded ${file.name} (${(content.length / 1024).toFixed(1)} KB)`, 'info');
      }
    };
    reader.onerror = () => {
      showToast('Failed to read transcript file', 'error');
    };
    reader.readAsText(file);
  };

  const handleCreatePodcast = async () => {
    if (!podcastForm.title.trim()) return;
    setIsSubmitting(true);
    try {
      await api.createPodcast(podcastForm);
      showToast('Podcast created!', 'success');
      setShowAddPodcast(false);
      setPodcastForm({ title: '', description: '', publisher: '' });
      loadPodcasts();
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsSubmitting(false); }
  };

  const handleCreateEpisode = async () => {
    if (!episodeForm.title.trim() || !selectedPodcast) return;
    setIsSubmitting(true);
    try {
      await api.createEpisode({ podcastId: selectedPodcast.id, title: episodeForm.title, description: episodeForm.description, publishDate: episodeForm.publishDate, duration: episodeForm.duration ? parseInt(episodeForm.duration) * 60 : 0 });
      showToast('Episode added!', 'success');
      setShowAddEpisode(false);
      setEpisodeForm({ title: '', description: '', publishDate: '', duration: '' });
      loadEpisodes(selectedPodcast.id);
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsSubmitting(false); }
  };

  const handleUploadTranscript = async () => {
    if (!transcriptContent.trim() || !showUploadTranscript) return;
    const targetEpId = showUploadTranscript;
    setIsSubmitting(true);

    try {
      // Optimistically update UI to 'processing' right away
      setEpisodes(prev => prev.map(e => e.id === targetEpId ? { ...e, transcriptStatus: 'processing' } : e));

      await api.uploadTranscript(targetEpId, { content: transcriptContent, format: transcriptFormat || undefined });
      showToast('Transcript uploaded! Ingestion started.', 'success');

      setShowUploadTranscript(null);
      setTranscriptContent('');
      setTranscriptFormat('');
      setSelectedFileName('');

      // Refresh episodes to confirm 'processing' state
      if (selectedPodcast) loadEpisodes(selectedPodcast.id);
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
      // Revert status on failure
      if (selectedPodcast) loadEpisodes(selectedPodcast.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Episode List View ───
  if (selectedPodcast) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <button onClick={() => setSelectedPodcast(null)} className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline mb-1">← Back to Library</button>
            <h1 className="font-h1 text-slate-900 dark:text-slate-100">{selectedPodcast.title}</h1>
            {selectedPodcast.publisher && <p className="text-sm text-slate-500 mt-1">by {selectedPodcast.publisher}</p>}
          </div>
          <Button variant="primary" size="default" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddEpisode(true)}>Add Episode</Button>
        </div>
        {episodes.length === 0 ? (
          <Card className="text-center py-16"><Mic className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" /><p className="text-slate-500">No episodes yet. Add one to get started.</p></Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">{episodes.map(ep => (
            <EpisodeCard key={ep.id} episode={ep} onUploadTranscript={() => setShowUploadTranscript(ep.id)} onViewTranscript={() => onViewTranscript(ep.id)} onStartChat={() => onStartChat(ep.id)} />
          ))}</div>
        )}

        {/* Add Episode Modal */}
        <Modal isOpen={showAddEpisode} onClose={() => setShowAddEpisode(false)} title="Add Episode" subtitle={`Adding to "${selectedPodcast.title}"`}>
          <div className="flex flex-col gap-4">
            <Input label="Episode title" value={episodeForm.title} onChange={e => setEpisodeForm({ ...episodeForm, title: e.target.value })} placeholder="e.g., Episode 42: The Future of AI" required />
            <Input label="Description" value={episodeForm.description} onChange={e => setEpisodeForm({ ...episodeForm, description: e.target.value })} placeholder="Brief episode summary" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Publish date" type="date" value={episodeForm.publishDate} onChange={e => setEpisodeForm({ ...episodeForm, publishDate: e.target.value })} />
              <Input label="Duration (minutes)" type="number" value={episodeForm.duration} onChange={e => setEpisodeForm({ ...episodeForm, duration: e.target.value })} placeholder="60" />
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <Button variant="outline" size="default" onClick={() => setShowAddEpisode(false)}>Cancel</Button>
              <Button variant="primary" size="default" onClick={handleCreateEpisode} isLoading={isSubmitting}>Add Episode</Button>
            </div>
          </div>
        </Modal>

        {/* Upload Transcript Modal */}
        <Modal isOpen={!!showUploadTranscript} onClose={() => setShowUploadTranscript(null)} title="Upload Transcript" subtitle="Upload a file or paste text in SRT, VTT, or plain text format" maxWidth="lg">
          <div className="flex flex-col gap-4">
            {/* File Upload Button & Format Filters */}
            <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".srt,.vtt,.txt,text/plain"
                  className="hidden"
                  onChange={handleFileSelected}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Upload className="w-4 h-4" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Transcript File
                </Button>
                {selectedFileName && (
                  <span className="text-xs font-medium text-brand-600 dark:text-brand-400 truncate max-w-[200px]">
                    📄 {selectedFileName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Format:</span>
                {['auto', 'srt', 'vtt', 'txt'].map(fmt => (
                  <button key={fmt} onClick={() => setTranscriptFormat(fmt === 'auto' ? '' : fmt)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${(!transcriptFormat && fmt === 'auto') || transcriptFormat === fmt ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950 dark:border-brand-700 dark:text-brand-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    {fmt === 'auto' ? 'Auto' : fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <textarea value={transcriptContent} onChange={e => setTranscriptContent(e.target.value)} placeholder="Or paste your transcript content here... (SRT, VTT, or plain text)"
              className="w-full h-64 p-4 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y font-mono" />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{transcriptContent.length.toLocaleString()} characters</span>
              {transcriptContent.trim() && <span>Ready for processing</span>}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="default" onClick={() => { setShowUploadTranscript(null); setSelectedFileName(''); setTranscriptContent(''); }}>Cancel</Button>
              <Button variant="primary" size="default" onClick={handleUploadTranscript} isLoading={isSubmitting} disabled={!transcriptContent.trim()}>Upload & Process</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ─── Podcast Library Grid ───
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-h1 text-slate-900 dark:text-slate-100">Podcast Library</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your podcasts and episodes</p>
        </div>
        <Button variant="primary" size="default" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddPodcast(true)}>Add Podcast</Button>
      </div>

      {isLoading ? (
        <Card className="text-center py-16"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" /></Card>
      ) : podcasts.length === 0 ? (
        <Card className="text-center py-16">
          <LibraryIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="font-h3 text-slate-700 dark:text-slate-300 mb-2">No podcasts yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Add your first podcast to start uploading transcripts and asking questions.</p>
          <Button variant="primary" size="default" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddPodcast(true)}>Add Your First Podcast</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {podcasts.map(p => <PodcastCard key={p.id} podcast={p} onClick={() => setSelectedPodcast(p)} />)}
        </div>
      )}

      {/* Add Podcast Modal */}
      <Modal isOpen={showAddPodcast} onClose={() => setShowAddPodcast(false)} title="Add Podcast" subtitle="Create a new podcast to organize your episodes">
        <div className="flex flex-col gap-4">
          <Input label="Podcast title" value={podcastForm.title} onChange={e => setPodcastForm({ ...podcastForm, title: e.target.value })} placeholder="e.g., The AI Alignment Podcast" required />
          <Input label="Publisher" value={podcastForm.publisher} onChange={e => setPodcastForm({ ...podcastForm, publisher: e.target.value })} placeholder="e.g., Future of Life Institute" />
          <Input label="Description" value={podcastForm.description} onChange={e => setPodcastForm({ ...podcastForm, description: e.target.value })} placeholder="Brief description of the podcast" />
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" size="default" onClick={() => setShowAddPodcast(false)}>Cancel</Button>
            <Button variant="primary" size="default" onClick={handleCreatePodcast} isLoading={isSubmitting}>Create Podcast</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
