import { db } from '../db.js';
import { nowIso } from './helpers.js';

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
  };
}

export default async function (app) {
  app.get('/api/cards', (req) => {
    const { deck_id } = req.query;
    if (deck_id) {
      return db.prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY position ASC, id ASC').all(Number(deck_id));
    }
    return db.prepare('SELECT * FROM cards ORDER BY position ASC, id ASC').all();
  });

  app.post('/api/cards', (req, reply) => {
    const c = sanitize(req.body);
    if (!c.front) return reply.code(400).send({ error: 'front is required' });
    if (!c.deck_id) return reply.code(400).send({ error: 'deck_id is required' });
    const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(c.deck_id);
    if (!deck) return reply.code(404).send({ error: 'deck not found' });
    const r = db
      .prepare('INSERT INTO cards (deck_id, front, back, extra, tags) VALUES (?, ?, ?, ?, ?)')
      .run(c.deck_id, c.front, c.back, c.extra, c.tags);
    return db.prepare('SELECT * FROM cards WHERE id = ?').get(r.lastInsertRowid);
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
    if (!Object.keys(fields).length) return reply.code(400).send({ error: 'nothing to update' });
    fields.updated_at = nowIso();
    const set = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE cards SET ${set} WHERE id = ?`).run(...Object.values(fields), id);
    return db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  });

  app.delete('/api/cards/:id', (req, reply) => {
    const r = db.prepare('DELETE FROM cards WHERE id = ?').run(Number(req.params.id));
    if (!r.changes) return reply.code(404).send({ error: 'not found' });
    return { ok: true };
  });
}
