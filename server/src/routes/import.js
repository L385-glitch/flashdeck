import { db, nextDeckColor } from '../db.js';
import { parseCsv } from '../lib/csv.js';
import { parseImage } from './helpers.js';

// Guess a column mapping from a header row. Unlabeled 3-column files fall back
// to the standard "Category, Front, Back" layout.
function suggestMapping(headers) {
  const m = {};
  const claim = (role, i) => {
    if (m[role] === undefined) m[role] = i;
  };
  headers.forEach((raw, i) => {
    const t = (raw || '').trim().toLowerCase();
    if (!t) return;
    if (/categor|deck|group|topic|subject|chapter/.test(t)) claim('category', i);
    else if (/front|question|prompt|term|word|input|stimulus/.test(t)) claim('front', i);
    else if (/back|answer|definition|explanation|output|meaning/.test(t)) claim('back', i);
    else if (/image|picture|img|photo|pic|jpg|jpeg|png/.test(t)) claim('image', i);
    else if (/tag/.test(t)) claim('tags', i);
  });
  if (m.front === undefined) m.front = m.category === 0 ? 1 : 0;
  if (m.back === undefined) {
    const used = new Set([m.category, m.front, m.image].filter((x) => x !== undefined));
    m.back = headers.findIndex((_, i) => !used.has(i));
  }
  return m;
}

// Look up a deck by name, creating it when allowed. Returns the deck row or null.
function resolveDeck(name, create) {
  const existing = db.prepare('SELECT * FROM decks WHERE name = ?').get(name);
  if (existing) return existing;
  if (!create) return null;
  const r = db.prepare('INSERT INTO decks (name, color) VALUES (?, ?)').run(name, nextDeckColor());
  return db.prepare('SELECT * FROM decks WHERE id = ?').get(r.lastInsertRowid);
}

export default async function (app) {
  // Parse a CSV and report its columns + a suggested mapping, so the client can
  // show a column-mapping UI before the user commits to an import.
  app.post('/api/import/preview', (req) => {
    const csv = String(req.body?.csv ?? '');
    const rows = parseCsv(csv);
    if (!rows.length) return { headers: [], row_count: 0, suggested: {} };
    const headers = rows[0].map((c, i) => (c.trim() ? c.trim() : `Column ${i + 1}`));
    // Heuristic: treat the first row as a header if it has no base64-looking cell
    // and at least one cell is a short label.
    const looksLikeHeader =
      rows[0].some((c) => c.trim().length > 0 && c.trim().length < 40) &&
      !rows[0].some((c) => c.length > 200);
    const dataRows = looksLikeHeader ? rows.slice(1) : rows;
    // With a header row, suggest from the labels; without one, assume front,back.
    const suggested = looksLikeHeader ? suggestMapping(rows[0]) : { front: 0, back: 1 };
    return { headers, row_count: dataRows.length, has_header: looksLikeHeader, suggested };
  });

  app.post('/api/import', (req, reply) => {
    const csv = String(req.body?.csv ?? '');
    if (!csv.trim()) return reply.code(400).send({ error: 'csv is required' });
    const mode = req.body?.mode === 'replace' ? 'replace' : 'append';
    const createDecks = req.body?.create_decks !== false;
    const defaultDeck = String(req.body?.default_deck ?? '').trim() || 'Imported';
    const stripHeader = req.body?.strip_header !== false;

    // Column mapping: { category: 0, front: 1, back: 2, image: 3, tags: 4 }.
    const map = req.body?.columns || {};
    const col = (role) => (map[role] !== undefined ? Number(map[role]) : undefined);
    const frontCol = col('front');
    if (frontCol === undefined || Number.isNaN(frontCol)) {
      return reply.code(400).send({ error: 'a Front column is required' });
    }

    let rows = parseCsv(csv);
    // The client's preview already decided whether the first row is a header;
    // honor that flag directly so custom header labels are handled correctly.
    if (stripHeader && rows.length > 1) rows = rows.slice(1);

    const cell = (row, i) => (i !== undefined && i >= 0 ? (row[i] ?? '').trim() : '');

    // Resolve the set of decks this import touches (by category + default).
    const deckByName = new Map();
    const deckFor = (category) => {
      const name = category || defaultDeck;
      if (deckByName.has(name)) return deckByName.get(name);
      const deck = resolveDeck(name, createDecks);
      deckByName.set(name, deck);
      return deck;
    };

    const insert = db.prepare(
      'INSERT INTO cards (deck_id, front, back, extra, tags, image, image_mime) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const tx = db.transaction(() => {
      if (mode === 'replace') {
        // Pre-scan to know which existing decks will be cleared.
        for (const row of rows) {
          const deck = deckFor(cell(row, col('category')));
          if (deck) db.prepare('DELETE FROM cards WHERE deck_id = ?').run(deck.id);
        }
      }

      let imported = 0;
      let skipped = 0;
      for (const row of rows) {
        const front = cell(row, frontCol);
        if (!front) {
          skipped += 1;
          continue;
        }
        const category = cell(row, col('category'));
        const deck = deckFor(category);
        if (!deck) {
          skipped += 1; // category has no deck and create_decks is off
          continue;
        }
        const img = parseImage(cell(row, col('image')));
        insert.run(
          deck.id,
          front,
          cell(row, col('back')),
          '',
          cell(row, col('tags')),
          img ? img.buffer : null,
          img ? img.mime : null
        );
        imported += 1;
      }
      return { imported, skipped };
    });

    const { imported, skipped } = tx();
    const decks = [...deckByName.values()].filter(Boolean).map((d) => ({ id: d.id, name: d.name }));
    return { imported, skipped, total_rows: rows.length, mode, decks };
  });
}
