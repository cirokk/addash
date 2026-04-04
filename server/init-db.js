const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/data/traffic.db');

db.serialize(() => {
    db.run("INSERT OR IGNORE INTO users (username, password, role, client_id) VALUES ('cliente1', 'senha', 'client', 'C100')");
    db.run("INSERT INTO performance (client_id, date, clicks, impressions, spend, conversions) VALUES ('C100', '2026-03-24', 250, 10000, 500.5, 20)");
    console.log("Banco populado com sucesso.");
});

db.close();
