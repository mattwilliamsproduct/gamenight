import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = 'http://127.0.0.1:4173';
const out = '/opt/cursor/artifacts/rc4';
mkdirSync(out, { recursive: true });

const checks = [];
function record(name, pass, detail) {
  checks.push({ name, pass: !!pass, detail: String(detail || '') });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${detail || ''}`);
}

async function hideGallery(page) {
  await page.evaluate(() => document.body.classList.add('gn-qa-gallery-hidden'));
}

async function shot(page, name) {
  await hideGallery(page);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
}

async function openScenario(page, id) {
  await page.goto(`${base}/?gnqa=1&gallery=0&scenario=${id}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true', null, { timeout: 15000 });
  await hideGallery(page);
}

async function seedBoard(page, count, round, finals) {
  return page.evaluate(({ count, round, finals }) => {
    const names = ['Nora', 'Owen', 'Priya', 'Theo', 'Ruby', 'Felix', 'June', 'Marco', 'Iris', 'Quinn', 'Ada', 'Bea', 'Cal', 'Dee'].slice(0, count);
    const played = Math.max(0, round - 1);
    const rounds = [];
    for (let r = 1; r <= played; r += 1) {
      const scores = {};
      names.forEach((name, index) => { scores[name] = index + r; });
      rounds.push({ round: r, scores });
    }
    if (rounds.length && names.length >= 4) {
      const last = rounds[rounds.length - 1].scores;
      last[names[0]] = 3;
      last[names[1]] = 8;
      last[names[2]] = 5;
      last[names[3]] = 10;
      if (rounds.length > 1) {
        const prev = rounds[rounds.length - 2].scores;
        prev[names[0]] = 4;
        prev[names[1]] = 6;
        prev[names[2]] = 9;
        prev[names[3]] = 7;
      }
    }
    currentGame = {
      id: 'proof-board',
      name: 'Five Crowns',
      currentRound: round,
      dealerOffset: 2 % names.length,
      originalRoster: names.slice(),
      retired: [],
      hailMaryUsed: names[0] ? [names[0]] : [],
      rounds,
      totals: {}
    };
    if (names[0]) {
      currentGame.rounds.push({ round: 0, scores: { [names[0]]: -5 }, hailMaryBonus: true });
    }
    if (window.BPGScorebook && typeof BPGScorebook.recomputeTotals === 'function') {
      BPGScorebook.recomputeTotals(currentGame);
    }
    if (typeof renderGame === 'function') renderGame();
    if (window.BPGSlice2 && typeof BPGSlice2.refresh === 'function') BPGSlice2.refresh();
    const row = document.querySelector('#scorecard-capture tbody tr');
    const board = document.getElementById('scorecard-capture');
    const places = [...document.querySelectorAll('#scorecard-capture tbody .scoreboard-rank-badge')].map((el) => el.textContent.trim());
    const lp = [...document.querySelectorAll('#scorecard-capture .s2-lp-status')].map((el) => ({
      text: el.textContent.trim(),
      lines: el.getClientRects().length,
      h: Math.round(el.getBoundingClientRect().height)
    }));
    return {
      places,
      rowHeight: row ? Math.round(row.getBoundingClientRect().height) : 0,
      boardWidth: board ? Math.round(board.getBoundingClientRect().width) : 0,
      viewWidth: window.innerWidth,
      roundCols: document.querySelectorAll('#scorecard-capture thead th.scorecard-round-th').length,
      lp,
      finals
    };
  }, { count, round, finals });
}

const browser = await chromium.launch();
const results = { boards: [], home: [] };

