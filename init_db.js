const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./dev.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS wordle_participations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL,
    wordle TEXT NOT NULL,
    time INTEGER NOT NULL,
	attempts INTEGER NOT NULL
  )`);
  console.log('Table "wordle_participations" créée.');
});

db.close();