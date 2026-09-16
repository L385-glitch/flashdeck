import { db } from '../db.js';
import { nowIso, clampInt } from './helpers.js';
import { schedule } from '../lib/srs.js';

const RATINGS = [0, 1, 2, 3];

export default async function (app) {
  // Cards that are due now (optionally restricted to one deck).
  app.get('/api/study/queue', (req) => {
    const { deck_id } = req.query;
    const limit = req.query.limit ? clampInt(req.query.limit, 1, 200) : 200;
    const now = nowIso();
    if (deck_id) {
      return db
        .prepare('SELECT * FROM cards WHERE deck_id = ? AND due <= ? ORDER BY due ASC, id ASC LIMIT ?')
        .all(Number(deck_id), now, limit);
    }
    return db.prepare('SELECT * FROM cards WHERE due <= ? ORDER BY due ASC, id ASC LIMIT ?').all(now, limit);
  });

  app.post('/api/study/review', (req, reply) => {
    const cardId = Number(req.body?.card_id);
    const rating = Number(req.body?.rating);
    if (!cardId) return reply.code(400).send({ error: 'card_id is required' });
    if (!RATINGS.includes(rating)) return reply.code(400).send({ error: 'rating must be 0-3' });

    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
    if (!card) return reply.code(404).send({ error: 'card not found' });

    const now = nowIso();
    const next = schedule(card, rating, new Date(now));
    db.prepare(
      'UPDATE cards SET ease = ?, interval = ?, reps = ?, lapses = ?, due = ?, last_reviewed = ?, updated_at = ? WHERE id = ?'
    ).run(next.ease, next.interval, next.reps, next.lapses, next.due, now, now, cardId);
    db.prepare(
      'INSERT INTO reviews (card_id, rating, interval_before, interval_after, reviewed_at) VALUES (?, ?, ?, ?, ?)'
    ).run(cardId, rating, card.interval, next.interval, now);

    return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  });
}
