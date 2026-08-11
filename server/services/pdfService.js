/**
 * PDF Service
 * Handles PDF text extraction (page-by-page), scanned PDF detection,
 * page-aware chunking, vector embedding generation, and DB persistence.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../database/db');
const logger = require('../utils/logger');
const { createError } = require('../utils/errors');

let pdfParse = null;

function ensurePdfParserEnvironment() {
  if (typeof global.DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix {
      constructor() {}
    };
  }

  if (typeof global.ImageData === 'undefined') {
    global.ImageData = class ImageData {
      constructor(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    };
  }

  if (typeof global.Path2D === 'undefined') {
    global.Path2D = class Path2D {
      constructor(path) {
        this.path = path;
      }
    };
  }
}

function loadPdfParse() {
  if (!pdfParse) {
    ensurePdfParserEnvironment();
    try {
      pdfParse = require('pdf-parse');
    } catch (err) {
      logger.error('Failed to load pdf-parse module:', err.message);
      throw createError('PDF processing is unavailable in this deployment environment.', 500);
    }
  }
  return pdfParse;
}

const pdfService = {
  /**
   * Create document record in DB
   */
  createDocument(userId, { fileName, fileSize }) {
    const id = uuidv4();
    db.run(`
      INSERT INTO documents (id, user_id, file_name, file_size, page_count, status)
      VALUES (?, ?, ?, ?, 0, 'pending')
    `, [id, userId, fileName, fileSize || 0]);

    return this.getDocumentById(id);
  },

  /**
   * Fetch all documents for user
   */
  getDocuments(userId) {
    const rows = db.all('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return rows.map(r => this.formatDocument(r));
  },

  /**
   * Fetch single document by ID
   */
  getDocumentById(id) {
    const row = db.get('SELECT * FROM documents WHERE id = ?', [id]);
    if (!row) return null;
    return this.formatDocument(row);
  },

  /**
   * Delete document and its pages/chunks
   */
  deleteDocument(id, userId) {
    const doc = db.get('SELECT id FROM documents WHERE id = ? AND user_id = ?', [id, userId]);
    if (!doc) {
      const error = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

    db.run('DELETE FROM documents WHERE id = ?', [id]);
    return { success: true };
  },

  /**
   * Update status
   */
  updateDocumentStatus(id, status, pageCount = 0, errorMessage = '') {
    db.run(`
      UPDATE documents
      SET status = ?, page_count = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, pageCount, errorMessage || '', id]);

    logger.info(`Document ${id} status updated to: ${status}`);
  },

  /**
   * Full PDF Ingestion Pipeline:
   * Read PDF → Page-by-Page Extraction → Scanned PDF Check → Page-Aware Chunking → Embedding → DB
   */
  async processPdfDocument(documentId, fileBuffer, embeddingService) {
    try {
      this.updateDocumentStatus(documentId, 'processing');

      const doc = this.getDocumentById(documentId);
      if (!doc) throw new Error('Document record not found.');

      // 1. Clean existing data if re-processing
      db.run('DELETE FROM document_pages WHERE document_id = ?', [documentId]);
      db.run('DELETE FROM document_chunks WHERE document_id = ?', [documentId]);

      // 2. Page-by-page text extraction
      const extractedPages = await this.extractPdfPages(fileBuffer);

      if (!extractedPages || extractedPages.pages.length === 0) {
        throw new Error('Failed to extract pages from PDF.');
      }

      // Calculate total extracted text length
      const totalText = extractedPages.pages.map(p => p.text).join(' ').trim();

      // Check if scanned/empty PDF (less than 20 characters)
      if (totalText.length < 20) {
        const scanError = 'This PDF appears to be scanned or contains no extractable text.';
        this.updateDocumentStatus(documentId, 'failed', extractedPages.pages.length, scanError);
        throw new Error(scanError);
      }

      // 3. Persist document pages
      for (const page of extractedPages.pages) {
        db.run(`
          INSERT INTO document_pages (id, document_id, page_number, page_text)
          VALUES (?, ?, ?, ?)
        `, [uuidv4(), documentId, page.pageNumber, page.text]);
      }

      logger.info(`Extracted ${extractedPages.pages.length} pages for document ${documentId}`);

      // 4. Create page-aware chunks
      const chunks = this.chunkPages(extractedPages.pages, { targetWords: 200, overlapRatio: 0.2 });
      logger.info(`Created ${chunks.length} page-aware chunks for document ${documentId}`);

      // 5. Generate embeddings and persist chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const contentHash = crypto.createHash('md5').update(chunk.text).digest('hex');

        let embeddingJson = '';
        try {
          const embedding = await embeddingService.generateEmbedding(chunk.text);
          embeddingJson = JSON.stringify(embedding);
        } catch (embErr) {
          logger.warn(`Embedding failed for document chunk ${i}: ${embErr.message}`);
          embeddingJson = '';
        }

        db.run(`
          INSERT INTO document_chunks (id, document_id, chunk_index, chunk_text, page_number, section_heading, embedding, content_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), documentId, i, chunk.text, chunk.pageNumber, chunk.sectionHeading || '', embeddingJson, contentHash]);
      }

      // 6. Update document status to ready
      this.updateDocumentStatus(documentId, 'ready', extractedPages.pages.length);
      logger.info(`PDF processing complete for ${documentId}: ${chunks.length} chunks indexed`);

      return { success: true, pageCount: extractedPages.pages.length, chunkCount: chunks.length };
    } catch (err) {
      logger.error(`PDF processing failed for ${documentId}: ${err.message}`);
      this.updateDocumentStatus(documentId, 'failed', 0, err.message);
      throw err;
    }
  },

  /**
   * Extract page-by-page text from PDF Buffer (v1 & v2 compatible)
   */
  async extractPdfPages(fileBuffer) {
    const pdfModule = loadPdfParse();
    const pages = [];

    // Case A: pdf-parse v1 (Function signature: pdfParse(buffer, options))
    if (typeof pdfModule === 'function') {
      const options = {
        pagerender: async function (pageData) {
          try {
            const textContent = await pageData.getTextContent();
            let lastY, text = '';
            for (const item of textContent.items) {
              if (lastY === item.transform[5] || !lastY) {
                text += item.str + ' ';
              } else {
                text += '\n' + item.str + ' ';
              }
              lastY = item.transform[5];
            }
            const cleanPageText = text.replace(/\s+/g, ' ').replace(/\0/g, '').trim();
            const pageNum = pageData.pageIndex + 1;
            pages.push({ pageNumber: pageNum, text: cleanPageText });
            return cleanPageText;
          } catch (pageErr) {
            return '';
          }
        }
      };

      const parsed = await pdfModule(fileBuffer, options);
      pages.sort((a, b) => a.pageNumber - b.pageNumber);
      return { numPages: parsed.numpages || pages.length, pages };
    }

    // Case B: pdf-parse v2+ (Object / Class signature: new PDFParse({ data: buffer }))
    const PDFParseClass = pdfModule.PDFParse || pdfModule.default || pdfModule;
    if (typeof PDFParseClass === 'function') {
      const parser = new PDFParseClass({ data: fileBuffer });
      const result = await parser.getText();

      if (result && Array.isArray(result.pages)) {
        for (const p of result.pages) {
          const cleanText = (p.text || '').replace(/\s+/g, ' ').replace(/\0/g, '').trim();
          pages.push({
            pageNumber: p.num || p.pageNumber || (pages.length + 1),
            text: cleanText,
          });
        }
      }
      return { numPages: result.total || pages.length, pages };
    }

    throw new Error('PDF parser module format is unrecognized');
  },

  /**
   * Chunk extracted pages into page-aware context blocks
   */
  chunkPages(pages, options = {}) {
    const { targetWords = 200, overlapRatio = 0.2 } = options;
    const overlapWords = Math.floor(targetWords * overlapRatio);
    const chunks = [];

    for (const page of pages) {
      if (!page.text || page.text.trim().length === 0) continue;

      const words = page.text.trim().split(/\s+/);
      if (words.length <= targetWords) {
        chunks.push({
          pageNumber: page.pageNumber,
          text: page.text.trim(),
          sectionHeading: `Page ${page.pageNumber}`,
        });
      } else {
        let i = 0;
        let chunkIdx = 1;
        while (i < words.length) {
          const chunkWords = words.slice(i, i + targetWords);
          chunks.push({
            pageNumber: page.pageNumber,
            text: chunkWords.join(' '),
            sectionHeading: `Page ${page.pageNumber} (Part ${chunkIdx})`,
          });
          chunkIdx++;
          i += (targetWords - overlapWords);
        }
      }
    }

    return chunks;
  },

  /**
   * Format document record
   */
  formatDocument(row) {
    return {
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      fileSize: row.file_size,
      pageCount: row.page_count,
      status: row.status,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

module.exports = pdfService;
