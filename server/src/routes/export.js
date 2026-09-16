import { db } from '../db.js';
import { toCsv } from '../lib/csv.js';

export default async function (app) {
  app.get('/api/export', (req, reply) => {
    const { deck_id } = req.query;
    let rows;
    let filename;
    if (deck_id) {
      const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(Number(deck_id));
      if (!deck) return reply.code(404).send({ error: 'deck not found' });
      rows = db.prepare('SELECT front, back, extra, tags FROM cards WHERE deck_id = ? ORDER BY position ASC, id ASC').all(Number(deck_id));
      filename = `${deck.name.replace(/[^\w.-]+/g, '_')}.csv`;
    } else {
      rows = db.prepare('SELECT front, back, extra, tags FROM cards ORDER BY deck_id, position ASC, id ASC').all();
      filename = 'flashdeck_export.csv';
    }
    const csv = toCsv([['front', 'back', 'extra', 'tags'], ...rows.map((r) => [r.front, r.back, r.extra, r.tags])]);
    return reply.type('text/csv').header('Content-Disposition', `attachment; filename="${filename}"`).send(csv);
  });
}
