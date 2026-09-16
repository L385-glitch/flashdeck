import { db, nextDeckColor } from '../db.js';
import { parseCsv, stripHeader } from '../lib/csv.js';

export default async function (app) {
  app.post('/api/import', (req, reply) => {
    const csv = String(req.body?.csv ?? '');
    if (!csv.trim()) return reply.code(400).send({ error: 'csv is required' });
    const mode = req.body?.mode === 'replace' ? 'replace' : 'append';

    // Resolve (or create) the target deck.
    let deckId = Number(req.body?.deck_id) || 0;
    let deck;
    if (deckId) {
      deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(deckId);
      if (!deck) return reply.code(404).send({ error: 'deck not found' });
    } else {
      const name = String(req.body?.deck_name ?? '').trim() || `Imported ${new Date().toISOString().slice(0, 10)}`;
      const existing = db.prepare('SELECT * FROM decks WHERE name = ?').get(name);
      if (existing) {
        deck = existing;
      } else {
        const r = db.prepare('INSERT INTO decks (name, color) VALUES (?, ?)').run(name, nextDeckColor());
        deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(r.lastInsertRowid);
      }
      deckId = deck.id;
    }

    const rows = stripHeader(parseCsv(csv));
    const insert = db.prepare(
      'INSERT INTO cards (deck_id, front, back, extra, tags) VALUES (?, ?, ?, ?, ?)'
    );
    const tx = db.transaction(() => {
      if (mode === 'replace') db.prepare('DELETE FROM cards WHERE deck_id = ?').run(deckId);
      let imported = 0;
      let skipped = 0;
      for (const row of rows) {
        const front = (row[0] ?? '').trim();
        if (!front) {
          skipped += 1;
          continue;
        }
        insert.run(deckId, front, (row[1] ?? '').trim(), (row[2] ?? '').trim(), (row[3] ?? '').trim());
        imported += 1;
      }
      return { imported, skipped };
    });

    const { imported, skipped } = tx();
    const deckNow = db.prepare('SELECT * FROM decks WHERE id = ?').get(deckId);
    deckNow.card_count = db.prepare('SELECT COUNT(*) AS n FROM cards WHERE deck_id = ?').get(deckId).n;
    return { deck: deckNow, imported, skipped, total_rows: rows.length };
  });
}
