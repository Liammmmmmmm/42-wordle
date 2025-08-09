const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./dev.db');

db.serialize(() => {
  // Création de la table pour les parties en cours
  db.run(`CREATE TABLE IF NOT EXISTS active_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    start_time INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`);
  console.log('Table "active_games" créée.');

  // Index pour améliorer les performances des requêtes
  db.run(`CREATE INDEX IF NOT EXISTS idx_active_games_user_date ON active_games(user_id, date)`);
  console.log('Index "idx_active_games_user_date" créé.');

  // Trigger pour mettre à jour updated_at automatiquement
  db.run(`CREATE TRIGGER IF NOT EXISTS update_active_games_timestamp 
    AFTER UPDATE ON active_games
    BEGIN
      UPDATE active_games SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END`);
  console.log('Trigger "update_active_games_timestamp" créé.');
});

db.close();
console.log('Migration terminée avec succès.');