try {
  const page = await browser.newPage();
  for (const [width, height] of [[1194, 834], [1512, 982]]) {
    await page.setViewportSize({ width, height });
    await openScenario(page, 'home-live-8');
    await shot(page, `home-live-8-${width}`);
    const homeText = await page.locator('#slice2-home').innerText();
    record(`home enter scores ${width}`, /Enter Scores/.test(homeText), homeText.slice(0, 180));
    await openScenario(page, 'home-party');
    await shot(page, `home-table-6-${width}`);
    await page.evaluate(() => {
      players = players.slice(0, 2);
      if (window.BPGSlice2) BPGSlice2.refresh();
    });
    await shot(page, `home-table-2-${width}`);
    await page.evaluate(() => {
      const extra = ['Ada', 'Bea', 'Cal', 'Dee', 'Eve', 'Fay', 'Gil', 'Hana'];
      extra.forEach((name) => { if (!allPlayers.includes(name)) allPlayers.push(name); });
      players = ['Nora', 'Owen', 'Priya', 'Theo', 'Ruby', 'Felix', 'June', 'Marco', 'Iris', 'Quinn', 'Ada', 'Bea', 'Cal', 'Dee'];
      if (window.BPGSlice2) BPGSlice2.refresh();
    });
    await shot(page, `home-table-14-${width}`);

    for (const count of [2, 4, 8, 14]) {
      for (const spec of [{ round: 3, tag: 'early' }, { round: 11, tag: 'final' }]) {
        await openScenario(page, 'five-crowns-4');
        const measured = await seedBoard(page, count, spec.round, spec.tag === 'final');
        results.boards.push({ width, height, count, ...measured, tag: spec.tag });
        await shot(page, `board-${count}p-${spec.tag}-${width}`);
        if (count === 4 && spec.tag === 'early') {
          record(`ties 1,2,2,4 board ${width}`, measured.places.includes('4th') && measured.places.filter((p) => p === '2nd').length === 2, measured.places.join(','));
          record(`board width ${width}`, measured.boardWidth > width * 0.9, `${measured.boardWidth}/${measured.viewWidth}`);
          record(`row cap ${width}`, measured.rowHeight > 0 && measured.rowHeight <= 110, String(measured.rowHeight));
        }
        if (width === 1194 && count === 8 && spec.tag === 'final') {
          const wrapped = measured.lp.filter((item) => item.lines > 1 || item.h > 28);
          record('lp status one line', measured.lp.length > 0 && wrapped.length === 0, JSON.stringify(measured.lp.slice(0, 3)));
        }
      }
    }

    await openScenario(page, 'records-book');
    await shot(page, `records-${width}`);
    await page.screenshot({ path: `${out}/records-full-${width}.png`, fullPage: true });
    const recordsText = await page.locator('#hall-of-fame-view').innerText();
    record(`records note ${width}`, /Final-score records exclude assisted matches/.test(recordsText), '');
    record(`no record yet ${width}`, /No record yet/.test(recordsText) && !/\n-\n/.test(recordsText), '');
    const thumbs = await page.evaluate(() => [...document.querySelectorAll('.s2-game-thumb, .s2-ledger-mark')].slice(0, 8).map((img) => {
      const box = img.getBoundingClientRect();
      return { w: Math.round(box.width), h: Math.round(box.height), fit: getComputedStyle(img).objectFit };
    }));
    record(`portrait thumbs ${width}`, thumbs.length >= 6 && thumbs.every((t) => t.fit === 'contain' && t.h > t.w), JSON.stringify(thumbs.slice(0, 3)));
    const fame = page.locator('.s2-ledger-table');
    if (await fame.count()) await fame.first().screenshot({ path: `${out}/fame-close-${width}.png` });
  }

  await page.setViewportSize({ width: 1194, height: 834 });
  await openScenario(page, 'five-crowns-4');
  await seedBoard(page, 4, 3, false);
  await page.locator('#slice2-enter-btn').click();
  await page.waitForTimeout(300);
  const modal = page.locator('#score-entry-modal');
  record('score modal open', await modal.isVisible(), '');
  await shot(page, 'entry-modal-4-1194');
  for (const digit of ['9', '9', '9', '9']) {
    await page.locator(`#score-entry-modal button[onclick="scoreEntryKey('${digit}')"]`).click();
  }
  const afterKeys = await page.locator('#score-entry-error').innerText();
  const shown = await page.locator('.score-entry-row.active .score-entry-value').first().innerText().catch(() => '');
  record('keypad stops at 999', /999/.test(afterKeys) && !/9999/.test(shown), `${afterKeys} | ${shown}`);

  await page.keyboard.press('Digit1');
  const afterType = await page.locator('#score-entry-error').innerText();
  record('typing stops at 999', /999/.test(afterType), afterType);

  await page.evaluate(() => {
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => '10000' } });
    document.dispatchEvent(event);
  });
  const afterPaste = await page.locator('#score-entry-error').innerText();
  record('paste rejects 10000', /999/.test(afterPaste), afterPaste);

  await page.evaluate(() => {
    const player = scoreEntryModalState.activePlayer;
    scoreEntryModalState.values[player] = '250';
    scoreEntryModalState.acknowledged[player] = true;
    scoreEntryModalState.dirty[player] = true;
    updateScoreEntryActiveValue();
  });
  await page.locator('#score-entry-modal button', { hasText: 'Submit' }).first().click().catch(async () => {
    await page.locator('#score-entry-modal .btn-primary').last().click();
  });
  await page.waitForTimeout(200);
  const confirmText = await page.locator('#score-entry-error').innerText();
  record('unusual confirm', /Is that correct/.test(confirmText) && /Fix it/.test(confirmText) && /It's fine, save anyway/.test(confirmText) && !/Use score/.test(confirmText), confirmText);
  await shot(page, 'unusual-confirm-1194');

  await page.evaluate(() => {
    currentGame.name = 'Hand and Foot';
    const next = BPGScorebook.applyScoreEntryKey({ value: '999', acknowledged: true, dirty: true, digitCap: BPGScorebook.entryDigitCap(currentGame, 'scores') }, '9');
    const blocked = BPGScorebook.applyScoreEntryKey({ value: next.value, acknowledged: true, dirty: true, digitCap: 4 }, '1');
    window.__canasta = { next: next.value, blocked: blocked.rejected, kept: blocked.value };
    currentGame.name = 'Five Crowns';
  });
  const canasta = await page.evaluate(() => window.__canasta);
  record('canasta helper still 9999', canasta.next === '9999' && canasta.blocked === true && canasta.kept === '9999', JSON.stringify(canasta));

  await openScenario(page, 'demo-canasta');
  await page.locator('#slice2-enter-btn').click();
  await page.waitForTimeout(300);
  await page.locator('.hf-field', { hasText: 'Card points' }).first().click();
  await page.evaluate(() => {
    const player = scoreEntryModalState.activePlayer;
    scoreEntryModalState.activeField = 'cardPoints';
    if (scoreEntryModalState.values[player]) scoreEntryModalState.values[player].cardPoints = '';
    updateScoreEntryActiveValue();
  });
  for (let i = 0; i < 4; i += 1) {
    await page.locator(`#score-entry-modal button[onclick="scoreEntryKey('9')"]`).click();
  }
  const canastaShown = await page.locator('.hf-field.active .hf-field-value').innerText();
  record('canasta modal accepts 9999', canastaShown.replace(/\D/g, '') === '9999', canastaShown);
  await page.locator(`#score-entry-modal button[onclick="scoreEntryKey('9')"]`).click();
  const canastaKept = await page.locator('.hf-field.active .hf-field-value').innerText();
  const canastaWarn = await page.locator('#score-entry-error').innerText();
  record('canasta modal rejects 5th digit', canastaKept.replace(/\D/g, '') === '9999' && /9,999/.test(canastaWarn), `${canastaKept} | ${canastaWarn}`);
  await shot(page, 'canasta-entry-1194');
  await page.evaluate(() => { if (typeof closeScoreEntryModalOnly === 'function') closeScoreEntryModalOnly(); });
  const bigTotals = await page.evaluate(() => {
    const keys = Object.keys(currentGame.totals || {});
    keys.forEach((key, index) => { currentGame.totals[key] = index ? 10500 : 12340; });
    const round = (currentGame.rounds || []).find((item) => item && item.scores);
    const scoreKey = round ? Object.keys(round.scores)[0] : '';
    if (round && scoreKey) round.scores[scoreKey] = 10500;
    if (typeof renderGame === 'function') renderGame();
    const cells = [...document.querySelectorAll('#scorecard-capture .scorecard-col-total, #scorecard-capture .scorecard-total-value')];
    return cells.slice(0, 6).map((el) => ({
      text: el.textContent.trim(),
      overflow: el.scrollWidth > el.clientWidth + 2
    }));
  });
  await shot(page, 'canasta-totals-1194');
  const homeTotals = await page.evaluate(() => {
    if (typeof goHome === 'function') goHome();
    if (window.BPGSlice2 && typeof BPGSlice2.refresh === 'function') BPGSlice2.refresh();
    return [...document.querySelectorAll('.s2-standing-score')].slice(0, 4).map((el) => ({
      text: el.textContent.trim(),
      overflow: el.scrollWidth > el.clientWidth + 2
    }));
  });
  await shot(page, 'canasta-home-totals-1194');
  const boardBig = bigTotals.some((cell) => Number(String(cell.text).replace(/\D/g, '')) >= 10000);
  record('canasta totals above 10000 fit', boardBig && homeTotals.length > 0 && bigTotals.every((cell) => !cell.overflow) && homeTotals.every((cell) => !cell.overflow), `${JSON.stringify(bigTotals)} ${JSON.stringify(homeTotals)}`);

  await openScenario(page, 'five-crowns-4');
  await seedBoard(page, 8, 4, false);
  await page.locator('#slice2-enter-btn').click();
  await page.waitForTimeout(250);
  const score8 = await page.locator('#score-entry-modal .score-entry-panel').boundingBox();
  record('score modal 8 fills screen', !!score8 && score8.width > 1194 * 0.88 && score8.height > 834 * 0.85, JSON.stringify(score8));
  await shot(page, 'entry-modal-8-1194');
  await page.evaluate(() => { if (typeof closeScoreEntryModalOnly === 'function') closeScoreEntryModalOnly(); });
  await seedBoard(page, 14, 4, false);
  await page.locator('#slice2-enter-btn').click();
  await page.waitForTimeout(250);
  const score14 = await page.locator('#score-entry-modal .score-entry-panel').boundingBox();
  const rowCount = await page.locator('#score-entry-modal .score-entry-row').count();
  record('score modal 14 opens', !!score14 && score14.height > 834 * 0.85 && rowCount >= 14, `${rowCount} ${JSON.stringify(score14)}`);
  await shot(page, 'entry-modal-14-1194');

  await openScenario(page, 'wizard-late-5');
  await page.evaluate(() => { currentGame.wizardPhase = 'bidding'; if (typeof renderGame === 'function') renderGame(); });
  await page.locator('#slice2-enter-btn').click();
  await page.waitForTimeout(250);
  const bidTitle = await page.locator('#score-entry-modal').innerText();
  record('bid modal opens', /bids/i.test(bidTitle), bidTitle.slice(0, 80));
  await shot(page, 'bid-modal-wizard-1194');
  await page.evaluate(() => { if (typeof closeScoreEntryModalOnly === 'function') closeScoreEntryModalOnly(); });

  await openScenario(page, 'five-crowns-late-8');
  const lateLp = await page.evaluate(() => {
    const cols = document.querySelectorAll('#scorecard-capture thead th.scorecard-round-th').length;
    const labels = [...document.querySelectorAll('#scorecard-capture .s2-lp-status')].map((el) => ({
      text: el.textContent.trim(),
      lines: el.getClientRects().length,
      h: Math.round(el.getBoundingClientRect().height)
    }));
    return { cols, labels };
  });
  await shot(page, 'lp-status-11-1194');
  record('lp status one line on late board', lateLp.labels.length > 0 && lateLp.labels.every((item) => item.lines === 1 && item.h <= 28), JSON.stringify(lateLp));

  await page.evaluate(() => { if (typeof openLifePreserverRules === 'function') openLifePreserverRules(); });
  await page.waitForTimeout(200);
  const lpRules = await page.locator('#life-preserver-rules-modal .bp-modal-panel').boundingBox();
  const lpTitle = await page.locator('#life-preserver-rules-title').innerText();
  record('lp rules header fills screen', !!lpRules && lpRules.width > 1194 * 0.88 && lpRules.height > 834 * 0.85 && /How you get one/.test(lpTitle), `${lpTitle} ${JSON.stringify(lpRules)}`);
  await shot(page, 'lp-rules-1194');
  await page.locator('#life-preserver-rules-modal button', { hasText: '×' }).click();
  await page.waitForTimeout(400);
  const lpClosed = await page.evaluate(() => document.getElementById('life-preserver-rules-modal').classList.contains('hidden'));
  record('lp rules closes', lpClosed, '');

  await openScenario(page, 'home-party');
  const seatBefore = await page.locator('.s2-seat-name').first().innerText();
  const seatBox = await page.locator('.s2-seat').first().boundingBox();
  await page.locator('[data-s2-action="seat-down"]').first().click();
  const seatAfter = await page.locator('.s2-seat-name').first().innerText();
  record('tonight table row and move', !!seatBox && seatBox.height >= 64 && seatBefore !== seatAfter, `${Math.round(seatBox?.height || 0)} ${seatBefore} -> ${seatAfter}`);
  await shot(page, 'tonight-table-moved-1194');

  await openScenario(page, 'home-live-8');
  await page.evaluate(() => { if (typeof openReorderPlayersModal === 'function') openReorderPlayersModal(); });
  await page.waitForTimeout(200);
  const reorderBefore = await page.locator('.reorder-player-row').first().innerText();
  const reorderBox = await page.locator('#reorder-players-modal .bp-modal-panel').boundingBox();
  await page.locator('#reorder-players-modal [aria-label="Move down"]').first().click();
  const reorderAfter = await page.locator('.reorder-player-row').first().innerText();
  record('reorder move and size', !!reorderBox && reorderBox.width > 700 && reorderBefore !== reorderAfter, `${reorderBefore.split('\n')[0]} -> ${reorderAfter.split('\n')[0]}`);
  await shot(page, 'reorder-moved-1194');
  await page.evaluate(() => { if (typeof closeReorderPlayersModal === 'function') closeReorderPlayersModal(); });

  await openScenario(page, 'home-live-8');
  const liveBefore = await page.evaluate(() => JSON.stringify({ id: currentGame && currentGame.id, rounds: currentGame && currentGame.rounds, roster: currentGame && currentGame.originalRoster }));
  await page.locator('[data-s2-action="edit-next-roster"]').click();
  await shot(page, 'next-roster-at-max-1194');
  const blocked = await page.locator('[data-s2-action="pick-add"]:disabled').count();
  const limitNote = await page.locator('.s2-limit-note').innerText().catch(() => '');
  record('player limit blocks extra seats', blocked > 0 && /up to|Unseat|room|players/.test(limitNote), `${blocked} ${limitNote}`);
  await page.evaluate(() => document.querySelector('[data-s2-game="818"]').click());
  const enabled = page.locator('[data-s2-action="pick-add"]:not(:disabled)');
  await enabled.nth(0).check();
  await enabled.nth(1).check();
  await shot(page, 'next-roster-1194');
  const addLabel = await page.locator('.s2-picker button[type="submit"]').innerText();
  const liveAfter = await page.evaluate(() => JSON.stringify({ id: currentGame && currentGame.id, rounds: currentGame && currentGame.rounds, roster: currentGame && currentGame.originalRoster }));
  record('player multi-select', /Add 2 players/.test(addLabel), addLabel);
  record('live roster unchanged by next-match picks', liveBefore === liveAfter, '');

  await openScenario(page, 'home-resume-unfinished');
  await shot(page, 'unfinished-2-1194');
  const beforeHistory = await page.evaluate(() => JSON.stringify(history));
  await page.locator('[data-s2-action="seat-out"]').first().click();
  const afterHistory = await page.evaluate(() => JSON.stringify(history));
  record('roster edit leaves unfinished match', beforeHistory === afterHistory, '');
  await page.evaluate(() => { history = history.slice(0, 1); if (window.BPGSlice2) BPGSlice2.refresh(); });
  const one = await page.locator('#slice2-home').innerText();
  record('one unfinished hides view all', /Resume unfinished/.test(one) && !/View all/.test(one), '');
  await shot(page, 'unfinished-1-1194');
  await page.evaluate(() => { history = []; if (window.BPGSlice2) BPGSlice2.refresh(); });
  const none = await page.locator('#slice2-home').innerText();
  record('zero unfinished hides banner', !/Resume unfinished/.test(none), '');
  await shot(page, 'unfinished-0-1194');
  await page.evaluate(() => {
    const base = { id: 1, game: 'Five Crowns', name: 'Five Crowns', currentRound: 3, date: '11/1/2026', originalRoster: ['Nora', 'Owen'], players: ['Nora', 'Owen'], rounds: [], totals: {}, completed: false };
    history = [base, { ...base, id: 2, date: '11/2/2026', currentRound: 4 }, { ...base, id: 3, game: 'Wizard', name: 'Wizard', date: '11/3/2026', currentRound: 2 }];
    if (window.BPGSlice2) BPGSlice2.refresh();
  });
  const three = await page.locator('#slice2-home').innerText();
  record('three unfinished still hides view all', /Resume unfinished/.test(three) && !/View all/.test(three) && !/Unfinished matches/.test(three), three.slice(0, 160));

  await openScenario(page, 'home-party');
  await page.locator('.s2-game').nth(0).click();
  await shot(page, 'covers-crowns-1194');
  const flip = page.locator('.s2-game').filter({ hasText: 'Flip' });
  if (await flip.count()) await flip.first().click();
  else await page.locator('.s2-game').nth(3).click();
  await shot(page, 'covers-flip7-1194');
  const selected = await page.locator('.s2-game.is-selected .s2-selected-tag').innerText();
  record('selected cover label', /Selected/.test(selected), selected);

  await openScenario(page, 'five-crowns-life-preserver-threshold');
  await shot(page, 'lp-status-board-1194');
  const lp = await page.locator('#scorecard-capture').innerText();
  record('lp status labels', /LP · (Available|Used|Not yet)/.test(lp), lp.includes('Available') || lp.includes('Used') || lp.includes('Not yet'));
  await page.evaluate(() => { if (typeof authorizeHailMary === 'function') { const name = (currentGame.originalRoster || [])[0]; if (name) authorizeHailMary(name); } });
  await page.waitForTimeout(300);
  if (await page.locator('#wheel-modal').isVisible()) await shot(page, 'lp-modal-1194');

  await openScenario(page, 'home-live-8');
  await page.evaluate(() => { if (typeof openReorderPlayersModal === 'function') openReorderPlayersModal(); });
  await page.waitForTimeout(200);
  if (await page.locator('#reorder-players-modal').isVisible()) await shot(page, 'reorder-8-1194');
  await page.evaluate(() => { if (typeof closeReorderPlayersModal === 'function') closeReorderPlayersModal(); });

  await openScenario(page, 'records-book');
  await page.evaluate(() => { if (typeof openGameRules === 'function') openGameRules('818'); });
  await page.waitForTimeout(250);
  await shot(page, 'rules-818-1194');
  const rulesBox = await page.locator('#rules-modal .bp-modal-panel').boundingBox();
  const rulesType = await page.locator('#rules-content').evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  record('rules fills screen', !!rulesBox && rulesBox.width > 1194 * 0.88 && rulesBox.height > 834 * 0.85 && rulesType >= 16, `${rulesType} ${JSON.stringify(rulesBox)}`);
  await page.evaluate(() => { if (typeof closeRules === 'function') closeRules(); });
  await page.evaluate(() => { if (typeof openSettings === 'function') openSettings(); });
  await page.waitForTimeout(250);
  if (await page.locator('#settings-modal').isVisible()) await shot(page, 'settings-modal-1194');
  const settingsBox = await page.locator('#settings-modal .bp-modal-panel').boundingBox();
  const settingsType = await page.locator('#settings-modal .bp-modal-panel').evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  const settingsBtn = await page.locator('#settings-modal button').first().evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  record('settings fills screen and type', !!settingsBox && settingsBox.width > 1194 * 0.88 && settingsBox.height > 834 * 0.85 && settingsType >= 16 && settingsBtn >= 16, `${settingsType}/${settingsBtn} ${JSON.stringify(settingsBox)}`);

  const photoPage = await browser.newPage({ viewport: { width: 1194, height: 834 } });
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  await photoPage.addInitScript((avatar) => {
    const profiles = { Nora: { avatar } };
    localStorage.setItem('gn_profiles', JSON.stringify(profiles));
    localStorage.setItem('gn_all_players', JSON.stringify(['Nora']));
    localStorage.setItem('gn_players_v2', JSON.stringify(['Nora']));
  }, png);
  await photoPage.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await photoPage.reload({ waitUntil: 'domcontentloaded' });
  const stored = await photoPage.evaluate(() => localStorage.getItem('gn_profiles'));
  record('photo persistence', stored && stored.includes('data:image/png'), stored ? stored.slice(0, 80) : 'missing');
  await photoPage.close();
} catch (error) {
  record('script', false, error && error.stack ? error.stack : String(error));
} finally {
  writeFileSync(`${out}/checks.json`, JSON.stringify({ checks, results }, null, 2));
  await browser.close();
}
