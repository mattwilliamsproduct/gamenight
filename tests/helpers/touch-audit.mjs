// bpg2: 44pt tap targets and WCAG AA text contrast for the visible screen. Runs in the page.
export function auditVisible() {
  const parse = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return {r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1}; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  // Text over a photo or illustration is skipped (no solid background to measure).
  const bgOf = (el) => { let e = el; while (e) { const s = getComputedStyle(e); const c = parse(s.backgroundColor); if (s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return null; if (c && c.a > 0.9) return c; e = e.parentElement; } return {r: 255, g: 255, b: 255, a: 1}; };
  const visible = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(el); if (s.visibility === 'hidden' || Number(s.opacity) < 0.1) return false; if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false; return !!el.offsetParent || s.position === 'fixed'; };
  const label = (el) => `${el.id ? '#' + el.id : String(el.className).split(' ')[0] || el.tagName} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 24).replace(/\n/g, ' ')}"`;
  const small = [];
  document.querySelectorAll('button, a[href], [role=button], input:not([type=hidden]), select, [role=tab], [role=menuitem]').forEach((el) => {
    if (!visible(el)) return;
    // A checkbox or switch inside its label: the label is the target.
    const target = (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) || el;
    const r = target.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) small.push(`${Math.round(r.width)}x${Math.round(r.height)} ${label(el)}`);
  });
  const low = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode; const el = t.parentElement;
    if (!el || !t.textContent.trim() || !visible(el)) continue;
    if (el.closest('button:disabled, [aria-hidden="true"], #emu-label')) continue;
    const s = getComputedStyle(el); const fg = parse(s.color); const bg = bgOf(el);
    if (!fg || !bg) continue;
    const a = fg.a; const mix = {r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a)};
    const L1 = lum(mix), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(s.fontSize); const large = size >= 24 || (Number(s.fontWeight) >= 700 && size >= 18.66);
    if (ratio < (large ? 3 : 4.5)) low.push(`${ratio.toFixed(2)} ${size}px ${label(el)}`);
  }
  return {small: [...new Set(small)], low: [...new Set(low)]};
}
