/**
 * Input Validation Middleware
 * Uses express-validator to validate and sanitize request data.
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * Runs validation checks and returns 400 if any fail.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((e) => `${e.path}: ${e.msg}`).join('; ');
    return res.status(400).json({
      success: false,
      error: {
        message: `RAG API Validation Error: ${errorDetails}`,
        details: errors.array().map((e) => ({
          field: e.path,
          message: e.msg,
        })),
      },
    });
  }
  next();
}

// ─── Podcast Validators ─────────────────────────────────────────────────────

const validateCreatePodcast = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Podcast title is required')
    .isLength({ max: 300 })
    .withMessage('Title must not exceed 300 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('publisher')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Publisher must not exceed 200 characters'),
  handleValidationErrors,
];

// ─── Episode Validators ─────────────────────────────────────────────────────

const validateCreateEpisode = [
  body('podcastId')
    .trim()
    .notEmpty()
    .withMessage('Podcast ID is required')
    .isUUID()
    .withMessage('Invalid podcast ID format'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Episode title is required')
    .isLength({ max: 500 })
    .withMessage('Title must not exceed 500 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 5000 characters'),
  body('duration')
    .optional()
    .customSanitizer(val => parseInt(val, 10) || 0),
  body('audioUrl')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Audio URL must not exceed 2000 characters'),
  handleValidationErrors,
];

// ─── Transcript Upload Validators ───────────────────────────────────────────

const validateTranscriptUpload = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Transcript content is required')
    .isLength({ max: 500000 })
    .withMessage('Transcript must not exceed 500,000 characters'),
  body('format')
    .optional()
    .trim()
    .isIn(['srt', 'vtt', 'txt', 'plain'])
    .withMessage('Format must be one of: srt, vtt, txt, plain'),
  handleValidationErrors,
];

// ─── Chat / Message Validators ──────────────────────────────────────────────

const validateSendMessage = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 4000 })
    .withMessage('Message must not exceed 4000 characters'),
  handleValidationErrors,
];

const validateCreateConversation = [
  body('episodeId')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .isUUID()
    .withMessage('Invalid episode ID format'),
  body('documentId')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .isUUID()
    .withMessage('Invalid document ID format'),
  body('scope')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .isIn(['episode', 'document', 'library'])
    .withMessage('Scope must be one of: "episode", "document", or "library"'),
  handleValidationErrors,
];

const validateUUIDParam = [
  param('id')
    .trim()
    .isUUID()
    .withMessage('Invalid ID format'),
  handleValidationErrors,
];

// ─── Search Query Validator ────────────────────────────────────────────────

const validateSearchQuery = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query must not exceed 200 characters'),
  handleValidationErrors,
];

module.exports = {
  validateCreatePodcast,
  validateCreateEpisode,
  validateTranscriptUpload,
  validateSendMessage,
  validateCreateConversation,
  validateUUIDParam,
  validateSearchQuery,
  handleValidationErrors,
};
