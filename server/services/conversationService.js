/**
 * Conversation Service
 * Manages Q&A conversations and their messages.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const logger = require('../utils/logger');
const { createError } = require('../utils/errors');

const conversationService = {
  /**
   * Create a new conversation
   */
  createConversation(userId, { episodeId, documentId, scope, title }) {
    const id = uuidv4();
    const convScope = scope || (episodeId ? 'episode' : (documentId ? 'document' : 'library'));
    const convTitle = title || 'New Conversation';

    db.run(`
      INSERT INTO conversations (id, user_id, episode_id, document_id, title, scope)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, userId, episodeId || null, documentId || null, convTitle, convScope]);

    return this.getConversationById(id);
  },

  /**
   * Get a single conversation with its messages and citations
   */
  getConversationById(id) {
    const conv = db.get('SELECT * FROM conversations WHERE id = ?', [id]);
    if (!conv) return null;

    return this.formatConversation(conv);
  },

  /**
   * Get conversation with all messages and their citations
   */
  getConversationWithMessages(id) {
    const conv = db.get('SELECT * FROM conversations WHERE id = ?', [id]);
    if (!conv) return null;

    const messages = db.all(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [id]
    );

    // Load citations for each assistant message
    const formattedMessages = messages.map(m => {
      const msg = {
        id: m.id,
        conversationId: m.conversation_id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
        citations: [],
      };

      if (m.role === 'assistant') {
        const citations = db.all(
          'SELECT * FROM citations WHERE message_id = ?',
          [m.id]
        );
        msg.citations = citations.map(c => ({
          id: c.id,
          messageId: c.message_id,
          chunkId: c.chunk_id,
          startTime: c.start_time,
          endTime: c.end_time,
          documentId: c.document_id,
          documentName: c.document_name,
          pageNumber: c.page_number,
          snippetText: c.snippet_text,
        }));
      }

      return msg;
    });

    // Get episode info if scoped
    let episode = null;
    if (conv.episode_id) {
      const ep = db.get('SELECT id, title, podcast_id, audio_url FROM episodes WHERE id = ?', [conv.episode_id]);
      if (ep) {
        const podcast = db.get('SELECT title FROM podcasts WHERE id = ?', [ep.podcast_id]);
        episode = {
          id: ep.id,
          title: ep.title,
          podcastTitle: podcast ? podcast.title : '',
          audioUrl: ep.audio_url,
        };
      }
    }

    // Get document info if scoped
    let document = null;
    if (conv.document_id) {
      const doc = db.get('SELECT id, file_name, page_count FROM documents WHERE id = ?', [conv.document_id]);
      if (doc) {
        document = {
          id: doc.id,
          fileName: doc.file_name,
          pageCount: doc.page_count,
        };
      }
    }

    return {
      ...this.formatConversation(conv),
      messages: formattedMessages,
      episode,
      document,
    };
  },

  /**
   * List all conversations for a user, optionally filtered by episode or document
   */
  getUserConversations(userId, episodeId = null) {
    let sql = 'SELECT c.*, e.title as episode_title, p.title as podcast_title, d.file_name as document_name FROM conversations c LEFT JOIN episodes e ON c.episode_id = e.id LEFT JOIN podcasts p ON e.podcast_id = p.id LEFT JOIN documents d ON c.document_id = d.id WHERE c.user_id = ?';
    const params = [userId];

    if (episodeId) {
      sql += ' AND c.episode_id = ?';
      params.push(episodeId);
    }

    sql += ' ORDER BY c.updated_at DESC';
    const conversations = db.all(sql, params);

    return conversations.map(c => ({
      ...this.formatConversation(c),
      episodeTitle: c.episode_title || '',
      podcastTitle: c.podcast_title || '',
      documentName: c.document_name || '',
      // Get last message preview
      lastMessage: (() => {
        const last = db.get(
          'SELECT content, role, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1',
          [c.id]
        );
        if (!last) return null;
        return {
          content: last.content.length > 100 ? last.content.substring(0, 97) + '...' : last.content,
          role: last.role,
          createdAt: last.created_at,
        };
      })(),
      messageCount: (() => {
        const count = db.get('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?', [c.id]);
        return count ? count.count : 0;
      })(),
    }));
  },

  /**
   * Delete a conversation and all its messages/citations
   */
  deleteConversation(id, userId) {
    const conv = db.get('SELECT id FROM conversations WHERE id = ? AND user_id = ?', [id, userId]);
    if (!conv) {
      throw createError('Conversation not found', 404);
    }

    db.run('DELETE FROM conversations WHERE id = ?', [id]);
    return { success: true };
  },

  formatConversation(row) {
    return {
      id: row.id,
      userId: row.user_id,
      episodeId: row.episode_id,
      documentId: row.document_id,
      title: row.title,
      scope: row.scope,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

module.exports = conversationService;
