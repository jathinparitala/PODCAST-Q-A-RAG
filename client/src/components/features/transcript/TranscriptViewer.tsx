import React, { useState, useEffect } from 'react';
import { Search, Clock, User as UserIcon, FileText, ArrowLeft } from 'lucide-react';
import { Card } from '../../ui/Card';
import { api, TranscriptSegment } from '../../../services/api';
import { audioService } from '../../../utils/audio';

const formatTime = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const TranscriptViewer: React.FC<{ episodeId: string; episodeTitle: string; onBack: () => void; highlightChunkId?: string }> = ({ episodeId, episodeTitle, onBack, highlightChunkId }) => {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getTranscript(episodeId);
        setSegments(res.segments || []);
      } catch (err) {} finally { setIsLoading(false); }
    };
    load();
  }, [episodeId]);

  const filtered = searchTerm
    ? segments.filter(s => s.text.toLowerCase().includes(searchTerm.toLowerCase()) || (s.speaker && s.speaker.toLowerCase().includes(searchTerm.toLowerCase())))
    : segments;

  if (isLoading) {
    return (
      <Card className="text-center py-20">
        <div className="w-10 h-10 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading transcript segments...</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <button onClick={() => { audioService.playClick(); onBack(); }} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline mb-2 group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Library
          </button>
          <h1 className="font-h2 text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <FileText className="w-6 h-6 text-brand-600 dark:text-brand-400 shrink-0" />
            <span>Transcript: {episodeTitle || 'Episode Transcript'}</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            {segments.length} timestamped segments parsed & indexed
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search keywords or speakers within transcript..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); audioService.playScan(); }}
          className="w-full h-[46px] pl-10 pr-4 text-sm bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-2xs transition-all"
        />
      </div>

      {/* Segment List */}
      {filtered.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No matching transcript segments found.</p>
        </Card>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2 max-h-[72vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filtered.map(seg => (
            <div key={seg.id} className="pt-3.5 first:pt-0 flex items-start gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 p-3 rounded-xl transition-all group">
              {/* Isolated Timestamp Pill */}
              <div className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50/90 dark:bg-brand-950/80 border border-brand-200/80 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-mono text-xs font-bold min-w-[96px] shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <span>{formatTime(seg.startTime)}</span>
              </div>

              {/* Text Block */}
              <div className="flex-1 min-w-0 pt-0.5">
                {seg.speaker && (
                  <span className="inline-block px-2 py-0.5 mb-1 text-[11px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 mr-2">
                    {seg.speaker}
                  </span>
                )}
                <span className="text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed block">
                  {seg.text}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
