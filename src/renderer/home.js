'use strict';

const api = window.nova;
const $ = (sel) => document.querySelector(sel);

const QUICK = [
  { url: 'https://www.google.com', d: 'google.com' },
  { url: 'https://www.youtube.com', d: 'youtube.com' },
  { url: 'https://ru.wikipedia.org', d: 'wikipedia.org' },
  { url: 'https://github.com', d: 'github.com' },
  { url: 'https://ya.ru', d: 'ya.ru' },
  { url: 'https://web.telegram.org', d: 'web.telegram.org' },
];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function go(url) {
  api.invoke('tab:go', url);
}

function favicon(d) {
  return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(d) + '&sz=64';
}

function applyAppearance(a) {
  const root = document.documentElement;
  root.dataset.theme = a.theme || 'dark';
  root.dataset.accent = a.accent || 'violet';
  root.dataset.scale = a.uiScale || 'medium';
  root.dataset.wallpaper = a.homeWallpaper || 'aurora';
}

function renderLinks(show) {
  const box = $('#home-links');
  box.innerHTML = '';
  if (!show) return;
  for (const q of QUICK) {
    const a = document.createElement('button');
    a.className = 'home-link';
    a.title = q.d;
    a.innerHTML = `<img src="${favicon(q.d)}" alt="" loading="lazy">`;
    a.addEventListener('click', () => go(q.url));
    box.appendChild(a);
  }
}

function renderBookmarks(list, show) {
  const box = $('#home-bm-grid');
  box.innerHTML = '';
  if (!show) return;
  for (const b of (list || []).slice(0, 12)) {
    let d = '';
    try {
      d = new URL(b.url).hostname;
    } catch {}
    const a = document.createElement('button');
    a.className = 'home-bm';
    a.title = b.title || b.url;
    a.innerHTML = `<img src="${favicon(d)}" alt="" loading="lazy">`;
    a.addEventListener('click', () => go(b.url));
    box.appendChild(a);
  }
}

async function init() {
  const s = await api.invoke('state:get');
  applyAppearance(s.appearance);

  const searchUrl = s.searchUrl || 'https://www.google.com/search?q={q}';
  $('#home-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#home-q').value.trim();
    if (!q) return;
    go(searchUrl.replace('{q}', encodeURIComponent(q)));
  });
  $('#home-q').focus();

  renderLinks(s.settings.showHomeLinks !== false);
  renderBookmarks(s.bookmarks, s.settings.showHomeBookmarks !== false);

  api.on('data:changed', (m) => {
    if (!m) return;
    if (m.settings && typeof m.settings.showHomeLinks === 'boolean') {
      renderLinks(m.settings.showHomeLinks);
    }
    if (m.bookmarks) {
      renderBookmarks(m.bookmarks, (m.settings && m.settings.showHomeBookmarks) !== false);
    }
  });
  api.on('theme:changed', (m) => applyAppearance(m));
}

init();