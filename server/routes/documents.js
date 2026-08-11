/**
 * Documents Router — PDF Upload & Management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const pdfService = require('../services/pdfService');
const embeddingService = require('../services/embeddingService');
const logger = require('../utils/logger');

/**
 * POST /api/documents — Upload PDF (Base64 fileData payload)
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { fileName, fileData, fileSize } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({
        error: { message: 'File name and file content (base64) are required.' }
      });
    }

    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({
        error: { message: 'Only PDF documents (.pdf) are supported.' }
      });
    }

    // Convert Base64 data to Buffer
    let cleanBase64 = fileData;
    if (fileData.includes(',')) {
      cleanBase64 = fileData.split(',')[1];
    }
    const fileBuffer = Buffer.from(cleanBase64, 'base64');

    if (fileBuffer.length === 0) {
      return res.status(400).json({
        error: { message: 'Uploaded PDF file is empty.' }
      });
    }

    // 1. Create document entry
    const document = pdfService.createDocument(req.user.id, {
      fileName,
      fileSize: fileSize || fileBuffer.length
    });

    // 2. Respond immediately to user
    res.status(201).json({
      success: true,
      message: 'PDF upload received. Processing has started.',
      document
    });

    // 3. Process PDF asynchronously in background
    pdfService.processPdfDocument(document.id, fileBuffer, embeddingService)
      .then(result => {
        logger.info(`Async PDF ingestion complete for document ${document.id}`, result);
      })
      .catch(err => {
        logger.error(`Async PDF ingestion failed for document ${document.id}: ${err.message}`);
      });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents — List user's documents
 */
router.get('/', authenticateToken, (req, res, next) => {
  try {
    const documents = pdfService.getDocuments(req.user.id);
    return res.json({ success: true, documents });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:id — Get document detail
 */
router.get('/:id', authenticateToken, (req, res, next) => {
  try {
    const document = pdfService.getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: { message: 'Document not found' } });
    }
    return res.json({ success: true, document });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:id/status — Poll document status
 */
router.get('/:id/status', authenticateToken, (req, res, next) => {
  try {
    const document = pdfService.getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: { message: 'Document not found' } });
    }
    return res.json({
      success: true,
      status: document.status,
      pageCount: document.pageCount,
      errorMessage: document.errorMessage
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/documents/:id — Delete document
 */
router.delete('/:id', authenticateToken, (req, res, next) => {
  try {
    pdfService.deleteDocument(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
