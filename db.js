import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'vibe-worlds.db'));

// WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS worlds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt TEXT NOT NULL,
    creator_session TEXT NOT NULL,
    params TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    chain_position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS creation_lock (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    is_locked INTEGER DEFAULT 0,
    locked_by TEXT,
    locked_at TEXT,
    expires_at TEXT
  );
`);

// Ensure lock row exists
const lockRow = db.prepare('SELECT id FROM creation_lock WHERE id = 1').get();
if (!lockRow) {
  db.prepare('INSERT INTO creation_lock (id, is_locked) VALUES (1, 0)').run();
}

// --- Lock operations ---

export function getLockStatus() {
  const lock = db.prepare('SELECT * FROM creation_lock WHERE id = 1').get();
  if (lock.is_locked && lock.expires_at) {
    const expired = new Date(lock.expires_at) < new Date();
    if (expired) {
      releaseLock();
      return { is_locked: false, locked_by: null };
    }
  }
  return {
    is_locked: !!lock.is_locked,
    locked_by: lock.locked_by,
    locked_at: lock.locked_at
  };
}

export function acquireLock(sessionId) {
  const status = getLockStatus();
  if (status.is_locked && status.locked_by !== sessionId) {
    return false;
  }
  // Lock for 5 minutes max (auto-expire safety net)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  db.prepare(`
    UPDATE creation_lock SET is_locked = 1, locked_by = ?, locked_at = datetime('now'), expires_at = ?
    WHERE id = 1
  `).run(sessionId, expiresAt);
  return true;
}

export function releaseLock() {
  db.prepare(`
    UPDATE creation_lock SET is_locked = 0, locked_by = NULL, locked_at = NULL, expires_at = NULL
    WHERE id = 1
  `).run();
}

// --- World operations ---

export function getNextChainPosition() {
  const row = db.prepare('SELECT MAX(chain_position) as maxPos FROM worlds').get();
  return (row.maxPos || 0) + 1;
}

export function createWorld(prompt, creatorSession, params) {
  const position = getNextChainPosition();
  const paramsJson = JSON.stringify(params);
  const result = db.prepare(`
    INSERT INTO worlds (prompt, creator_session, params, chain_position)
    VALUES (?, ?, ?, ?)
  `).run(prompt, creatorSession, paramsJson, position);
  return {
    id: result.lastInsertRowid,
    chain_position: position,
    prompt,
    params
  };
}

export function getWorldChain() {
  const rows = db.prepare('SELECT * FROM worlds ORDER BY chain_position ASC').all();
  return rows.map(r => ({
    ...r,
    params: JSON.parse(r.params)
  }));
}

export function getWorld(id) {
  const row = db.prepare('SELECT * FROM worlds WHERE id = ?').get(id);
  if (!row) return null;
  return { ...row, params: JSON.parse(row.params) };
}

export function getWorldByPosition(position) {
  const row = db.prepare('SELECT * FROM worlds WHERE chain_position = ?').get(position);
  if (!row) return null;
  return { ...row, params: JSON.parse(row.params) };
}

export function getWorldCount() {
  const row = db.prepare('SELECT COUNT(*) as count FROM worlds').get();
  return row.count;
}

export default db;
