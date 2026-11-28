import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

test('Past nights uses 1st/2nd/3rd ordinals like Home', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openScenario(page, {scenario: 'records-book', surface: 'records'});
  await page.locator('#slice2-show-nights').click();
  const nights = page.locator('.s2-nights-col');
  await expect(nights).toBeVisible();
  const places = await nights.locator('.s2-night-place').evaluateAll((nodes) =>
    nodes.map((node) => (node.textContent || '').trim()).filter(Boolean)
  );
  expect(places.length, JSON.stringify(places)).toBeGreaterThan(0);
  for (const place of places) {
    expect(place, place).toMatch(/^\d+(st|nd|rd|th)$/);
    expect(place, place).not.toMatch(/^\d+\.$/);
  }
  const dense = await page.evaluate(() => {
    if (!window.BPGRecords || typeof BPGRecords.densePlaceLabel !== 'function') return null;
    return [1, 2, 3, 4, 11, 12, 13, 21].map((n) => BPGRecords.densePlaceLabel(n));
  });
  expect(dense).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st']);
});
