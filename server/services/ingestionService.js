/**
 * Ingestion Service
 * Parses uploaded transcripts (SRT, VTT, TXT), splits into segments,
 * then creates overlapping chunks suitable for embedding and retrieval.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../database/db');
const logger = require('../utils/logger');
const podcastService = require('./podcastService');

const ingestionService = {
  /**
   * Full ingestion pipeline: parse → segment → chunk → embed → store.
   * Runs asynchronously after returning a job reference.
   */
  async processTranscript(episodeId, rawContent, format, embeddingService) {
    try {
      podcastService.updateTranscriptStatus(episodeId, 'processing');

      // 1. Clean existing data for re-ingestion
      db.run('DELETE FROM transcript_segments WHERE episode_id = ?', [episodeId]);
      db.run('DELETE FROM transcript_chunks WHERE episode_id = ?', [episodeId]);

      // 2. Parse into segments
      const detectedFormat = format || this.detectFormat(rawContent);
      const segments = this.parseTranscript(rawContent, detectedFormat);

      if (!segments || segments.length === 0) {
        throw new Error('No transcript segments could be parsed from the provided content.');
      }

      // Store format on episode
      const hasApproxTiming = detectedFormat === 'txt' || detectedFormat === 'plain';
      db.run('UPDATE episodes SET transcript_format = ? WHERE id = ?', [detectedFormat, episodeId]);

      // 3. Persist segments
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        db.run(`
          INSERT INTO transcript_segments (id, episode_id, segment_index, start_time, end_time, speaker, text)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), episodeId, i, seg.startTime, seg.endTime, seg.speaker || '', seg.text]);
      }

      logger.info(`Parsed ${segments.length} segments for episode ${episodeId} (format: ${detectedFormat})`);

      // 4. Create chunks
      const chunks = this.chunkSegments(segments, { targetWords: 200, overlapRatio: 0.2 });
      logger.info(`Created ${chunks.length} chunks for episode ${episodeId}`);

      // 5. Generate embeddings and store chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const contentHash = crypto.createHash('md5').update(chunk.text).digest('hex');

        // Check if we already have an embedding for this exact content
        const existing = db.get(
          'SELECT id, embedding FROM transcript_chunks WHERE episode_id = ? AND content_hash = ?',
          [episodeId, contentHash]
        );

        let embeddingJson = '';
        if (existing && existing.embedding) {
          embeddingJson = existing.embedding;
        } else {
          try {
            const embedding = await embeddingService.generateEmbedding(chunk.text);
            embeddingJson = JSON.stringify(embedding);
          } catch (embErr) {
            logger.warn(`Embedding failed for chunk ${i}: ${embErr.message}. Storing without embedding.`);
            embeddingJson = '';
          }
        }

        db.run(`
          INSERT INTO transcript_chunks (id, episode_id, chunk_index, chunk_text, start_time, end_time, embedding, content_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), episodeId, i, chunk.text, chunk.startTime, chunk.endTime, embeddingJson, contentHash]);
      }

      podcastService.updateTranscriptStatus(episodeId, 'ready', hasApproxTiming);
      logger.info(`Ingestion complete for episode ${episodeId}: ${chunks.length} chunks embedded`);

      return { success: true, segmentCount: segments.length, chunkCount: chunks.length };
    } catch (err) {
      logger.error(`Ingestion failed for episode ${episodeId}: ${err.message}`);
      podcastService.updateTranscriptStatus(episodeId, 'failed');
      throw err;
    }
  },

  /**
   * Detect transcript format from content
   */
  detectFormat(content) {
    const trimmed = content.trim();
    if (/^\d+\r?\n\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/m.test(trimmed)) {
      return 'srt';
    }
    if (/^WEBVTT/i.test(trimmed)) {
      return 'vtt';
    }
    return 'txt';
  },

  /**
   * Parse transcript content into TimedSegment[]
   * @returns {{ startTime: number, endTime: number, speaker: string, text: string }[]}
   */
  parseTranscript(rawContent, format) {
    switch (format) {
      case 'srt':
        return this.parseSRT(rawContent);
      case 'vtt':
        return this.parseVTT(rawContent);
      case 'txt':
      case 'plain':
      default:
        return this.parsePlainText(rawContent);
    }
  },

  /**
   * Parse SRT format
   */
  parseSRT(content) {
    const segments = [];
    const blocks = content.trim().split(/\r?\n\r?\n/);

    for (const block of blocks) {
      const lines = block.trim().split(/\r?\n/);
      if (lines.length < 3) continue;

      // Line 1: sequence number (skip)
      // Line 2: timestamp range
      const timeLine = lines[1];
      const timeMatch = timeLine.match(
        /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
      );
      if (!timeMatch) continue;

      const startTime = this.timeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
      const endTime = this.timeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);

      // Lines 3+: text content
      const text = lines.slice(2).join(' ').replace(/<[^>]*>/g, '').trim();
      if (!text) continue;

      // Check for speaker label pattern: "Speaker: text" or "[Speaker] text"
      const speakerMatch = text.match(/^(?:\[([^\]]+)\]|([A-Za-z\s]+):)\s*(.*)/);
      const speaker = speakerMatch ? (speakerMatch[1] || speakerMatch[2]).trim() : '';
      const cleanText = speakerMatch ? speakerMatch[3].trim() : text;

      segments.push({ startTime, endTime, speaker, text: cleanText });
    }

    return segments;
  },

  /**
   * Parse WebVTT format
   */
  parseVTT(content) {
    const segments = [];
    // Remove WEBVTT header and any metadata
    const body = content.replace(/^WEBVTT.*?\r?\n\r?\n/is, '');
    const blocks = body.trim().split(/\r?\n\r?\n/);

    for (const block of blocks) {
      const lines = block.trim().split(/\r?\n/);
      let timeLineIdx = 0;

      // Find the timestamp line (may have an optional cue identifier before it)
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('-->')) {
          timeLineIdx = i;
          break;
        }
      }

      const timeLine = lines[timeLineIdx];
      if (!timeLine || !timeLine.includes('-->')) continue;

      const timeMatch = timeLine.match(
        /(?:(\d{2}):)?(\d{2}):(\d{2})[.](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[.](\d{3})/
      );
      if (!timeMatch) continue;

      const startTime = this.timeToSeconds(
        timeMatch[1] || '00', timeMatch[2], timeMatch[3], timeMatch[4]
      );
      const endTime = this.timeToSeconds(
        timeMatch[5] || '00', timeMatch[6], timeMatch[7], timeMatch[8]
      );

      const text = lines.slice(timeLineIdx + 1).join(' ').replace(/<[^>]*>/g, '').trim();
      if (!text) continue;

      const speakerMatch = text.match(/^(?:\[([^\]]+)\]|([A-Za-z\s]+):)\s*(.*)/);
      const speaker = speakerMatch ? (speakerMatch[1] || speakerMatch[2]).trim() : '';
      const cleanText = speakerMatch ? speakerMatch[3].trim() : text;

      segments.push({ startTime, endTime, speaker, text: cleanText });
    }

    return segments;
  },

  /**
   * Parse plain text into approximate segments.
   * Splits by sentences/paragraphs and assigns estimated timestamps.
   */
  parsePlainText(content) {
    const segments = [];
    // Split by paragraphs first, then by sentences within each paragraph
    const paragraphs = content.split(/\r?\n\r?\n/).filter(p => p.trim());
    const allSentences = [];

    for (const para of paragraphs) {
      // Split paragraph into sentences
      const sentences = para.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      for (const sentence of sentences) {
        allSentences.push(sentence.trim());
      }
    }

    if (allSentences.length === 0) {
      // If no sentences, treat each line as a segment
      const lines = content.split(/\r?\n/).filter(l => l.trim());
      for (let i = 0; i < lines.length; i++) {
        segments.push({
          startTime: 0,
          endTime: 0,
          speaker: '',
          text: lines[i].trim(),
        });
      }
    } else {
      // Estimate ~3 seconds per sentence as a rough heuristic
      const secsPerSentence = 3;
      for (let i = 0; i < allSentences.length; i++) {
        segments.push({
          startTime: i * secsPerSentence,
          endTime: (i + 1) * secsPerSentence,
          speaker: '',
          text: allSentences[i],
        });
      }
    }

    return segments;
  },

  /**
   * Convert timestamp components to total seconds
   */
  timeToSeconds(hours, minutes, seconds, millis) {
    return (
      parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10) +
      parseInt(millis, 10) / 1000
    );
  },

  /**
   * Group segments into overlapping chunks for retrieval.
   * Each chunk retains the timestamp span of its constituent segments.
   */
  chunkSegments(segments, options = {}) {
    const { targetWords = 200, overlapRatio = 0.2 } = options;
    const overlapWords = Math.floor(targetWords * overlapRatio);
    const chunks = [];

    let currentChunkSegments = [];
    let currentWordCount = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const segWordCount = seg.text.split(/\s+/).length;
      currentChunkSegments.push(seg);
      currentWordCount += segWordCount;

      if (currentWordCount >= targetWords || i === segments.length - 1) {
        // Emit chunk
        const chunkText = currentChunkSegments.map(s => {
          const prefix = s.speaker ? `[${s.speaker}] ` : '';
          return prefix + s.text;
        }).join(' ');

        chunks.push({
          text: chunkText,
          startTime: currentChunkSegments[0].startTime,
          endTime: currentChunkSegments[currentChunkSegments.length - 1].endTime,
          segmentRange: {
            start: i - currentChunkSegments.length + 1,
            end: i,
          }
        });

        // Compute overlap: keep the last N words worth of segments
        if (i < segments.length - 1) {
          let overlapCount = 0;
          const overlapSegs = [];
          for (let j = currentChunkSegments.length - 1; j >= 0; j--) {
            const wc = currentChunkSegments[j].text.split(/\s+/).length;
            overlapCount += wc;
            overlapSegs.unshift(currentChunkSegments[j]);
            if (overlapCount >= overlapWords) break;
          }
          currentChunkSegments = overlapSegs;
          currentWordCount = overlapCount;
        } else {
          currentChunkSegments = [];
          currentWordCount = 0;
        }
      }
    }

    return chunks;
  },

  /**
   * Get all segments for an episode (for transcript viewer)
   */
  getTranscriptSegments(episodeId) {
    return db.all(
      'SELECT * FROM transcript_segments WHERE episode_id = ? ORDER BY segment_index ASC',
      [episodeId]
    ).map(s => ({
      id: s.id,
      episodeId: s.episode_id,
      segmentIndex: s.segment_index,
      startTime: s.start_time,
      endTime: s.end_time,
      speaker: s.speaker,
      text: s.text,
    }));
  },
};

module.exports = ingestionService;
