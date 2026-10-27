import {fitReviewFrame, formatReviewTime} from './review-lib.mjs';

const grid = document.getElementById('review-grid');
const screenFilter = document.getElementById('filter-screen');
const filters = document.getElementById('review-filters');
const meta = document.getElementById('review-meta');
const lightbox = document.getElementById('review-lightbox');
const lightboxLabel = document.getElementById('lightbox-label');
const lightboxLive = document.getElementById('lightbox-live');
const lightboxStage = document.getElementById('lightbox-stage');
const lightboxClose = document.getElementById('lightbox-close');

let catalog = null;
let tiles = [];

function liveUrl(screen, sizeId) {
  const path = catalog.demoReady ? screen.livePath : screen.fallbackPath;
  const url = new URL(path, location.origin);
  if (catalog.demoReady && sizeId && !url.searchParams.has('size')) {
    url.searchParams.set('size', sizeId);
  }
  return url.pathname + url.search;
}

function shortCommit(value) {
  return String(value || 'local').slice(0, 12);
}

function currentSizeFilter() {
  return filters.querySelector('input[name="size"]:checked')?.value || '';
}

function clipMaxHeight() {
  return window.matchMedia('(min-width: 768px)').matches ? 340 : 280;
}

function applyFrameFit(article, clip, tile, scaler, frame) {
  const fit = fitReviewFrame(tile.size, {
    availableWidth: article.clientWidth || tile.size.width,
    maxHeight: clipMaxHeight()
  });
  clip.style.width = `${fit.clipWidth}px`;
  clip.style.height = `${fit.clipHeight}px`;
  if (scaler) {
    scaler.style.width = `${fit.frameWidth}px`;
    scaler.style.height = `${fit.frameHeight}px`;
    scaler.style.transform = `scale(${fit.scale})`;
  }
  if (frame) {
    frame.width = String(fit.frameWidth);
    frame.height = String(fit.frameHeight);
    frame.style.width = `${fit.frameWidth}px`;
    frame.style.height = `${fit.frameHeight}px`;
    frame.style.maxWidth = 'none';
    frame.style.maxHeight = 'none';
  }
  return fit;
}

function mountPreview(article, clip, tile) {
  if (clip.dataset.mounted === '1') return;
  clip.dataset.mounted = '1';
  const shot = `./shots/${tile.screen.id}--${tile.size.id}.png`;
  const img = document.createElement('img');
  img.alt = `${tile.screen.label} ${tile.size.label}`;
  img.decoding = 'async';
  img.addEventListener('error', () => {
    img.remove();
    const scaler = document.createElement('div');
    scaler.className = 'review-frame-scaler';
    const frame = document.createElement('iframe');
    frame.title = img.alt;
    frame.setAttribute('loading', 'lazy');
    applyFrameFit(article, clip, tile, scaler, frame);
    new ResizeObserver(() => applyFrameFit(article, clip, tile, scaler, frame)).observe(article);
    scaler.appendChild(frame);
    clip.appendChild(scaler);
    frame.src = liveUrl(tile.screen, tile.size.id);
  }, {once: true});
  img.src = shot;
  clip.appendChild(img);
}

function renderTiles() {
  const screenId = screenFilter.value;
  const sizeId = currentSizeFilter();
  const visible = tiles.filter((tile) => (!screenId || tile.screen.id === screenId) && (!sizeId || tile.size.id === sizeId));
  grid.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'review-empty';
    empty.textContent = 'No tiles match those filters.';
    grid.appendChild(empty);
    return;
  }
  visible.forEach((tile) => {
    const article = document.createElement('article');
    article.className = 'review-tile';
    article.dataset.screen = tile.screen.id;
    article.dataset.size = tile.size.id;
    const host = document.createElement('div');
    host.className = 'review-frame-host';
    const clip = document.createElement('div');
    clip.className = 'review-frame-clip';
    clip.dataset.size = tile.size.id;
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'review-open-full';
    open.setAttribute('aria-label', `Open ${tile.screen.label} at ${tile.size.label}`);
    open.addEventListener('click', () => openLightbox(tile));
    const caption = document.createElement('div');
    caption.className = 'review-caption';
    const live = document.createElement('a');
    live.href = liveUrl(tile.screen, tile.size.id);
    live.target = '_blank';
    live.rel = 'noopener';
    live.textContent = `Open live · ${tile.size.label} ${tile.size.width}×${tile.size.height}`;
    caption.innerHTML = `<strong>${tile.screen.label}</strong><span>${tile.size.label} ${tile.size.width}×${tile.size.height} · ${formatReviewTime(catalog.generatedAt)} · ${shortCommit(catalog.commit)}</span>`;
    caption.appendChild(live);
    clip.appendChild(open);
    host.appendChild(clip);
    article.appendChild(host);
    article.appendChild(caption);
    grid.appendChild(article);
    applyFrameFit(article, clip, tile);
    const watcher = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        mountPreview(article, clip, tile);
        watcher.disconnect();
      }
    }, {rootMargin: '120px'});
    watcher.observe(article);
  });
}

function openLightbox(tile) {
  lightboxLabel.textContent = `${tile.screen.label} · ${tile.size.label} ${tile.size.width}×${tile.size.height}`;
  lightboxLive.href = liveUrl(tile.screen, tile.size.id);
  lightboxStage.replaceChildren();
  const frame = document.createElement('iframe');
  frame.title = lightboxLabel.textContent;
  frame.src = liveUrl(tile.screen, tile.size.id);
  frame.width = String(tile.size.width);
  frame.height = String(tile.size.height);
  frame.style.width = `${tile.size.width}px`;
  frame.style.height = `${tile.size.height}px`;
  frame.style.maxWidth = 'none';
  lightboxStage.appendChild(frame);
  if (typeof lightbox.showModal === 'function') lightbox.showModal();
}

function closeLightbox() {
  lightboxStage.replaceChildren();
  if (lightbox.open) lightbox.close();
}

async function boot() {
  const response = await fetch('./catalog.json', {cache: 'no-store'});
  if (!response.ok) throw new Error('Review catalog is missing. This page is preview-only.');
  catalog = await response.json();
  meta.textContent = `${catalog.tileCount} tiles · ${formatReviewTime(catalog.generatedAt)} · ${shortCommit(catalog.commit)}${catalog.demoReady ? ' · demo views' : ' · gnqa fixtures'}`;
  catalog.screens.forEach((screen) => {
    const option = document.createElement('option');
    option.value = screen.id;
    option.textContent = screen.label;
    screenFilter.appendChild(option);
  });
  tiles = catalog.screens.flatMap((screen) => catalog.sizes.map((size) => ({screen, size})));
  filters.addEventListener('change', renderTiles);
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });
  renderTiles();
}

boot().catch((error) => {
  meta.textContent = error.message;
});
