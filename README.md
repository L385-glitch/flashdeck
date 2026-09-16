# Flashdeck

A small, self-hosted flashcard app. Keep decks of cards, import them from CSV,
and study them with SM-2 spaced repetition.

Built to match the stack and conventions of [daydeck](https://github.com/L385-glitch/daydeck):
Node 22 + Fastify + better-sqlite3 on the back, Svelte 5 + Vite + Tailwind 4 up front,
shipped as a Docker image via GitHub Actions.

## Features

- **Decks** — create, rename, recolor, delete.
- **Cards** — front / back / extra / tags, add and edit inline.
- **CSV import** — upload a `.csv` (columns: `front,back,extra,tags`), into a new
  or existing deck, append or replace.
- **Spaced repetition** — SM-2 scheduling with four ratings (Again / Hard / Good / Easy).
- **Study queue** — reviews the cards that are due, with a progress bar.
- **Stats** — total cards, due now, reviewed today.
- **CSV export** — download any deck (or everything) as `.csv`.

## Local development

```bash
npm install
npm run dev:server   # API on http://localhost:3000
npm run dev:client   # Vite on http://localhost:5173 (proxies /api)
```

## Docker

```bash
docker compose up --build
# -> http://localhost:3000
```

Data is stored in `./data` (override with `DATA_DIR`).

## CSV format

```csv
front,back,extra,tags
Capital of France?,Paris,"Eiffel Tower, Louvre",geo
What is 2+2?,"4",,math
```

- Columns are positional: `front`, `back`, `extra` (optional), `tags` (optional, comma-free or quoted).
- A header row is detected and skipped automatically.
- Quoted fields support embedded commas, newlines, and doubled quotes.
