// SQLite storage using Node's built-in node:sqlite module (Node 22.13+).
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'users.db'));

// COLLATE NOCASE makes "Afia" and "afia" count as the same username/email.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const findByUsernameOrEmail = db.prepare(
  'SELECT * FROM users WHERE username = ? OR email = ?'
);
const findById = db.prepare(
  'SELECT id, username, email, created_at FROM users WHERE id = ?'
);
const insertUser = db.prepare(
  'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
);

module.exports = {
  // Used for both the duplicate check and login: matches either column.
  findUser(username, email = username) {
    return findByUsernameOrEmail.get(username, email);
  },
  findUserById(id) {
    return findById.get(id);
  },
  createUser(username, email, passwordHash) {
    const result = insertUser.run(username, email, passwordHash);
    return Number(result.lastInsertRowid);
  },
};
