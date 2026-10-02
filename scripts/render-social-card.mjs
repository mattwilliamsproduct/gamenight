// Renders public/social-card.jpg (the link preview) from the real sample-night scorecard.
// Run after a visual change to the scorecard: npm run render:social-card
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 4179);
const base = `http://127.0.0.1:${port}`;
const out = process.env.OUT || join(root, 'public', 'social-card.jpg');

const server = spawn(process.execPath, ['scripts/serve-public.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'inherit']
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.stdout.once('data', resolve);
});

const browser = await chromium.launch();
try {
  const app = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
  await app.goto(`${base}/?sample=1`, { waitUntil: 'networkidle' });
  await app.waitForFunction(() => document.body.classList.contains('sample-night'));
  await app.evaluate(() => document.getElementById('toast-container')?.replaceChildren());
  await app.waitForTimeout(800);
  const theme = await app.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const token = name => css.getPropertyValue(name).trim();
    const fontOf = selector => {
      const el = document.querySelector(selector);
      return el ? getComputedStyle(el).fontFamily : 'serif';
    };
    return {
      ink: token('--ink') || '#0f2f2a',
      muted: token('--muted') || '#5f6b66',
      emerald: token('--emerald') || '#0f766e',
      surface: token('--surface') || '#fffdf9',
      sunset: token('--bp-sunset') || '#f19a6b',
      display: fontOf('.bp-welcome-title'),
      brand: fontOf('.bp-brand-main'),
      body: getComputedStyle(document.body).fontFamily
    };
  });
  const shot = await app.locator('#game-screen').screenshot({ type: 'png' });
  const icon = await readFile(join(root, 'public', 'bp-icon-192.png'));

  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${base}/assets/fonts.css">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body {
    position: relative;
    font-family: ${theme.body};
    color: ${theme.ink};
    background:
      radial-gradient(120% 90% at 100% 100%, rgba(241,154,107,0.42), transparent 60%),
      radial-gradient(80% 70% at 0% 0%, rgba(15,118,110,0.16), transparent 70%),
      #f7efe2;
  }
  .copy { position: absolute; left: 64px; top: 64px; width: 430px; }
  .brand { display: flex; align-items: center; gap: 16px; }
  .brand img { width: 64px; height: 64px; border-radius: 18px; box-shadow: 0 6px 18px rgba(15,47,42,0.22); }
  .brand span { display: flex; flex-direction: column; align-items: center; line-height: 1; }
  .brand b { font-family: ${theme.brand}; font-size: 40px; font-weight: 400; color: ${theme.ink}; }
  .brand small { margin-top: 4px; font-size: 13px; font-weight: 800; letter-spacing: 0.32em; color: ${theme.sunset}; }
  .kicker { margin-top: 52px; font-size: 15px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: ${theme.emerald}; }
  h1 { margin: 14px 0 0; font-family: ${theme.display}; font-size: 50px; line-height: 1.08; font-weight: 400; }
  .games { margin-top: 22px; font-size: 19px; line-height: 1.5; font-weight: 700; color: ${theme.muted}; }
  .url { position: absolute; left: 64px; bottom: 54px; font-size: 18px; font-weight: 800; color: ${theme.ink}; display: flex; align-items: center; gap: 10px; }
  .url i { width: 10px; height: 10px; border-radius: 99px; background: ${theme.sunset}; box-shadow: 0 0 0 4px rgba(241,154,107,0.3); }
  .card {
    position: absolute; left: 540px; top: 64px; width: 760px; height: 640px;
    border-radius: 28px; overflow: hidden;
    background: ${theme.surface} url(data:image/png;base64,${shot.toString('base64')}) left top / 760px auto no-repeat;
    box-shadow: 0 30px 60px -20px rgba(15,47,42,0.45), 0 0 0 1px rgba(15,47,42,0.08);
  }
</style></head><body>
  <div class="copy">
    <div class="brand"><img src="data:image/png;base64,${icon.toString('base64')}" alt=""><span><b>Back Porch</b><small>GAMES</small></span></div>
    <div class="kicker">For porch game night</div>
    <h1>You play the cards. Back Porch keeps the score.</h1>
    <div class="games">Wizard · Five Crowns · 818<br>Flip 7 · Beat the Heat · Rook</div>
  </div>
  <div class="url"><i></i>cardknight.vercel.app</div>
  <div class="card"></div>
</body></html>`;

  const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await card.route(`${base}/__social-card`, route => route.fulfill({ contentType: 'text/html', body: html }));
  await card.goto(`${base}/__social-card`, { waitUntil: 'networkidle' });
  await card.evaluate(() => document.fonts.ready);
  await card.screenshot({ path: out, type: 'jpeg', quality: 86 });
  const { size } = await stat(out);
  console.log(`Wrote ${out} (${Math.round(size / 1024)} KB)`);
} finally {
  await browser.close();
  server.kill();
}
