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

// Sniff an image's mime type from its magic bytes.
function detectMime(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.length >= 3 && buf.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

// Accept a data URI (data:image/jpeg;base64,....) or raw base64 and return
// { buffer, mime }, or null when the value is empty / not decodable.
export function parseImage(value) {
  if (value == null) return null;
  let s = String(value).trim();
  if (!s) return null;
  let mime = null;
  const dataUri = s.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is);
  if (dataUri) {
    mime = dataUri[1];
    s = dataUri[2];
  }
  const buffer = Buffer.from(s.replace(/\s/g, ''), 'base64');
  if (!buffer.length) return null;
  return { buffer, mime: detectMime(buffer) || mime || 'image/jpeg' };
}

// Convert a DB card row into a JSON-safe shape: drop the (potentially large)
// image blob and expose a has_image flag + the image URL instead.
export function shapeCard(row) {
  if (!row) return row;
  const { image, ...rest } = row;
  return { ...rest, has_image: !!image, image_url: image ? `/api/cards/${row.id}/image` : null };
}
