async function registerRoutes(app) {
  const [decks, cards, imports, study, stats, exports] = await Promise.all([
    import('./decks.js'),
    import('./cards.js'),
    import('./import.js'),
    import('./study.js'),
    import('./stats.js'),
    import('./export.js'),
  ]);
  await app.register(decks.default);
  await app.register(cards.default);
  await app.register(imports.default);
  await app.register(study.default);
  await app.register(stats.default);
  await app.register(exports.default);
}

export default registerRoutes;
