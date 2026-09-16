export function fmtNum(n, maxFrac = 0) {
  return Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

export function fmtDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function fmtInterval(days) {
  const d = Number(days) || 0;
  if (d <= 0) return 'new';
  if (d < 1) {
    const h = Math.round(d * 24);
    return h < 1 ? Math.max(1, Math.round(d * 24 * 60)) + 'm' : h + 'h';
  }
  if (d < 60) return (Math.round(d * 10) / 10) + 'd';
  return Math.round(d / 30) + 'mo';
}
