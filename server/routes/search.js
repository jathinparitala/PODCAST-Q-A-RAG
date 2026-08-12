/**
 * Global Search Router
 * Searches podcasts, episodes, transcripts, and PDF documents for a matching query.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const db = require('../database/db');
const { validateSearchQuery } = require('../middleware/validator');

/**
 * GET /api/search?q=...
 */
router.get('/', authenticateToken, validateSearchQuery, (req, res, next) => {
  try {
    const userId = req.user.id;
    const queryStr = (req.query.q || '').trim();

    if (!queryStr) {
      return res.json({
        success: true,
        results: { podcasts: [], episodes: [], documents: [], transcripts: [] }
      });
    }

    const pattern = `%${queryStr.toLowerCase()}%`;

    // 1. Search Podcasts
    const podcasts = db.all(`
      SELECT * FROM podcasts
      WHERE user_id = ? AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(publisher) LIKE ?)
      ORDER BY updated_at DESC LIMIT 5
    `, [userId, pattern, pattern, pattern]);

    // 2. Search Episodes
    const episodes = db.all(`
      SELECT e.*, p.title as podcast_title FROM episodes e
      JOIN podcasts p ON e.podcast_id = p.id
      WHERE p.user_id = ? AND (LOWER(e.title) LIKE ? OR LOWER(e.description) LIKE ?)
      ORDER BY e.created_at DESC LIMIT 5
    `, [userId, pattern, pattern]);

    // 3. Search Transcripts
    const transcripts = db.all(`
      SELECT tc.id, tc.episode_id, tc.chunk_text, tc.start_time, tc.end_time, e.title as episode_title
      FROM transcript_chunks tc
      JOIN episodes e ON tc.episode_id = e.id
      JOIN podcasts p ON e.podcast_id = p.id
      WHERE p.user_id = ? AND LOWER(tc.chunk_text) LIKE ?
      ORDER BY tc.created_at DESC LIMIT 5
    `, [userId, pattern]);

    // 4. Search PDF Documents
    const documents = db.all(`
      SELECT * FROM documents
      WHERE user_id = ? AND LOWER(file_name) LIKE ?
      ORDER BY updated_at DESC LIMIT 5
    `, [userId, pattern]);

    // 5. Search PDF Chunks
    const pdfChunks = db.all(`
      SELECT dc.id, dc.document_id, dc.chunk_text, dc.page_number, d.file_name as document_name
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE d.user_id = ? AND LOWER(dc.chunk_text) LIKE ?
      ORDER BY dc.created_at DESC LIMIT 5
    `, [userId, pattern]);

    return res.json({
      success: true,
      query: queryStr,
      results: {
        podcasts: podcasts.map(p => ({ id: p.id, title: p.title, description: p.description, publisher: p.publisher })),
        episodes: episodes.map(e => ({ id: e.id, title: e.title, podcastTitle: e.podcast_title, description: e.description })),
        transcripts: transcripts.map(t => ({ id: t.id, episodeId: t.episode_id, episodeTitle: t.episode_title, snippet: t.chunk_text.substring(0, 150) + '...', startTime: t.start_time, endTime: t.end_time })),
        documents: documents.map(d => ({ id: d.id, fileName: d.file_name, pageCount: d.page_count, status: d.status })),
        pdfChunks: pdfChunks.map(pc => ({ id: pc.id, documentId: pc.document_id, documentName: pc.document_name, pageNumber: pc.page_number, snippet: pc.chunk_text.substring(0, 150) + '...' })),
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
