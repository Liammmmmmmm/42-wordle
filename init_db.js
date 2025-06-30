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

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    login TEXT NOT NULL,
    image TEXT NOT NULL,
    creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('Table "users" créée.');

  db.run(`CREATE TABLE IF NOT EXISTS word (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL CHECK(length(word) = 5),
    date TEXT NOT NULL CHECK(length(date) = 10)
  )`);
  console.log('Table "word" créée.');
});

db.close();