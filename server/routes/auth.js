/**
 * Auth Router
 * Implements register, login, logout, me, email verification, and password reset flows.
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// Security helper to set HTTP-only SameSite cookies
function setAuthCookies(res, tokens, rememberMe = false) {
  const maxAgeAccess = 15 * 60 * 1000; // 15 minutes
  const maxAgeRefresh = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;

  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: maxAgeAccess
  });

  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: maxAgeRefresh
  });
}

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: { message: 'Email, password, and name are required.' } });
    }

    const { user, tokens, verificationToken } = await authService.registerUser({ email, password, name });
    setAuthCookies(res, tokens, false);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user,
      token: tokens.accessToken,
      verificationToken
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', rateLimiter, async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password are required.' } });
    }

    const { user, tokens } = await authService.loginUser({ email, password, rememberMe });
    setAuthCookies(res, tokens, rememberMe);

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      user,
      token: tokens.accessToken
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, (req, res) => {
  return res.json({ success: true, user: req.user });
});

/**
 * POST /api/auth/verify-email
 */
router.post('/verify-email', (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: { message: 'Verification token is required.' } });
    }
    const result = authService.verifyEmail(token);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', rateLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: { message: 'Email is required.' } });
    }
    const result = await authService.requestPasswordReset(email);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: { message: 'Reset token and new password are required.' } });
    }
    const result = await authService.resetPassword({ token, newPassword });
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
