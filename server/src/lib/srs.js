// SM-2 spaced-repetition scheduling.
//
// rating: 0 = Again, 1 = Hard, 2 = Good, 3 = Easy
//
// `card` must carry at least { ease, interval, reps, lapses }.
// Returns the updated { ease, interval, reps, lapses, due } where `due` is an
// ISO timestamp and `interval` is in days.

const MIN_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;
const AGAIN_MS = 10 * 60 * 1000; // "Again" -> relearn in 10 minutes

export function schedule(card, rating, now = new Date()) {
  let ease = Number(card.ease) || 2.5;
  let interval = Number(card.interval) || 0;
  let reps = Number(card.reps) || 0;
  let lapses = Number(card.lapses) || 0;
  let due;

  if (rating === 0) {
    lapses += 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
    interval = 0;
    reps = 0;
    due = new Date(now.getTime() + AGAIN_MS);
  } else if (rating === 1) {
    ease = Math.max(MIN_EASE, ease - 0.15);
    interval = interval === 0 ? 0.5 : interval * 1.2;
    reps += 1;
    due = new Date(now.getTime() + interval * DAY_MS);
  } else if (rating === 2) {
    interval = interval === 0 ? 1 : interval * ease;
    reps += 1;
    due = new Date(now.getTime() + interval * DAY_MS);
  } else {
    ease = ease + 0.15;
    interval = interval === 0 ? 3 : interval * ease * 1.3;
    reps += 1;
    due = new Date(now.getTime() + interval * DAY_MS);
  }

  return {
    ease: Math.round(ease * 100) / 100,
    interval: Math.round(interval * 100) / 100,
    reps,
    lapses,
    due: due.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
}
