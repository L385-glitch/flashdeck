import { db } from '../db.js';
import { toCsv } from '../lib/csv.js';

export default async function (app) {
  app.get('/api/export', (req, reply) => {
    const { deck_id } = req.query;
    let rows;
    let filename;
    const sel = 'SELECT front, back, extra, tags, image, image_mime FROM cards';
    if (deck_id) {
      const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(Number(deck_id));
      if (!deck) return reply.code(404).send({ error: 'deck not found' });
      rows = db.prepare(`${sel} WHERE deck_id = ? ORDER BY position ASC, id ASC`).all(Number(deck_id));
      filename = `${deck.name.replace(/[^\w.-]+/g, '_')}.csv`;
    } else {
      rows = db.prepare(`${sel} ORDER BY deck_id, position ASC, id ASC`).all();
      filename = 'flashdeck_export.csv';
    }
    // Images are exported as base64 data URIs so the CSV round-trips through import.
    const cells = rows.map((r) => [
      r.front,
      r.back,
      r.extra,
      r.tags,
      r.image ? `data:${r.image_mime || 'image/jpeg'};base64,${Buffer.from(r.image).toString('base64')}` : '',
    ]);
    const csv = toCsv([['front', 'back', 'extra', 'tags', 'image'], ...cells]);
    return reply.type('text/csv').header('Content-Disposition', `attachment; filename="${filename}"`).send(csv);
  });
}
