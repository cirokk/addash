const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const path = require('path');

const app = express();
const port = process.env.PORT || 3220;
const { ensureSchema } = require('./supabase');
const { requireAuth, requireAdmin } = require('./middleware');

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || 1 : 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: '10mb' }));

const isSecureCookie = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, 'data') }),
  name: 'trafficdash.sid',
  secret: process.env.SESSION_SECRET || (() => { throw new Error('SESSION_SECRET é obrigatório. Defina essa variável de ambiente antes de iniciar o TrafficDash.'); })(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use(express.static('public', {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/data', requireAuth, dataRoutes);
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

ensureSchema()
  .then(() => {
    app.listen(port, () => console.log(`TrafficDash rodando em 0.0.0.0:${port}`));
  })
  .catch((error) => {
    console.error('Falha ao preparar schema do Supabase:', error);
    process.exit(1);
  });
