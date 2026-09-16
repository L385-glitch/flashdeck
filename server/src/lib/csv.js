// A small, dependency-free CSV parser that handles quoted fields, embedded
// commas and newlines, and doubled quotes ("") as an escaped quote.
// Returns an array of rows; each row is an array of string fields.

export function parseCsv(text) {
  if (typeof text !== 'string') return [];
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1; // strip BOM
  const n = text.length;
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== '')) rows.push(row);
  }
  return rows;
}

// The reverse: quote a field only when it contains a comma, quote, or newline.
export function csvField(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCsv(rows) {
  return rows.map((r) => r.map(csvField).join(',')).join('\n');
}

// Drop a header row if the first row looks like one (front/back/... labels).
export function stripHeader(rows) {
  if (!rows.length) return rows;
  const first = rows[0].map((c) => c.trim().toLowerCase());
  const headerish = ['front', 'back', 'extra', 'tags', 'question', 'answer', 'hint'].some((h) =>
    first.includes(h)
  );
  return headerish ? rows.slice(1) : rows;
}
