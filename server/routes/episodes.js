/**
 * Episodes Router
 * Episode CRUD, transcript upload, ingestion status, and transcript retrieval.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateCreateEpisode, validateTranscriptUpload } = require('../middleware/validator');
const podcastService = require('../services/podcastService');
const ingestionService = require('../services/ingestionService');
const embeddingService = require('../services/embeddingService');
const logger = require('../utils/logger');

/**
 * POST /api/episodes — Create an episode
 */
router.post('/', authenticateToken, validateCreateEpisode, (req, res, next) => {
  try {
    const { podcastId, title, description, publishDate, duration, audioUrl } = req.body;
    const episode = podcastService.createEpisode(req.user.id, {
      podcastId, title, description, publishDate, duration, audioUrl
    });
    return res.status(201).json({ success: true, episode });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/episodes/:id — Get episode detail
 */
router.get('/:id', authenticateToken, (req, res, next) => {
  try {
    const episode = podcastService.getEpisodeById(req.params.id);
    if (!episode) {
      return res.status(404).json({ error: { message: 'Episode not found' } });
    }
    return res.json({ success: true, episode });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/episodes/:id/transcript — Upload/paste a transcript, triggers ingestion
 */
router.post('/:id/transcript', authenticateToken, validateTranscriptUpload, async (req, res, next) => {
  try {
    const episodeId = req.params.id;
    const { content, format } = req.body;

    // Verify episode exists
    const episode = podcastService.getEpisodeById(episodeId);
    if (!episode) {
      return res.status(404).json({ error: { message: 'Episode not found' } });
    }

    // Immediately mark as processing and return
    podcastService.updateTranscriptStatus(episodeId, 'processing');

    // Return immediately — ingestion runs async
    res.json({
      success: true,
      message: 'Transcript upload received. Ingestion has started.',
      status: 'processing',
    });

    // Process asynchronously (don't await — fire and forget)
    ingestionService.processTranscript(episodeId, content, format, embeddingService)
      .then(result => {
        logger.info(`Async ingestion complete for episode ${episodeId}`, result);
      })
      .catch(err => {
        logger.error(`Async ingestion failed for episode ${episodeId}: ${err.message}`);
      });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/episodes/:id/transcript/status — Poll ingestion status
 */
router.get('/:id/transcript/status', authenticateToken, (req, res, next) => {
  try {
    const status = podcastService.getTranscriptStatus(req.params.id);
    if (!status) {
      return res.status(404).json({ error: { message: 'Episode not found' } });
    }
    return res.json({ success: true, ...status });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/episodes/:id/transcript — Fetch the full parsed transcript
 */
router.get('/:id/transcript', authenticateToken, (req, res, next) => {
  try {
    const episode = podcastService.getEpisodeById(req.params.id);
    if (!episode) {
      return res.status(404).json({ error: { message: 'Episode not found' } });
    }

    const segments = ingestionService.getTranscriptSegments(req.params.id);
    return res.json({
      success: true,
      episodeId: req.params.id,
      transcriptStatus: episode.transcriptStatus,
      hasApproximateTiming: episode.hasApproximateTiming,
      segments,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
