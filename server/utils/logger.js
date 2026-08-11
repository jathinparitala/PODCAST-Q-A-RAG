/**
 * Logger Utility
 * Structured logging with levels and timestamps.
 */

const levels = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const currentLevel = levels[(process.env.LOG_LEVEL || 'DEBUG').toUpperCase()] ?? levels.DEBUG;

const colorMap = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m', // Gray
};
const reset = '\x1b[0m';

/**
 * Formats and outputs a log message.
 * @param {'ERROR'|'WARN'|'INFO'|'DEBUG'} level
 * @param {string} message
 * @param {object} [meta] - Optional structured metadata
 */
function log(level, message, meta = null) {
  if (levels[level] > currentLevel) return;

  const timestamp = new Date().toISOString();
  const color = colorMap[level] || '';
  const prefix = `${color}[${timestamp}] [${level}]${reset}`;

  if (meta) {
    console.log(`${prefix} ${message}`, JSON.stringify(meta, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

const logger = {
  error: (msg, meta) => log('ERROR', msg, meta),
  warn: (msg, meta) => log('WARN', msg, meta),
  info: (msg, meta) => log('INFO', msg, meta),
  debug: (msg, meta) => log('DEBUG', msg, meta),
};

module.exports = logger;
