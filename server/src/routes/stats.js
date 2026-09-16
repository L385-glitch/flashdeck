import { db } from '../db.js';
import { nowIso } from './helpers.js';

export default async function (app) {
  app.get('/api/stats', () => {
    const now = nowIso();
    const today = now.slice(0, 10);
    const totalCards = db.prepare('SELECT COUNT(*) AS n FROM cards').get().n;
    const totalDecks = db.prepare('SELECT COUNT(*) AS n FROM decks').get().n;
    const dueNow = db.prepare('SELECT COUNT(*) AS n FROM cards WHERE due <= ?').get(now).n;
    const dayStart = `${today}T00:00:00Z`;
    const dueToday = db
      .prepare('SELECT COUNT(*) AS n FROM cards WHERE due <= ? AND due > ?')
      .get(now, dayStart).n;
    const reviewedToday = db
      .prepare('SELECT COUNT(*) AS n FROM reviews WHERE reviewed_at >= ?')
      .get(dayStart).n;
    const matured = db.prepare('SELECT COUNT(*) AS n FROM cards WHERE reps >= 2').get().n;
    return { totalCards, totalDecks, dueNow, dueToday, reviewedToday, matured };
  });
}
