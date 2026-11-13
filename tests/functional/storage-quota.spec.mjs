import {mkdirSync, writeFileSync} from 'node:fs';
import {expect, test} from '@playwright/test';

test('measured localStorage cap leaves room for a score after photos fill the device', async ({page}) => {
  test.setTimeout(90000);
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof commitPlayerAvatar === 'function' && typeof saveData === 'function');
  const measured = await page.evaluate(() => {
    let used = 0;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      used += key.length + (localStorage.getItem(key) || '').length;
    }
    const probeKey = 'gn_quota_probe';
    const chunk = 'x'.repeat(64 * 1024);
    let fit = 0;
    let acc = '';
    let hit = false;
    try {
      while (fit < 30 * 1024 * 1024) {
        acc += chunk;
        localStorage.setItem(probeKey, acc);
        fit = acc.length;
      }
    } catch (error) {
      hit = !!(error && (error.name === 'QuotaExceededError' || error.code === 22));
    } finally {
      localStorage.removeItem(probeKey);
    }
    return {usedBefore: used, probeChars: fit, approxCap: used + fit, hitQuota: hit};
  });
  mkdirSync('/opt/cursor/artifacts', {recursive: true});
  writeFileSync('/opt/cursor/artifacts/quota-measure.json', JSON.stringify(measured, null, 2));
  expect(measured.hitQuota).toBe(true);
  expect(measured.approxCap).toBeGreaterThan(500000);

  const saved = await page.evaluate(() => {
    const prefix = 'data:image/jpeg;base64,';
    const photo = prefix + 'A'.repeat(180000 - prefix.length);
    let accepted = 0;
    let refused = false;
    for (let i = 0; i < 80 && !refused; i += 1) {
      const name = `Photo ${i}`;
      if (!allPlayers.includes(name)) allPlayers.push(name);
      refused = !commitPlayerAvatar(name, photo);
      if (!refused) accepted += 1;
    }
    history.push({
      id: 1900000000001,
      game: 'Five Crowns',
      date: '11/12/2026',
      totals: {Ada: 4},
      winners: [],
      rounds: [{round: 1, scores: {Ada: 4}}],
      originalRoster: ['Ada'],
      currentRound: 2,
      completed: false
    });
    markHistoryChanged();
    const persisted = saveData({fullPersist: true, syncCold: true});
    const stored = JSON.parse(localStorage.getItem('gn_history') || '[]');
    const row = stored.find((match) => match && match.id === 1900000000001);
    return {
      accepted,
      refused,
      persisted,
      storedScore: row && row.rounds[0].scores.Ada,
      memoryScore: history.find((match) => match && match.id === 1900000000001).rounds[0].scores.Ada,
      reserve: (localStorage.getItem('gn_score_reserve') || '').length
    };
  });
  expect(saved.refused).toBe(true);
  expect(saved.accepted).toBeGreaterThan(0);
  expect(saved.memoryScore).toBe(4);
  expect(saved.storedScore).toBe(4);
  expect(saved.persisted).not.toBe(false);
  writeFileSync('/opt/cursor/artifacts/quota-measure.json', JSON.stringify({measured, saved}, null, 2));
});
