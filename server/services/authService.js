/**
 * Authentication Service
 * Manages bcrypt password hashing, JWT creation/verification,
 * email verification, password reset tokens, and session persistence.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const config = require('../config');
const logger = require('../utils/logger');

const authService = {
  /**
   * Evaluates password strength criteria
   */
  validatePasswordStrength(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, message: 'Password is required' };
    }
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const score = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
    const valid = hasMinLength && score >= 3;

    return {
      valid,
      score,
      criteria: {
        hasMinLength,
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasSpecial
      }
    };
  },

  /**
   * Registers a new user
   */
  async registerUser({ email, password, name }) {
    const existing = db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (existing) {
      const error = new Error('An account with this email address already exists');
      error.statusCode = 400;
      throw error;
    }

    const strength = this.validatePasswordStrength(password);
    if (!strength.valid) {
      const error = new Error('Password does not meet security requirements');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = uuidv4();
    const verificationToken = uuidv4();

    db.run(`
      INSERT INTO users (id, email, password_hash, name, is_verified, verification_token)
      VALUES (?, ?, ?, ?, 0, ?)
    `, [userId, email.toLowerCase(), passwordHash, name, verificationToken]);

    // Create welcome notification
    db.run(`
      INSERT INTO notifications (id, user_id, title, message, type)
      VALUES (?, ?, 'Welcome to PodcastQ&A', 'Your account has been created successfully. Start by adding a podcast and uploading a transcript.', 'info')
    `, [uuidv4(), userId]);

    const user = this.getUserById(userId);
    const tokens = this.generateTokens(user);

    return { user, tokens, verificationToken };
  },

  /**
   * Authenticates user with email & password
   */
  async loginUser({ email, password, rememberMe }) {
    const userRow = db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    
    // Generic error message to prevent account enumeration
    const invalidError = new Error('Invalid email or password');
    invalidError.statusCode = 401;

    if (!userRow) {
      throw invalidError;
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      throw invalidError;
    }

    const user = this.formatUserObj(userRow);
    const tokens = this.generateTokens(user, rememberMe);

    // Persist refresh token session
    const sessionId = uuidv4();
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 8);
    const expiresDays = rememberMe ? 30 : 7;
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

    db.run(`INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at) VALUES (?, ?, ?, ?)`, [
      sessionId, user.id, refreshHash, expiresAt
    ]);

    return { user, tokens };
  },

  /**
   * Generates JWT Access & Refresh Tokens
   */
  generateTokens(user, rememberMe = false) {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      config.refreshSecret,
      { expiresIn: rememberMe ? '30d' : '7d' }
    );

    return { accessToken, refreshToken };
  },

  /**
   * Verifies email using verification token
   */
  verifyEmail(token) {
    const user = db.get('SELECT id FROM users WHERE verification_token = ?', [token]);
    if (!user) {
      const error = new Error('Invalid or expired verification token');
      error.statusCode = 400;
      throw error;
    }

    db.run('UPDATE users SET is_verified = 1, verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    return { success: true, message: 'Email verified successfully' };
  },

  /**
   * Requests password reset link (single-use token, 30m expiry)
   */
  async requestPasswordReset(email) {
    const user = db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    
    // Always return success regardless of whether email exists (security)
    if (!user) {
      return { success: true, message: 'If an account matches this email, password reset instructions have been sent.' };
    }

    const resetToken = uuidv4();
    const tokenHash = await bcrypt.hash(resetToken, 8);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    db.run(`INSERT INTO password_reset_tokens (token, user_id, expires_at, used) VALUES (?, ?, ?, 0)`, [
      tokenHash, user.id, expiresAt
    ]);

    logger.info(`Password reset requested for user ${user.id}. Token: ${resetToken}`);
    return { success: true, resetToken, message: 'If an account matches this email, password reset instructions have been sent.' };
  },

  /**
   * Resets password using valid token
   */
  async resetPassword({ token, newPassword }) {
    const strength = this.validatePasswordStrength(newPassword);
    if (!strength.valid) {
      const error = new Error('New password does not meet strength requirements');
      error.statusCode = 400;
      throw error;
    }

    const activeTokens = db.all('SELECT * FROM password_reset_tokens WHERE used = 0 AND expires_at > CURRENT_TIMESTAMP');
    let matchedTokenRecord = null;

    for (const t of activeTokens) {
      const match = await bcrypt.compare(token, t.token);
      if (match) {
        matchedTokenRecord = t;
        break;
      }
    }

    if (!matchedTokenRecord) {
      const error = new Error('Password reset link is invalid or has expired');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, matchedTokenRecord.user_id]);
    db.run('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', [matchedTokenRecord.token]);

    return { success: true, message: 'Password reset successfully. You can now log in with your new password.' };
  },

  /**
   * Fetches user profile by ID
   */
  getUserById(id) {
    const row = db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) return null;
    return this.formatUserObj(row);
  },

  /**
   * Updates user profile fields
   */
  updateProfile(userId, { name }) {
    if (name) {
      db.run('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, userId]);
    }
    return this.getUserById(userId);
  },

  /**
   * Changes user password
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const userRow = db.get('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!userRow) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await bcrypt.compare(currentPassword, userRow.password_hash);
    if (!isMatch) {
      const error = new Error('Current password is incorrect');
      error.statusCode = 400;
      throw error;
    }

    const strength = this.validatePasswordStrength(newPassword);
    if (!strength.valid) {
      const error = new Error('New password does not meet strength requirements');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, userId]);

    return { success: true, message: 'Password updated successfully.' };
  },

  formatUserObj(row) {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      isVerified: Boolean(row.is_verified),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
};

module.exports = authService;
