import { db, nextDeckColor, deckWithCount } from '../db.js';
import { nowIso } from './helpers.js';

export default async function (app) {
  app.get('/api/decks', () =>
    db
      .prepare(
        `SELECT d.*,
                (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) AS card_count,
                (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id AND c.due <= ?) AS due_count
         FROM decks d ORDER BY d.position ASC, d.id ASC`
      )
      .all(nowIso())
  );

  app.post('/api/decks', (req, reply) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return reply.code(400).send({ error: 'name is required' });
    const exists = db.prepare('SELECT id FROM decks WHERE name = ?').get(name);
    if (exists) return reply.code(409).send({ error: 'a deck with this name already exists' });
    const description = String(req.body?.description ?? '').trim();
    const color = /^#[0-9a-fA-F]{6}$/.test(String(req.body?.color ?? '')) ? req.body.color : nextDeckColor();
    const r = db.prepare('INSERT INTO decks (name, description, color) VALUES (?, ?, ?)').run(name, description, color);
    return deckWithCount(r.lastInsertRowid);
  });

  app.patch('/api/decks/:id', (req, reply) => {
    const id = Number(req.params.id);
    const cur = db.prepare('SELECT * FROM decks WHERE id = ?').get(id);
    if (!cur) return reply.code(404).send({ error: 'not found' });
    const body = req.body || {};
    const fields = {};
    if ('name' in body) {
      const name = String(body.name || '').trim();
      if (!name) return reply.code(400).send({ error: 'name cannot be empty' });
      const clash = db.prepare('SELECT id FROM decks WHERE name = ? AND id != ?').get(name, id);
      if (clash) return reply.code(409).send({ error: 'a deck with this name already exists' });
      fields.name = name;
    }
    if ('description' in body) fields.description = String(body.description ?? '').trim();
    if ('color' in body && /^#[0-9a-fA-F]{6}$/.test(String(body.color ?? ''))) fields.color = body.color;
    if ('position' in body) fields.position = Number(body.position) || 0;
    if (!Object.keys(fields).length) return reply.code(400).send({ error: 'nothing to update' });
    fields.updated_at = nowIso();
    const set = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE decks SET ${set} WHERE id = ?`).run(...Object.values(fields), id);
    return deckWithCount(id);
  });

  app.delete('/api/decks/:id', (req, reply) => {
    const r = db.prepare('DELETE FROM decks WHERE id = ?').run(Number(req.params.id));
    if (!r.changes) return reply.code(404).send({ error: 'not found' });
    return { ok: true };
  });
}
