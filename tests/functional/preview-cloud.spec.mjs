import {expect, test} from '@playwright/test';

// On non-production hosts, Settings shows a local-saving notice instead of the
// password field and Save & sync. The production gate (canPorchCloud) and the server guard are unchanged.
test('a preview shows the notice, hides the password and Save & sync, and sends nothing to /api', async ({page}) => {
  const api = [];
  page.on('request', (request) => { if (/\/api\//.test(request.url())) api.push(request.url()); });
  page.pageErrors = [];
  page.on('pageerror', (error) => page.pageErrors.push(String(error && error.message)));
  for (const size of [{width: 1180, height: 820}, {width: 390, height: 844}]) {
    await page.setViewportSize(size);
    await page.goto('/', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof openSettings === 'function' && typeof canPorchCloud === 'function');
    expect(await page.evaluate(() => canPorchCloud())).toBe(false);
    await page.evaluate(() => openSettings());
    const notice = page.locator('#porch-cloud-preview-notice');
    await notice.scrollIntoViewIfNeeded();
    await expect(notice).toBeVisible();
    await expect(notice).toHaveText('Cloud saving is unavailable in this preview; games save on this device.');
    await expect(page.locator('#porch-cloud-key')).toBeHidden();
    await expect(page.locator('#settings-modal button', {hasText: /Save & sync/})).toBeHidden();
    expect((await notice.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.evaluate(() => closeSettings());
  }
  expect(api).toEqual([]);
  expect(page.pageErrors).toEqual([]);
});

test('when the production gate is open, Settings still shows the password and Save & sync', async ({page}) => {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof openSettings === 'function' && typeof refreshPorchCloudSettings === 'function');
  // Stub only the gate in this page (no request is made): this is the live-site branch.
  await page.evaluate(() => { window.canPorchCloud = () => true; openSettings(); refreshPorchCloudSettings(); });
  await expect(page.locator('#porch-cloud-preview-notice')).toBeHidden();
  await page.locator('#porch-cloud-key').scrollIntoViewIfNeeded();
  await expect(page.locator('#porch-cloud-key')).toBeVisible();
  await expect(page.locator('#settings-modal button', {hasText: /Save & sync/})).toBeVisible();
});
