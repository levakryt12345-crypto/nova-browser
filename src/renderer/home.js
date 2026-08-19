'use strict';

const api = window.nova;
const $ = (sel) => document.querySelector(sel);

const QUICK = [
  { name: 'Google', url: 'https://www.google.com', d: 'google.com' },
  { name: 'YouTube', url: 'https://www.youtube.com', d: 'youtube.com' },
  { name: 'Википедия', url: 'https://ru.wikipedia.org', d: 'wikipedia.org' },
  { name: 'GitHub', url: 'https://github.com', d: 'github.com' },
  { name: 'Яндекс', url: 'https://ya.ru', d: 'ya.ru' },
  { name: 'Telegram', url: 'https://web.telegram.org', d: 'web.telegram.org' },
];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function go(url) {
  api.invoke('tab:go', url);
}

function favicon(d) {
  return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(d) + '&sz=64';
}

function renderLinks() {
  const box = $('#home-links');
  box.innerHTML = '';
  for (const q of QUICK) {
    const a = document.createElement('button');
    a.className = 'home-link';
    a.title = q.d;
    a.innerHTML = `<img src="${favicon(q.d)}" alt="" loading="lazy"><span>${esc(q.name)}</span>`;
    a.addEventListener('click', () => go(q.url));
    box.appendChild(a);
  }
}

function renderBookmarks(list) {
  const box = $('#home-bm-grid');
  const wrap = $('#home-bookmarks');
  box.innerHTML = '';
  const shown = (list || []).slice(0, 12);
  if (!shown.length) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  for (const b of shown) {
    let d = '';
    try {
      d = new URL(b.url).hostname;
    } catch {}
    const a = document.createElement('button');
    a.className = 'home-bm';
    a.title = b.title || b.url;
    a.innerHTML = `<img src="${favicon(d)}" alt="" loading="lazy"><span>${esc(b.title || b.url)}</span>`;
    a.addEventListener('click', () => go(b.url));
    box.appendChild(a);
  }
}

async function init() {
  const s = await api.invoke('state:get');
  document.documentElement.dataset.theme = s.theme || 'dark';

  let name = (s.username || '').trim();
  if (/^[\w.]+$/i.test(name)) {
    const pretty = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    $('#home-greet').textContent = greeting() + ', ' + pretty + '!';
  } else {
    $('#home-greet').textContent = greeting() + '!';
  }

  const searchUrl = s.searchUrl || 'https://www.google.com/search?q={q}';
  $('#home-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#home-q').value.trim();
    if (!q) return;
    go(searchUrl.replace('{q}', encodeURIComponent(q)));
  });
  $('#home-q').focus();

  renderLinks();
  renderBookmarks(s.bookmarks);

  api.on('data:changed', (m) => {
    if (m && m.bookmarks) renderBookmarks(m.bookmarks);
  });
  api.on('theme:changed', (m) => {
    document.documentElement.dataset.theme = m;
  });
}

init();