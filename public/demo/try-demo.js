(function (root) {
  'use strict';

  var SESSION_KEY = 'bpg_try_demo';
  var TIP_KEY = 'bpg_try_demo_tip';
  var PREFIX = 'bpg_demo_';
  var GN = 'gn_';
  var SEED_URL = '../qa/fixtures.mjs?v=try-demo-1';
  var hooks = {};

  function searchParams(search) {
    try {
      return new URLSearchParams(search == null ? String(location.search || '') : search);
    } catch (error) {
      return new URLSearchParams();
    }
  }

  function wantsTry(search) {
    return searchParams(search).get('demo') === 'try';
  }

  function sessionOn() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (error) { return false; }
  }

  function setSession(on) {
    try {
      if (on) sessionStorage.setItem(SESSION_KEY, '1');
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {}
  }

  function activate() {
    root.__BPG_TRY_DEMO = true;
    setSession(true);
    try { document.documentElement.classList.add('bpg-try-demo'); } catch (error) {}
  }

  if (wantsTry() || sessionOn()) activate();

  function active() {
    return !!root.__BPG_TRY_DEMO;
  }

  function storageKey(key) {
    if (!active()) return key;
    if (typeof key === 'string' && key.indexOf(GN) === 0) return PREFIX + key.slice(GN.length);
    return key;
  }

  function demoKeys() {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i);
        if (key && key.indexOf(PREFIX) === 0) keys.push(key);
      }
    } catch (error) {}
    return keys;
  }

  function hasDemoBook() {
    try {
      var players = JSON.parse(localStorage.getItem(PREFIX + 'players_v2') || '[]');
      var history = JSON.parse(localStorage.getItem(PREFIX + 'history') || '[]');
      var current = localStorage.getItem(PREFIX + 'current');
      return (Array.isArray(players) && players.length > 0)
        || (Array.isArray(history) && history.length > 0)
        || (current && current !== 'null');
    } catch (error) {
      return false;
    }
  }

  function clearDemoStore() {
    demoKeys().forEach(function (key) {
      try { localStorage.removeItem(key); } catch (error) {}
    });
  }

  function blockFetch() {
    if (root.__BPG_TRY_DEMO_FETCH) return;
    var orig = root.fetch;
    if (typeof orig !== 'function') return;
    root.__BPG_TRY_DEMO_FETCH = true;
    root.fetch = function (input, init) {
      var url = '';
      try {
        if (typeof input === 'string') url = input;
        else if (input && input.url) url = String(input.url);
      } catch (error) {}
      if (active() && /\/api\/sync(?:\?|$)/.test(url)) {
        return Promise.reject(Object.assign(new Error('demo-sync-blocked'), {status: 0}));
      }
      return orig.apply(this, arguments);
    };
  }

  if (active()) blockFetch();

  async function loadSeed() {
    var mod = await import(SEED_URL);
    var data = mod.QA_SCENARIOS && mod.QA_SCENARIOS['demo-seed'] && mod.QA_SCENARIOS['demo-seed'].data;
    if (!data) throw new Error('try-demo seed missing');
    return JSON.parse(JSON.stringify(data));
  }

  function installStyles() {
    if (document.getElementById('bpg-try-demo-style')) return;
    var style = document.createElement('style');
    style.id = 'bpg-try-demo-style';
    style.textContent = [
      'html.bpg-try-demo-pending body{visibility:hidden}',
      'html.bpg-try-demo{padding-top:42px}',
      'html.bpg-try-demo.bpg-try-demo-tip{padding-top:88px}',
      '#bpg-try-demo-bar{position:fixed;top:0;left:0;right:0;z-index:240;display:flex;align-items:center;gap:10px;min-height:42px;padding:6px 14px;background:#efe7d6;color:#14312e;border-bottom:1px solid #d7cbb3;font-family:"Nunito Sans",sans-serif}',
      '#bpg-try-demo-bar strong{font-size:13px;font-weight:800;letter-spacing:.02em}',
      '#bpg-try-demo-bar .bpg-try-demo-actions{margin-left:auto;display:flex;gap:8px}',
      '#bpg-try-demo-bar button,#bpg-try-demo-tip button,.bpg-try-demo-start,#bpg-try-demo-about button{min-height:32px;padding:0 12px;border:1px solid #08766c;border-radius:999px;background:#fffdf8;color:#075e57;font-size:12px;font-weight:800}',
      '#bpg-try-demo-tip{position:fixed;top:42px;left:0;right:0;z-index:239;margin:0;padding:8px 14px;border-bottom:1px solid #d7cbb3;background:#fffdf8;color:#3d4f4c;font-size:13px;font-weight:700;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:flex-start}',
      '#bpg-try-demo-tip[hidden]{display:none}',
      '#bpg-try-demo-tip p{margin:0;flex:1 1 16rem;min-width:0;line-height:1.35}',
      '#bpg-try-demo-tip button{margin-left:auto;flex:0 0 auto}',
      '.bpg-try-demo-entry{margin:12px 0 4px;display:flex;flex-direction:column;align-items:flex-start;gap:8px}',
      '.bpg-try-demo-start,.bpg-try-demo-entry .bpg-try-demo-start,#bpg-try-demo-about .bpg-try-demo-start{appearance:none;display:inline-flex;align-items:center;justify-content:center;margin:0;min-height:44px;padding:0.55rem 1.15rem;border:1.5px solid #08766c;border-radius:999px;background:#fff;color:#075e57;font-family:"Nunito Sans",sans-serif;font-size:0.95rem;font-weight:800;line-height:1.1;cursor:pointer}',
      '.bpg-try-demo-entry-note{margin:0;max-width:22rem;font-size:12px;font-weight:700;line-height:1.35;color:#5e584f}',
      '#bpg-try-demo-about{margin:0 0 18px;padding:14px;border:1px solid #d7cbb3;border-radius:12px;background:#fffdf8}',
      '#bpg-try-demo-about .bpg-kicker{font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#6d6962;margin-bottom:6px}',
      '#bpg-try-demo-about p{margin:0 0 10px;font-size:13px;font-weight:700;color:#3d4f4c}',
      'html.bpg-try-demo #save-indicator,html.bpg-try-demo #save-indicator.show{opacity:1;transform:none;text-transform:none;letter-spacing:.01em;font-weight:800;color:#3d4f4c;background:#f4efe4;border-color:#d7cbb3}',
      'html.bpg-try-demo #settings-modal .bp-modal-foot,',
      'html.bpg-try-demo #backup-restore-copy,',
      'html.bpg-try-demo #backup-device-summary,',
      'html.bpg-try-demo #backup-empty-hint,',
      'html.bpg-try-demo #import-text,',
      'html.bpg-try-demo #settings-modal details{display:none!important}',
      '#bpg-try-demo-backup-note{margin:0 0 12px;font-size:13px;font-weight:700;color:#3d4f4c}',
      '@media (max-width:520px){html.bpg-try-demo.bpg-try-demo-tip{padding-top:118px}#bpg-try-demo-tip{flex-direction:column;align-items:stretch;padding:8px 12px 10px}#bpg-try-demo-tip p{flex:1 1 auto}#bpg-try-demo-tip button{align-self:flex-end;margin-left:0;min-height:28px;padding:0 10px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function tipDismissed() {
    try { return sessionStorage.getItem(TIP_KEY) === '1'; } catch (error) { return false; }
  }

  function dismissTip() {
    try { sessionStorage.setItem(TIP_KEY, '1'); } catch (error) {}
    var tip = document.getElementById('bpg-try-demo-tip');
    if (tip) tip.hidden = true;
    try { document.documentElement.classList.remove('bpg-try-demo-tip'); } catch (error) {}
  }

  function paintChrome() {
    if (!active()) return;
    installStyles();
    document.documentElement.classList.add('bpg-try-demo');
    var bar = document.getElementById('bpg-try-demo-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'bpg-try-demo-bar';
      bar.setAttribute('role', 'status');
      bar.innerHTML = '<strong>Demo · Sample data</strong><span class="bpg-try-demo-actions"><button type="button" id="bpg-try-demo-exit">Exit</button><button type="button" id="bpg-try-demo-reset">Reset</button></span>';
      document.body.insertBefore(bar, document.body.firstChild);
      bar.querySelector('#bpg-try-demo-exit').addEventListener('click', exit);
      bar.querySelector('#bpg-try-demo-reset').addEventListener('click', function () { reset(); });
    }
    var tip = document.getElementById('bpg-try-demo-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'bpg-try-demo-tip';
      tip.innerHTML = '<p>Try entering a round, correcting a score, and checking the updated records.</p><button type="button">Got it</button>';
      document.body.appendChild(tip);
      tip.querySelector('button').addEventListener('click', dismissTip);
      bar.insertAdjacentElement('afterend', tip);
    }
    tip.hidden = tipDismissed();
    document.documentElement.classList.toggle('bpg-try-demo-tip', !tip.hidden);
  }

  function emptyTable() {
    try {
      var seated = document.querySelectorAll('#slice2-home .s2-seat').length;
      var nights = document.querySelectorAll('#slice2-home .s2-night').length;
      var copy = document.getElementById('slice2-empty-table');
      return seated === 0 && nights === 0 && !!copy;
    } catch (error) {
      return false;
    }
  }

  function paintEntry() {
    document.querySelectorAll('.bpg-try-demo-entry').forEach(function (node) { node.remove(); });
    if (active() || !emptyTable()) return;
    var empty = document.getElementById('slice2-empty-table');
    var host = empty || document.querySelector('#slice2-home .s2-home-table') || document.getElementById('slice2-home');
    if (!host) return;
    var wrap = document.createElement('div');
    wrap.className = 'bpg-try-demo-entry';
    wrap.innerHTML = '<button type="button" class="s2-btn bpg-try-demo-start">Try a demo</button><p class="bpg-try-demo-entry-note">See a sample game night. Your data stays separate.</p>';
    wrap.querySelector('.bpg-try-demo-start').addEventListener('click', enter);
    if (empty) empty.insertAdjacentElement('afterend', wrap);
    else host.appendChild(wrap);
  }

  function paintSaveLabel() {
    var el = document.getElementById('save-indicator');
    if (!el) return;
    if (!active()) {
      if (el.dataset.bpgDemoSave === '1') {
        el.textContent = '✓ Saved on this device';
        el.classList.remove('bpg-try-demo-save', 'show');
        delete el.dataset.bpgDemoSave;
      }
      return;
    }
    el.dataset.bpgDemoSave = '1';
    el.classList.add('bpg-try-demo-save');
    el.classList.remove('show');
    el.hidden = false;
    el.textContent = 'Sample data · separate from your games';
  }

  function paintSettings() {
    var body = document.querySelector('#settings-modal .bp-modal-body');
    if (!body) return;
    var about = document.getElementById('bpg-try-demo-about');
    if (!about) {
      about = document.createElement('div');
      about.id = 'bpg-try-demo-about';
      body.insertBefore(about, body.firstChild);
    }
    about.innerHTML = active()
      ? '<div class="bpg-kicker">About</div><p>This is a sample porch. Exit restores your real games on this device.</p>'
      : '<div class="bpg-kicker">About</div><p>Back Porch keeps score for porch game night. Try a sample table without touching the games on this device.</p><button type="button" class="s2-btn bpg-try-demo-start">Try a demo</button>';
    var start = about.querySelector('.bpg-try-demo-start');
    if (start) start.addEventListener('click', enter);
    var note = document.getElementById('bpg-try-demo-backup-note');
    if (active()) {
      if (!note) {
        note = document.createElement('p');
        note.id = 'bpg-try-demo-backup-note';
        var device = document.getElementById('backup-device-summary');
        (device && device.parentNode ? device.parentNode : body).insertBefore(note, device || null);
      }
      note.textContent = 'Backup, restore, and sync are off in this demo.';
    } else if (note) {
      note.remove();
    }
  }

  function hookRefresh() {
    if (!root.BPGSlice2 || typeof root.BPGSlice2.refresh !== 'function' || root.BPGSlice2.__bpgTryDemoHook) return;
    var orig = root.BPGSlice2.refresh;
    root.BPGSlice2.refresh = function () {
      var result = orig.apply(this, arguments);
      paintEntry();
      paintSaveLabel();
      return result;
    };
    root.BPGSlice2.__bpgTryDemoHook = true;
  }

  function hookSavePark() {
    if (!root.BPGSlice2 || typeof root.BPGSlice2.parkSaveIndicator !== 'function' || root.BPGSlice2.__bpgTryDemoSave) return;
    var orig = root.BPGSlice2.parkSaveIndicator;
    root.BPGSlice2.parkSaveIndicator = function () {
      var result = orig.apply(this, arguments);
      paintSaveLabel();
      return result;
    };
    root.BPGSlice2.__bpgTryDemoSave = true;
  }

  function afterSlice2Paint() {
    hookRefresh();
    hookSavePark();
    paintEntry();
    paintSaveLabel();
  }

  if (document.readyState === 'complete') setTimeout(afterSlice2Paint, 0);
  else window.addEventListener('load', function () { setTimeout(afterSlice2Paint, 0); });

  async function applySeed(force) {
    if (!active()) return null;
    if (!force && hasDemoBook()) return null;
    if (force) clearDemoStore();
    var book = await loadSeed();
    if (typeof hooks.applyBook === 'function') hooks.applyBook(book);
    return book;
  }

  async function boot(nextHooks) {
    hooks = nextHooks || {};
    hookRefresh();
    hookSavePark();
    if (!active()) {
      paintEntry();
      return {status: 'off'};
    }
    document.documentElement.classList.add('bpg-try-demo', 'bpg-try-demo-pending');
    blockFetch();
    installStyles();
    try {
      await applySeed(false);
    } finally {
      document.documentElement.classList.remove('bpg-try-demo-pending');
    }
    paintChrome();
    paintEntry();
    paintSaveLabel();
    paintSettings();
    if (document.body) document.body.dataset.bpgTryDemo = 'on';
    return {status: 'on'};
  }

  function enter() {
    setSession(true);
    var url = new URL(location.href);
    url.searchParams.set('demo', 'try');
    location.assign(url.pathname + url.search + url.hash);
  }

  function exit() {
    setSession(false);
    try { sessionStorage.removeItem(TIP_KEY); } catch (error) {}
    var url = new URL(location.href);
    if (url.searchParams.get('demo') === 'try') url.searchParams.delete('demo');
    location.assign(url.pathname + url.search + url.hash);
  }

  async function reset() {
    if (!active()) return;
    if (!root.confirm('Reset demo data? This restores the sample porch and leaves your real games alone.')) return;
    await applySeed(true);
    if (typeof hooks.showHome === 'function') hooks.showHome();
    paintChrome();
    paintEntry();
    paintSaveLabel();
  }

  function backupBlocked() {
    return active();
  }

  root.BPGTryDemo = {
    PREFIX: PREFIX,
    SESSION_KEY: SESSION_KEY,
    active: active,
    storageKey: storageKey,
    wantsTry: wantsTry,
    hasDemoBook: hasDemoBook,
    boot: boot,
    enter: enter,
    exit: exit,
    reset: reset,
    paintSettings: paintSettings,
    paintEntry: paintEntry,
    paintSaveLabel: paintSaveLabel,
    backupBlocked: backupBlocked,
    loadSeed: loadSeed
  };
})(window);
