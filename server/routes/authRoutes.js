const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { setClientSelectedViewMode, getClientPreference } = require('../clientPreferences');
const { loginLimiter, requireAuth, sensitiveLimiter } = require('../middleware');

router.post('/login', loginLimiter, authController.login);
router.get('/me', requireAuth, authController.me);
router.post('/logout', requireAuth, authController.logout);

router.post('/client-view-mode', requireAuth, async (req, res) => {
  if (req.user?.role !== 'client' || !req.user?.client_id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const mode = req.body?.viewMode === 'simplified' ? 'simplified' : 'standard';
  const preferences = setClientSelectedViewMode(req.user.client_id, mode);
  if (req.session?.user) req.session.user.preferences = preferences;
  req.session.save(() => res.json({ success: true, preferences }));
});

router.put('/password', requireAuth, sensitiveLimiter, authController.changeOwnPassword);

module.exports = router;
