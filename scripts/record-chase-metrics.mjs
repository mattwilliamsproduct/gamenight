export function getRecordChasePlayerRounds(gameData, player) {
  return (gameData?.rounds || []).filter(round =>
    !round.hailMaryBonus &&
    !round.joinBonus?.[player] &&
    round.scores &&
    round.scores[player] !== undefined
  );
}

export function matchQualifiesForRecordChase(match, player, gameName) {
  return match?.game === gameName &&
    match.totals?.[player] !== undefined &&
    getRecordChasePlayerRounds(match, player).length > 0;
}

export function getRecordChaseHistoryForPlayer(historyList, player, gameName) {
  return (historyList || []).filter(match => matchQualifiesForRecordChase(match, player, gameName));
}

export function indexRecordChaseHistory(historyList, gameName, players) {
  const byPlayer = Object.create(null);
  (players || []).forEach(player => { byPlayer[player] = []; });
  (historyList || []).forEach(match => {
    (players || []).forEach(player => {
      if (matchQualifiesForRecordChase(match, player, gameName)) byPlayer[player].push(match);
    });
  });
  return byPlayer;
}

export function pickRecordChaseFinal(matches, player, cfg, wantBest) {
  return matches.reduce((picked, match) => {
    const score = Number(match.totals?.[player]);
    if (!Number.isFinite(score)) return picked;
    const entry = { match, score };
    if (!picked) return entry;
    const better = wantBest
      ? (cfg.winLow ? score < picked.score : score > picked.score)
      : (cfg.winLow ? score > picked.score : score < picked.score);
    if (better) return entry;
    if (score === picked.score && (match.id || 0) > (picked.match.id || 0)) return entry;
    return picked;
  }, null);
}

export function getRecordChaseMetricFromMatches(matches, player, cfg) {
  const empty = {
    bestScore: null,
    avgFinal: null,
    worstScore: null,
    bestMatchId: null,
    worstMatchId: null,
    ariaLabel: 'No past games yet'
  };
  if (!matches.length) return empty;
  const bestEntry = pickRecordChaseFinal(matches, player, cfg, true);
  const worstEntry = pickRecordChaseFinal(matches, player, cfg, false);
  const avgFinal = Math.round(matches.reduce((sum, match) => sum + (Number(match.totals?.[player]) || 0), 0) / matches.length);
  const dash = value => value == null ? '—' : String(value);
  const ariaLabel = `Best ${dash(bestEntry?.score)}, average ${dash(avgFinal)}, worst ${dash(worstEntry?.score)}`;
  return {
    bestScore: bestEntry ? bestEntry.score : null,
    avgFinal,
    worstScore: worstEntry ? worstEntry.score : null,
    bestMatchId: Number.isFinite(bestEntry?.match?.id) ? bestEntry.match.id : null,
    worstMatchId: Number.isFinite(worstEntry?.match?.id) ? worstEntry.match.id : null,
    ariaLabel
  };
}

export function getRecordChaseMetricsLegacy(historyList, players, gameName, cfg) {
  const byPlayer = Object.create(null);
  (players || []).forEach(player => {
    byPlayer[player] = getRecordChaseMetricFromMatches(
      getRecordChaseHistoryForPlayer(historyList, player, gameName),
      player,
      cfg
    );
  });
  return byPlayer;
}

export function getRecordChaseMetricsOnce(historyList, players, gameName, cfg) {
  const matchesByPlayer = indexRecordChaseHistory(historyList, gameName, players);
  const byPlayer = Object.create(null);
  (players || []).forEach(player => {
    byPlayer[player] = getRecordChaseMetricFromMatches(matchesByPlayer[player] || [], player, cfg);
  });
  return byPlayer;
}
