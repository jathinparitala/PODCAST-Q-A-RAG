/**
 * Podcast & Episode Service
 * CRUD operations for podcast and episode entities.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const logger = require('../utils/logger');
const { createError } = require('../utils/errors');

const podcastService = {
  // ─── Podcasts ──────────────────────────────────────────────────────────────

  createPodcast(userId, { title, description, publisher, coverImageUrl }) {
    const id = uuidv4();
    db.run(`
      INSERT INTO podcasts (id, user_id, title, description, publisher, cover_image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, userId, title, description || '', publisher || '', coverImageUrl || '']);

    return this.getPodcastById(id);
  },

  getPodcasts(userId, searchQuery) {
    this.ensureSampleDataForUser(userId);

    let sql = 'SELECT * FROM podcasts WHERE user_id = ?';
    const params = [userId];

    if (searchQuery) {
      sql += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(publisher) LIKE ?)';
      const q = `%${searchQuery.toLowerCase()}%`;
      params.push(q, q, q);
    }

    sql += ' ORDER BY updated_at DESC';
    const podcasts = db.all(sql, params);

    // Attach episode counts
    return podcasts.map(p => {
      const episodeCount = db.get('SELECT COUNT(*) as count FROM episodes WHERE podcast_id = ?', [p.id]);
      return {
        ...this.formatPodcast(p),
        episodeCount: episodeCount ? episodeCount.count : 0,
      };
    });
  },

  ensureSampleDataForUser(userId) {
    if (!userId) return;
    try {
      const existing = db.all('SELECT id FROM podcasts WHERE user_id = ?', [userId]);
      if (existing && existing.length > 0) return;

      const podcastId = uuidv4();
      db.run(`
        INSERT INTO podcasts (id, user_id, title, description, publisher, cover_image_url)
        VALUES (?, ?, 'AI Tech Talks', 'Deep dives into Generative AI, RAG architectures, embeddings, and vector databases.', 'Tech Insights', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&auto=format&fit=crop&q=80')
      `, [podcastId, userId]);

      const episodeId = uuidv4();
      db.run(`
        INSERT INTO episodes (id, podcast_id, title, description, publish_date, duration, audio_url, transcript_status, transcript_format)
        VALUES (?, ?, 'Understanding Generative AI and RAG', 'Overview of Generative AI, RAG pipelines, embeddings, vector databases, chunking, reranking, and fine-tuning.', '2026-08-01', 300, '', 'ready', 'txt')
      `, [episodeId, podcastId]);

      const sampleTranscript = `Speaker 1: Welcome to The Future of Artificial Intelligence. Today we are discussing generative AI and Retrieval-Augmented Generation.
Speaker 2: Generative AI refers to artificial intelligence systems that can generate new content such as text, images, audio, and code.
Speaker 1: Large language models are powerful models trained on large amounts of text. However, they may not always have access to current or private information.
Speaker 2: Retrieval-Augmented Generation, or RAG, addresses this problem by retrieving relevant information from an external knowledge source and providing that information to the language model as context.
Speaker 1: A typical RAG pipeline contains several steps. First, documents are collected and divided into smaller chunks. These chunks are converted into numerical representations called embeddings.
Speaker 2: The embeddings are stored in a vector database. When a user asks a question, the question is also converted into an embedding. The system then searches for the most relevant chunks using similarity search.
Speaker 1: The retrieved information is then provided to the language model. The model uses this context to generate an answer that is grounded in the retrieved information.
Speaker 2: One important advantage of RAG is that it can work with private or frequently changing information without retraining the entire language model.
Speaker 1: However, RAG does not completely eliminate hallucinations. If the retrieval system retrieves irrelevant or incorrect information, the generated answer can still be inaccurate.
Speaker 2: Chunking is also important. If chunks are too large, retrieval may include unnecessary information. If chunks are too small, important context may be lost.
Speaker 1: Reranking can improve retrieval quality by taking the initially retrieved documents and ordering them according to their relevance to the question.
Speaker 2: Hybrid search combines keyword-based search with semantic search. This can improve retrieval because exact keywords and semantic meaning are both considered.
Speaker 1: RAG and fine-tuning are different approaches. RAG provides external information during the question-answering process, while fine-tuning changes the model through additional training.
Speaker 2: The future of AI will likely involve systems that combine language models, retrieval, tools, and AI agents to solve increasingly complex tasks.`;

      const ingestionService = require('./ingestionService');
      const embeddingService = require('./embeddingService');
      ingestionService.processTranscript(episodeId, sampleTranscript, 'txt', embeddingService).catch(err => {
        logger.error(`Error auto-seeding sample transcript: ${err.message}`);
      });
    } catch (err) {
      logger.error(`Failed to seed sample podcast for user ${userId}: ${err.message}`);
    }
  },

  getPodcastById(id) {
    const row = db.get('SELECT * FROM podcasts WHERE id = ?', [id]);
    if (!row) return null;
    const episodeCount = db.get('SELECT COUNT(*) as count FROM episodes WHERE podcast_id = ?', [id]);
    return {
      ...this.formatPodcast(row),
      episodeCount: episodeCount ? episodeCount.count : 0,
    };
  },

  updatePodcast(id, userId, { title, description, publisher, coverImageUrl }) {
    const existing = db.get('SELECT id FROM podcasts WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existing) {
      throw createError('Podcast not found', 404);
    }

    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (publisher !== undefined) { updates.push('publisher = ?'); params.push(publisher); }
    if (coverImageUrl !== undefined) { updates.push('cover_image_url = ?'); params.push(coverImageUrl); }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      db.run(`UPDATE podcasts SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return this.getPodcastById(id);
  },

  deletePodcast(id, userId) {
    const existing = db.get('SELECT id FROM podcasts WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existing) {
      const error = new Error('Podcast not found');
      error.statusCode = 404;
      throw error;
    }

    db.run('DELETE FROM podcasts WHERE id = ?', [id]);
    return { success: true };
  },

  // ─── Episodes ──────────────────────────────────────────────────────────────

  createEpisode(userId, { podcastId, title, description, publishDate, duration, audioUrl }) {
    // Verify podcast ownership
    const podcast = db.get('SELECT id FROM podcasts WHERE id = ? AND user_id = ?', [podcastId, userId]);
    if (!podcast) {
      throw createError('Podcast not found', 404);
    }

    const id = uuidv4();
    db.run(`
      INSERT INTO episodes (id, podcast_id, title, description, publish_date, duration, audio_url, transcript_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [id, podcastId, title, description || '', publishDate || '', duration || 0, audioUrl || '']);

    return this.getEpisodeById(id);
  },

  getEpisodes(podcastId) {
    const episodes = db.all('SELECT * FROM episodes WHERE podcast_id = ? ORDER BY created_at DESC', [podcastId]);
    return episodes.map(e => this.formatEpisode(e));
  },

  getEpisodeById(id) {
    const row = db.get('SELECT * FROM episodes WHERE id = ?', [id]);
    if (!row) return null;
    return this.formatEpisode(row);
  },

  updateTranscriptStatus(episodeId, status, hasApproximateTiming = false) {
    db.run(
      'UPDATE episodes SET transcript_status = ?, has_approximate_timing = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, hasApproximateTiming ? 1 : 0, episodeId]
    );
    logger.info(`Episode ${episodeId} transcript status → ${status}`);
  },

  getTranscriptStatus(episodeId) {
    const row = db.get('SELECT transcript_status, has_approximate_timing FROM episodes WHERE id = ?', [episodeId]);
    if (!row) return null;
    return {
      status: row.transcript_status,
      hasApproximateTiming: Boolean(row.has_approximate_timing),
    };
  },

  // ─── Formatters ────────────────────────────────────────────────────────────

  formatPodcast(row) {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      publisher: row.publisher,
      coverImageUrl: row.cover_image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  formatEpisode(row) {
    return {
      id: row.id,
      podcastId: row.podcast_id,
      title: row.title,
      description: row.description,
      publishDate: row.publish_date,
      duration: row.duration,
      audioUrl: row.audio_url,
      transcriptStatus: row.transcript_status,
      transcriptFormat: row.transcript_format,
      hasApproximateTiming: Boolean(row.has_approximate_timing),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

module.exports = podcastService;
