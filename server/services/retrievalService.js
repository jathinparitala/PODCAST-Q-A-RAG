/**
 * Retrieval Service
 * Unified hybrid vector + keyword similarity search across Podcast Transcripts and PDF Documents.
 */

const db = require('../database/db');
const logger = require('../utils/logger');
const config = require('../config');

const retrievalService = {
  /**
   * Retrieve top-K relevant chunks across transcripts, PDFs, or both.
   *
   * @param {number[]} queryEmbedding
   * @param {object} options
   * @param {string|null} options.sourceType - 'podcast' | 'pdf' | 'all' (default 'all' if unspecified)
   * @param {string|null} options.episodeId - Scope to specific podcast episode
   * @param {string|null} options.documentId - Scope to specific PDF document
   * @param {string|null} options.userId - Scope to user's library
   * @param {string} options.queryText - Original query text
   * @param {number} options.topK - Top results count (default 5)
   * @returns {{ chunk: object, score: number, sourceType: string }[]}
   */
  retrieveRelevantChunks(queryEmbedding, options = {}) {
    const {
      sourceType = 'all',
      episodeId = null,
      documentId = null,
      userId = null,
      queryText = '',
      topK = 5,
    } = options;

    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'today', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would', 'could', 'ought', 'they', 'them', 'their', 'theirs', 'themselves']);

    const queryTerms = queryText.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stopWords.has(w));

    // Check if query explicitly asks for a page number e.g. "page 10" or "page 5"
    const pageMatch = queryText.match(/page\s+(\d+)/i);
    const targetPageNum = pageMatch ? parseInt(pageMatch[1], 10) : null;

    const allScoredResults = [];

    // ─── 1. Retrieve Transcript Chunks (if sourceType is 'podcast' or 'all') ───────
    if (sourceType === 'podcast' || sourceType === 'all' || episodeId) {
      let transcriptChunks = [];
      if (episodeId) {
        transcriptChunks = db.all('SELECT tc.*, e.title as episode_title FROM transcript_chunks tc JOIN episodes e ON tc.episode_id = e.id WHERE tc.episode_id = ?', [episodeId]);
      } else if (userId) {
        transcriptChunks = db.all(`
          SELECT tc.*, e.title as episode_title FROM transcript_chunks tc
          JOIN episodes e ON tc.episode_id = e.id
          JOIN podcasts p ON e.podcast_id = p.id
          WHERE p.user_id = ?
        `, [userId]);
      } else {
        transcriptChunks = db.all('SELECT tc.*, e.title as episode_title FROM transcript_chunks tc JOIN episodes e ON tc.episode_id = e.id');
      }

      for (const chunk of transcriptChunks) {
        const score = this._scoreChunk(chunk, queryEmbedding, queryTerms, chunk.chunk_text);
        if (score.isRelevant) {
          allScoredResults.push({
            sourceType: 'podcast',
            score: score.score,
            chunk: {
              id: chunk.id,
              episodeId: chunk.episode_id,
              episodeTitle: chunk.episode_title,
              chunkIndex: chunk.chunk_index,
              text: chunk.chunk_text,
              startTime: chunk.start_time,
              endTime: chunk.end_time,
            },
          });
        }
      }
    }

    // ─── 2. Retrieve PDF Document Chunks (if sourceType is 'pdf' or 'all') ─────────
    if (sourceType === 'pdf' || sourceType === 'all' || documentId) {
      let pdfChunks = [];
      if (documentId) {
        pdfChunks = db.all('SELECT dc.*, d.file_name FROM document_chunks dc JOIN documents d ON dc.document_id = d.id WHERE dc.document_id = ?', [documentId]);
      } else if (userId) {
        pdfChunks = db.all(`
          SELECT dc.*, d.file_name FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE d.user_id = ?
        `, [userId]);
      } else {
        pdfChunks = db.all('SELECT dc.*, d.file_name FROM document_chunks dc JOIN documents d ON dc.document_id = d.id');
      }

      for (const chunk of pdfChunks) {
        let scoreObj = this._scoreChunk(chunk, queryEmbedding, queryTerms, chunk.chunk_text);
        let score = scoreObj.score;
        let isRelevant = scoreObj.isRelevant;

        // Boost score if chunk matches target page number requested in query
        if (targetPageNum && chunk.page_number === targetPageNum) {
          score = Math.min(1.0, score + 0.4);
          isRelevant = true;
        }

        if (isRelevant) {
          allScoredResults.push({
            sourceType: 'pdf',
            score,
            chunk: {
              id: chunk.id,
              documentId: chunk.document_id,
              documentName: chunk.file_name,
              chunkIndex: chunk.chunk_index,
              text: chunk.chunk_text,
              pageNumber: chunk.page_number,
              sectionHeading: chunk.section_heading,
            },
          });
        }
      }
    }

    // Sort all results by score descending
    allScoredResults.sort((a, b) => b.score - a.score);
    const topResults = allScoredResults.slice(0, topK);

    logger.debug(`Unified Retrieval: ${allScoredResults.length} relevant chunks found across ${sourceType}, returning top ${topResults.length}`);
    return topResults;
  },

  _scoreChunk(chunk, queryEmbedding, queryTerms, textContent) {
    let vectorScore = 0;
    if (chunk.embedding && queryEmbedding && queryEmbedding.length > 0) {
      try {
        const chunkEmbedding = JSON.parse(chunk.embedding);
        vectorScore = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
      } catch (parseErr) {
        vectorScore = 0;
      }
    }

    let keywordScore = 0;
    if (queryTerms.length > 0 && textContent) {
      const textLower = textContent.toLowerCase();
      let matches = 0;
      for (const term of queryTerms) {
        const stem = term.length > 4 ? term.slice(0, 4) : term;
        const stemRegex = new RegExp('\\b' + stem, 'i');
        if (stemRegex.test(textLower)) {
          matches++;
        }
      }
      keywordScore = matches / queryTerms.length;
    }

    const hybridScore = Math.max(vectorScore, vectorScore * 0.6 + keywordScore * 0.4);
    const isFallbackMode = !config.aiApiKey || config.aiApiKey === 'your_google_ai_api_key_here';

    let isRelevant = false;
    if (isFallbackMode) {
      isRelevant = keywordScore >= 0.2;
    } else if (keywordScore > 0) {
      isRelevant = hybridScore >= 0.15 || keywordScore >= 0.3;
    } else {
      isRelevant = vectorScore >= 0.35;
    }

    return { score: Math.min(1.0, hybridScore), isRelevant };
  },

  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  },
};

module.exports = retrievalService;
