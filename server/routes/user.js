/**
 * User Router
 * Profile management and password changes.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const authService = require('../services/authService');

/**
 * GET /api/user/profile — Get user profile
 */
router.get('/profile', authenticateToken, (req, res) => {
  return res.json({ success: true, user: req.user });
});

/**
 * PUT /api/user/profile — Update profile
 */
router.put('/profile', authenticateToken, (req, res, next) => {
  try {
    const { name } = req.body;
    const user = authService.updateProfile(req.user.id, { name });
    return res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/user/password — Change password
 */
router.put('/password', authenticateToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: { message: 'Current and new password are required.' } });
    }
    const result = await authService.changePassword(req.user.id, { currentPassword, newPassword });
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
