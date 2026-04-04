const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/data/traffic.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'client')),
    client_id TEXT
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT,
    date TEXT,
    clicks INTEGER,
    impressions INTEGER,
    spend REAL,
    conversions INTEGER
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS access_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    role TEXT,
    ip_address TEXT,
    user_agent TEXT,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Seed inicial - criar admin padrão se não existir
  db.run(`INSERT OR IGNORE INTO users (username, password, role, client_id) VALUES ('admin', 'admin123', 'admin', NULL)`);
  db.run(`INSERT OR IGNORE INTO users (username, password, role, client_id) VALUES ('cliente1', 'cliente123', 'client', 'cliente1')`);
});

module.exports = db;
