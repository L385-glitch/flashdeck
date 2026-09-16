import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'app.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS decks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '#6366f1',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id       INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front         TEXT NOT NULL,
  back          TEXT NOT NULL DEFAULT '',
  extra         TEXT NOT NULL DEFAULT '',
  tags          TEXT NOT NULL DEFAULT '',
  ease          REAL NOT NULL DEFAULT 2.5,
  interval      REAL NOT NULL DEFAULT 0,
  reps          INTEGER NOT NULL DEFAULT 0,
  lapses        INTEGER NOT NULL DEFAULT 0,
  due           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_reviewed TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at    TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id         INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL,
  interval_before REAL NOT NULL DEFAULT 0,
  interval_after  REAL NOT NULL DEFAULT 0,
  reviewed_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_cards_deck   ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_due    ON cards(due);
CREATE INDEX IF NOT EXISTS idx_reviews_card ON reviews(card_id, reviewed_at);
`);

export const DECK_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7',
  '#ec4899', '#84cc16', '#f97316', '#14b8a6', '#71717a', '#64748b',
];

export function nextDeckColor() {
  const used = new Set(db.prepare('SELECT color FROM decks').all().map((r) => r.color));
  return DECK_COLORS.find((c) => !used.has(c)) || DECK_COLORS[0];
}

export function deckWithCount(id) {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(id);
  if (!deck) return null;
  const due = db.prepare('SELECT COUNT(*) AS n FROM cards WHERE deck_id = ? AND due <= ?').get(id, new Date().toISOString()).n;
  return { ...deck, card_count: db.prepare('SELECT COUNT(*) AS n FROM cards WHERE deck_id = ?').get(id).n, due_count: due };
}
