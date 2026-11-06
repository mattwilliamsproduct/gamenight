import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

async function headerBoxes(page) {
  return page.evaluate(() => {
    const line = document.getElementById('slice2-board-line');
    const sub = document.getElementById('slice2-board-sub');
    if (!line || !sub || sub.hidden) return {ok: true, reason: 'missing-or-hidden'};
    const a = line.getBoundingClientRect();
    const b = sub.getBoundingClientRect();
    const overlap = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    return {
      ok: !overlap,
      overlap,
      line: {l: a.left, r: a.right, t: a.top, b: a.bottom, text: (line.textContent || '').trim()},
      sub: {l: b.left, r: b.right, t: b.top, b: b.bottom, text: (sub.textContent || '').trim()}
    };
  });
}

for (const [scenario, label] of [['wizard-6-mid', 'Wizard'], ['five-crowns-4', 'Five Crowns']]) {
  test(`${label} board title and dealer meta never overlap at desktop sizes`, async ({page}) => {
    test.setTimeout(90000);
    for (const size of [
      {width: 1024, height: 768},
      {width: 1280, height: 720},
      {width: 1440, height: 900},
      {width: 1920, height: 1080}
    ]) {
      await page.setViewportSize(size);
      await openScenario(page, {scenario, surface: 'scorecard'});
      await page.waitForTimeout(250);
      const m = await headerBoxes(page);
      expect(m.sub?.text || '', `${size.width} has dealer/meta`).toMatch(/Dealer:/i);
      expect(m.overlap, `${size.width} overlap line=${m.line?.text} sub=${m.sub?.text}`).toBe(false);
      // Meta should sit on its own row under the title (not beside/over it).
      expect(m.sub.t, `${size.width} sub below title`).toBeGreaterThanOrEqual(m.line.t + 4);
    }
  });
}
