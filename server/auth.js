const bcrypt = require('bcryptjs');

const PASSWORD_MIN_LENGTH = 8;

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    client_id: user.client_id || null,
  };
}

function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  return null;
}

function looksLikeBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, storedPassword) {
  if (!storedPassword || typeof storedPassword !== 'string') return { ok: false, needsUpgrade: false };

  if (looksLikeBcryptHash(storedPassword)) {
    const ok = await bcrypt.compare(password, storedPassword);
    return { ok, needsUpgrade: false };
  }

  const ok = password === storedPassword;
  return { ok, needsUpgrade: ok };
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  sanitizeUser,
  validatePasswordStrength,
  looksLikeBcryptHash,
  hashPassword,
  verifyPassword,
};
