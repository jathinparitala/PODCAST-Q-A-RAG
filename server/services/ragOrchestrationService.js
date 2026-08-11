/**
 * RAG Orchestration Service
 * Ties the full retrieval-augmented generation pipeline together per query:
 * 1. Embed user question
 * 2. Retrieve relevant chunks (Podcast Transcripts, PDFs, or All Sources)
 * 3. Generate grounded answer
 * 4. Persist message and citations (Timestamps for Transcripts, Page numbers for PDFs)
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const logger = require('../utils/logger');
const embeddingService = require('./embeddingService');
const retrievalService = require('./retrievalService');
const generationService = require('./generationService');

const ragOrchestrationService = {
  /**
   * Process a user's question through the full RAG pipeline.
   *
   * @param {object} params
   * @param {string} params.conversationId - The conversation this message belongs to
   * @param {string} params.question - The user's question text
   * @param {string|null} params.episodeId - Episode scope
   * @param {string|null} params.documentId - Document scope
   * @param {string|null} params.sourceType - 'podcast' | 'pdf' | 'all'
   * @param {string} params.userId - The requesting user's ID
   * @returns {Promise<{ message: object, citations: object[] }>}
   */
  async processQuestion({ conversationId, question, episodeId, documentId, sourceType = 'all', userId }) {
    logger.info(`RAG pipeline started for conversation ${conversationId} (sourceType: ${sourceType})`);

    // 1. Persist the user's message
    const userMessageId = uuidv4();
    db.run(`
      INSERT INTO messages (id, conversation_id, role, content)
      VALUES (?, ?, 'user', ?)
    `, [userMessageId, conversationId, question]);

    // Update conversation timestamp and title if it's the first message
    const conv = db.get('SELECT title FROM conversations WHERE id = ?', [conversationId]);
    if (conv && conv.title === 'New Conversation') {
      const shortTitle = question.length > 60 ? question.substring(0, 57) + '...' : question;
      db.run('UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [shortTitle, conversationId]);
    } else {
      db.run('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);
    }

    try {
      // 2. Embed the user's question
      const queryEmbedding = await embeddingService.generateEmbedding(question);

      // 3. Retrieve relevant chunks (Unified vector + keyword search)
      const retrievalOptions = {
        sourceType,
        episodeId,
        documentId,
        userId,
        queryText: question,
        topK: 5,
      };
      const retrievedChunks = retrievalService.retrieveRelevantChunks(queryEmbedding, retrievalOptions);

      // 4. Load recent conversation history for context
      const recentMessages = db.all(`
        SELECT role, content FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `, [conversationId]).reverse();

      // 5. Generate grounded answer
      const { answer, citedChunkIds } = await generationService.generateAnswer(
        question,
        retrievedChunks,
        recentMessages
      );

      // 6. Persist the assistant's message
      const assistantMessageId = uuidv4();
      db.run(`
        INSERT INTO messages (id, conversation_id, role, content)
        VALUES (?, ?, 'assistant', ?)
      `, [assistantMessageId, conversationId, answer]);

      // 7. Persist citations
      const citations = [];
      for (const chunkId of citedChunkIds) {
        const item = retrievedChunks.find(rc => rc.chunk.id === chunkId);
        if (item) {
          const citationId = uuidv4();
          const snippet = item.chunk.text.length > 200
            ? item.chunk.text.substring(0, 197) + '...'
            : item.chunk.text;

          if (item.sourceType === 'pdf') {
            db.run(`
              INSERT INTO citations (id, message_id, chunk_id, document_id, page_number, document_name, snippet_text)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [citationId, assistantMessageId, chunkId, item.chunk.documentId, item.chunk.pageNumber, item.chunk.documentName, snippet]);

            citations.push({
              id: citationId,
              messageId: assistantMessageId,
              chunkId,
              sourceType: 'pdf',
              documentId: item.chunk.documentId,
              documentName: item.chunk.documentName,
              pageNumber: item.chunk.pageNumber,
              snippetText: snippet,
            });
          } else {
            db.run(`
              INSERT INTO citations (id, message_id, chunk_id, start_time, end_time, snippet_text)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [citationId, assistantMessageId, chunkId, item.chunk.startTime || 0, item.chunk.endTime || 0, snippet]);

            citations.push({
              id: citationId,
              messageId: assistantMessageId,
              chunkId,
              sourceType: 'podcast',
              episodeId: item.chunk.episodeId,
              episodeTitle: item.chunk.episodeTitle,
              startTime: item.chunk.startTime || 0,
              endTime: item.chunk.endTime || 0,
              snippetText: snippet,
            });
          }
        }
      }

      logger.info(`RAG pipeline complete: ${citations.length} citations generated`);

      return {
        message: {
          id: assistantMessageId,
          conversationId,
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
        },
        citations,
      };
    } catch (err) {
      const errorMessageId = uuidv4();
      const errorContent = 'I encountered an error while processing your question. Please try again in a moment.';
      db.run(`
        INSERT INTO messages (id, conversation_id, role, content)
        VALUES (?, ?, 'assistant', ?)
      `, [errorMessageId, conversationId, errorContent]);

      logger.error(`RAG pipeline error: ${err.message}`, { stack: err.stack });
      throw err;
    }
  },
};

module.exports = ragOrchestrationService;
