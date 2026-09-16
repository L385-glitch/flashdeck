import { db } from '../db.js';
import { nowIso, parseImage, shapeCard } from './helpers.js';

const PATCH_SCHEMA = [
  { col: 'front', cast: (v) => String(v || '').trim() || null },
  { col: 'back', cast: (v) => String(v ?? '') },
  { col: 'extra', cast: (v) => String(v ?? '') },
  { col: 'tags', cast: (v) => String(v ?? '').trim() },
  { col: 'deck_id', cast: (v) => (v ? Number(v) : null) },
];

function sanitize(body) {
  const front = String(body?.front ?? '').trim();
  return {
    deck_id: Number(body?.deck_id) || 0,
    front,
    back: String(body?.back ?? ''),
    extra: String(body?.extra ?? ''),
    tags: String(body?.tags ?? '').trim(),
    image: parseImage(body?.image),
  };
}

export default async function (app) {
  app.get('/api/cards', (req) => {
    const { deck_id } = req.query;
    const rows = deck_id
      ? db.prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY position ASC, id ASC').all(Number(deck_id))
      : db.prepare('SELECT * FROM cards ORDER BY position ASC, id ASC').all();
    return rows.map(shapeCard);
  });

  // Serve a card's stored image.
  app.get('/api/cards/:id/image', (req, reply) => {
    const row = db.prepare('SELECT image, image_mime FROM cards WHERE id = ?').get(Number(req.params.id));
    if (!row || !row.image) return reply.code(404).send({ error: 'no image' });
    reply
      .type(row.image_mime || 'image/jpeg')
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .send(row.image);
  });

  app.post('/api/cards', (req, reply) => {
    const c = sanitize(req.body);
    if (!c.front) return reply.code(400).send({ error: 'front is required' });
    if (!c.deck_id) return reply.code(400).send({ error: 'deck_id is required' });
    const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(c.deck_id);
    if (!deck) return reply.code(404).send({ error: 'deck not found' });
    const r = db
      .prepare('INSERT INTO cards (deck_id, front, back, extra, tags, image, image_mime) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(c.deck_id, c.front, c.back, c.extra, c.tags, c.image ? c.image.buffer : null, c.image ? c.image.mime : null);
    return shapeCard(db.prepare('SELECT * FROM cards WHERE id = ?').get(r.lastInsertRowid));
  });

  app.patch('/api/cards/:id', (req, reply) => {
    const id = Number(req.params.id);
    const cur = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
    if (!cur) return reply.code(404).send({ error: 'not found' });
    const body = req.body || {};
    const fields = {};
    for (const { col, cast } of PATCH_SCHEMA) {
      if (col in body) {
        const v = cast(body[col]);
        if (col === 'front' && !v) return reply.code(400).send({ error: 'front cannot be empty' });
        fields[col] = v;
      }
    }
    // Image is handled separately: a data URI sets it, null/'' clears it.
    if ('image' in body) {
      const img = parseImage(body.image);
      fields.image = img ? img.buffer : null;
      fields.image_mime = img ? img.mime : null;
    }
    if (!Object.keys(fields).length) return reply.code(400).send({ error: 'nothing to update' });
    fields.updated_at = nowIso();
    const set = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE cards SET ${set} WHERE id = ?`).run(...Object.values(fields), id);
    return shapeCard(db.prepare('SELECT * FROM cards WHERE id = ?').get(id));
  });

  app.delete('/api/cards/:id', (req, reply) => {
    const r = db.prepare('DELETE FROM cards WHERE id = ?').run(Number(req.params.id));
    if (!r.changes) return reply.code(404).send({ error: 'not found' });
    return { ok: true };
  });
}
