const rateLimit = require('express-rate-limit');

function getClientIp(req) {
  return (
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
  req.user = req.session.user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito' });
  }
  next();
}

function requireSelfOrAdmin(paramName = 'userId') {
  return (req, res, next) => {
    const requestedUserId = String(req.params[paramName] || '');
    const sessionUserId = String(req.user?.id || '');
    if (req.user?.role === 'admin' || (requestedUserId && requestedUserId === sessionUserId)) {
      return next();
    }
    return res.status(403).json({ error: 'Acesso restrito' });
  };
}

function ensureClientAccess(clientId, req) {
  if (req.user?.role === 'admin') return true;
  return !!clientId && req.user?.role === 'client' && req.user?.client_id === clientId;
}

function requireClientAccessFromParam(paramName = 'clientId') {
  return (req, res, next) => {
    const clientId = req.params[paramName];
    if (!ensureClientAccess(clientId, req)) {
      return res.status(403).json({ error: 'Acesso restrito para este cliente' });
    }
    next();
  };
}

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${getClientIp(req)}:${req.body?.username || req.user?.username || 'anon'}`,
    handler: (_req, res) => res.status(429).json({ error: message || 'Muitas tentativas. Tente novamente mais tarde.' }),
  });
}

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.',
});

const sensitiveLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Muitas tentativas neste endpoint sensível. Aguarde um pouco e tente novamente.',
});

module.exports = {
  getClientIp,
  requireAuth,
  requireAdmin,
  requireSelfOrAdmin,
  ensureClientAccess,
  requireClientAccessFromParam,
  loginLimiter,
  sensitiveLimiter,
};
