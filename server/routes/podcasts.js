/**
 * Podcasts Router
 * CRUD operations for podcasts.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateCreatePodcast, validateSearchQuery } = require('../middleware/validator');
const podcastService = require('../services/podcastService');

/**
 * GET /api/podcasts — List/search user's podcasts
 */
router.get('/', authenticateToken, validateSearchQuery, (req, res, next) => {
  try {
    const podcasts = podcastService.getPodcasts(req.user.id, req.query.q);
    return res.json({ success: true, podcasts });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/podcasts — Create a podcast
 */
router.post('/', authenticateToken, validateCreatePodcast, (req, res, next) => {
  try {
    const { title, description, publisher, coverImageUrl } = req.body;
    const podcast = podcastService.createPodcast(req.user.id, { title, description, publisher, coverImageUrl });
    return res.status(201).json({ success: true, podcast });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/podcasts/:id — Get podcast detail
 */
router.get('/:id', authenticateToken, (req, res, next) => {
  try {
    const podcast = podcastService.getPodcastById(req.params.id);
    if (!podcast) {
      return res.status(404).json({ error: { message: 'Podcast not found' } });
    }
    return res.json({ success: true, podcast });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/podcasts/:id — Update podcast
 */
router.put('/:id', authenticateToken, (req, res, next) => {
  try {
    const podcast = podcastService.updatePodcast(req.params.id, req.user.id, req.body);
    return res.json({ success: true, podcast });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/podcasts/:id — Delete podcast
 */
router.delete('/:id', authenticateToken, (req, res, next) => {
  try {
    podcastService.deletePodcast(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Podcast deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/podcasts/:id/episodes — List episodes for a podcast
 */
router.get('/:id/episodes', authenticateToken, (req, res, next) => {
  try {
    const episodes = podcastService.getEpisodes(req.params.id);
    return res.json({ success: true, episodes });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
