/**
 * Database Initialization using sql.js (WebAssembly SQLite)
 * Cross-platform, fast, and standalone. Automatically persists to disk.
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const config = require('../config');

let dbInstance = null;
let SQLInstance = null;

function saveDb() {
  if (dbInstance && config.dbPath) {
    try {
      const data = dbInstance.export();
      const buffer = Buffer.from(data);
      const dbDir = path.dirname(config.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      fs.writeFileSync(config.dbPath, buffer);
    } catch (err) {
      logger.error('Failed to save database to disk:', err.message);
    }
  }
}

async function initDatabase() {
  if (dbInstance) return dbInstance;

  if (!SQLInstance) {
    SQLInstance = await initSqlJs();
  }

  const dbPath = config.dbPath;
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    dbInstance = new SQLInstance.Database(filebuffer);
  } else {
    dbInstance = new SQLInstance.Database();
  }

  // Enable WAL mode for better concurrent read performance
  dbInstance.run('PRAGMA journal_mode=WAL;');
  dbInstance.run('PRAGMA foreign_keys=ON;');

  // ─── Users Table ────────────────────────────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ─── Sessions Table (Refresh Tokens) ───────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_token_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ─── Password Reset Tokens Table ──────────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ─── Podcasts Table ────────────────────────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS podcasts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      publisher TEXT DEFAULT '',
      cover_image_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ─── Episodes Table ────────────────────────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      podcast_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      publish_date TEXT DEFAULT '',
      duration INTEGER DEFAULT 0,
      audio_url TEXT DEFAULT '',
      transcript_status TEXT DEFAULT 'pending',
      transcript_format TEXT DEFAULT '',
      has_approximate_timing INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (podcast_id) REFERENCES podcasts(id) ON DELETE CASCADE
    );
  `);

  // ─── Transcript Segments Table ─────────────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS transcript_segments (
      id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL,
      segment_index INTEGER NOT NULL,
      start_time REAL DEFAULT 0,
      end_time REAL DEFAULT 0,
      speaker TEXT DEFAULT '',
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
    );
  `);

  // ─── Transcript Chunks Table (Retrieval Units) ─────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS transcript_chunks (
      id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      chunk_text TEXT NOT NULL,
      start_time REAL DEFAULT 0,
      end_time REAL DEFAULT 0,
      embedding TEXT DEFAULT '',
      content_hash TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
    );
  `);

  // ─── Conversations Table ──────────────────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      episode_id TEXT,
      title TEXT NOT NULL DEFAULT 'New Conversation',
      scope TEXT DEFAULT 'episode',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
    );
  `);

  // ─── Messages Table ───────────────────────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  // ─── Citations Table ──────────────────────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS citations (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      chunk_id TEXT NOT NULL,
      start_time REAL DEFAULT 0,
      end_time REAL DEFAULT 0,
      snippet_text TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (chunk_id) REFERENCES transcript_chunks(id) ON DELETE CASCADE
    );
  `);

  // ─── Notifications Table ──────────────────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ─── Documents Table (PDFs) ─────────────────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      page_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      error_message TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ─── Document Pages Table ─────────────────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS document_pages (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      page_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
  `);

  // ─── Document Chunks Table ────────────────────────────────────────────
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      chunk_text TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      section_heading TEXT DEFAULT '',
      embedding TEXT DEFAULT '',
      content_hash TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
  `);

  // Add missing columns to conversations & citations if needed
  try { dbInstance.run('ALTER TABLE conversations ADD COLUMN document_id TEXT;'); } catch (e) {}
  try { dbInstance.run("ALTER TABLE conversations ADD COLUMN source_type TEXT DEFAULT 'podcast';"); } catch (e) {}
  try { dbInstance.run('ALTER TABLE citations ADD COLUMN document_id TEXT;'); } catch (e) {}
  try { dbInstance.run('ALTER TABLE citations ADD COLUMN page_number INTEGER;'); } catch (e) {}
  try { dbInstance.run('ALTER TABLE citations ADD COLUMN document_name TEXT;'); } catch (e) {}

  // ─── Create Indexes ───────────────────────────────────────────────────
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_episodes_podcast ON episodes(podcast_id);');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_segments_episode ON transcript_segments(episode_id);');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_chunks_episode ON transcript_chunks(episode_id);');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_doc_pages_doc ON document_pages(document_id);');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc ON document_chunks(document_id);');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_conversations_episode ON conversations(episode_id);');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_conversations_doc ON conversations(document_id);');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_citations_message ON citations(message_id);');

  saveDb();
  logger.info('Database initialized successfully with PDF RAG support (sql.js persistent engine)');
  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

function closeDb() {
  if (dbInstance) {
    saveDb();
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection saved and closed');
  }
}

module.exports = { initDatabase, getDb, closeDb, saveDb };
