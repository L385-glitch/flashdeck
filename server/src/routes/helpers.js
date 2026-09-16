import { db } from '../db.js';

/**
 * Apply a whitelisted partial update.
 * schema: [{ col, cast? }] — column names must be valid identifiers (they are, by construction).
 * Returns the result info of the UPDATE ('changes'), or null if nothing to update.
 */
export function applyUpdate(table, id, body, schema) {
  if (!body || typeof body !== 'object') return null;
  const set = [];
  const params = [];
  for (const { col, cast } of schema) {
    if (col in body) {
      set.push(`${col} = ?`);
      params.push(cast ? cast(body[col]) : body[col]);
    }
  }
  if (!set.length) return null;
  const stmt = db.prepare(`UPDATE ${table} SET ${set.join(', ')} WHERE id = ?`);
  params.push(id);
  return stmt.run(...params);
}

// Second-precision ISO (no milliseconds) so it stays lexicographically
// comparable with SQLite's strftime('%Y-%m-%dT%H:%M:%SZ','now') values.
export const iso = (d = new Date()) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

export const nowIso = () => iso();

export const clampInt = (v, min, max) => {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};
