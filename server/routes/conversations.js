/**
 * Conversations Router
 * Q&A conversation management and RAG-powered message handling for Podcasts and PDFs.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateCreateConversation, validateSendMessage } = require('../middleware/validator');
const conversationService = require('../services/conversationService');
const ragOrchestrationService = require('../services/ragOrchestrationService');
const logger = require('../utils/logger');

/**
 * GET /api/conversations — List user's conversations
 */
router.get('/', authenticateToken, (req, res, next) => {
  try {
    const episodeId = req.query.episodeId || null;
    const conversations = conversationService.getUserConversations(req.user.id, episodeId);
    return res.json({ success: true, conversations });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/conversations — Start a new conversation
 */
router.post('/', authenticateToken, validateCreateConversation, (req, res, next) => {
  try {
    const { episodeId, documentId, scope, title } = req.body;
    const conversation = conversationService.createConversation(req.user.id, {
      episodeId, documentId, scope, title
    });
    return res.status(201).json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/conversations/:id — Load a conversation with messages + citations
 */
router.get('/:id', authenticateToken, (req, res, next) => {
  try {
    const conversation = conversationService.getConversationWithMessages(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: { message: 'Conversation not found' } });
    }

    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    return res.json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/conversations/:id/messages — Ask a question (triggers RAG loop)
 */
router.post('/:id/messages', authenticateToken, validateSendMessage, async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const { message, sourceType } = req.body;

    const conv = conversationService.getConversationById(conversationId);
    if (!conv) {
      return res.status(404).json({ error: { message: 'Conversation not found' } });
    }
    if (conv.userId !== req.user.id) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Determine default sourceType
    let effectiveSourceType = sourceType;
    if (!effectiveSourceType) {
      if (conv.documentId) effectiveSourceType = 'pdf';
      else if (conv.episodeId) effectiveSourceType = 'podcast';
      else effectiveSourceType = 'all';
    }

    // Run the unified RAG pipeline
    const result = await ragOrchestrationService.processQuestion({
      conversationId,
      question: message,
      episodeId: conv.episodeId,
      documentId: conv.documentId,
      sourceType: effectiveSourceType,
      userId: req.user.id,
    });

    return res.json({
      success: true,
      message: result.message,
      citations: result.citations,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/conversations/:id — Delete a conversation
 */
router.delete('/:id', authenticateToken, (req, res, next) => {
  try {
    conversationService.deleteConversation(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Conversation deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
