'use strict';

const ICONS = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  fwd: '<path d="M9 18l6-6-6-6"/>',
  reload: '<path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/>',
  stop: '<path d="M6 6l12 12M18 6L6 18"/>',
  home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.6 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3z"/>',
  cam: '<path d="M15 10l5-3v10l-5-3"/><rect x="3" y="6" width="12" height="12" rx="2"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  bookmark: '<path d="M6 4h12v17l-6-4-6 4z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 3v12m0 0l-5-5m5 5l5-5"/><path d="M4 21h16"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5h.1a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  min: '<path d="M5 12h14"/>',
  max: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  restore: '<rect x="4" y="9" width="11" height="11" rx="2"/><path d="M9 4h9a2 2 0 0 1 2 2v9"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
  pause: '<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  open: '<path d="M14 4h6v6M20 4L11 13"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
};

function icon(name, opts = {}) {
  const { cls = '', fill = false, size = 18 } = opts;
  const base = fill
    ? 'fill="currentColor" stroke="none"'
    : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg class="ic ${cls}" style="width:${size}px;height:${size}px" viewBox="0 0 24 24" ${base}>${ICONS[name]}</svg>`;
}

const $ = (sel) => document.querySelector(sel);

const IS_POPOVER = new URLSearchParams(location.search).has('popover');
const POPOVER_TYPE = new URLSearchParams(location.search).get('popover') || '';

const store = {
  tabs: [],
  activeId: null,
  bookmarks: [],
  history: [],
  downloads: [],
  settings: {},
  theme: 'dark',
  engines: {},
  version: '',
  userData: '',
  maximized: false,
};

const api = window.nova;

function formatBytes(n) {
  if (!n) return '0 Б';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return (i === 0 ? v : v.toFixed(1)) + ' ' + units[i];
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hm = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return hm;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + ' ' + hm;
}

function applyTheme(mode) {
  store.theme = mode;
  document.documentElement.dataset.theme = mode;
}

function applyAppearance(a) {
  if (!a) return;
  const root = document.documentElement;
  root.dataset.theme = a.theme || store.theme || 'dark';
  root.dataset.accent = a.accent || 'violet';
  root.dataset.scale = a.uiScale || 'medium';
  document.body.classList.toggle('compact', !!a.compactChrome);
  document.body.classList.toggle('close-always', !!a.showTabCloseAlways);
}

function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), 1800);
}

function currentTab() {
  return store.tabs.find((t) => t.id === store.activeId) || null;
}

function setIcon(sel, name, opts) {
  const el = $(sel);
  if (el) el.innerHTML = icon(name, opts);
}

function initMain() {
  setIcon('#new-tab', 'plus');
  setIcon('#nav-back', 'back');
  setIcon('#nav-fwd', 'fwd');
  setIcon('#nav-reload', 'reload');
  setIcon('#nav-home', 'home');
  setIcon('#star-btn', 'star');
  setIcon('#btn-bookmarks', 'bookmark');
  setIcon('#btn-history', 'clock');
  setIcon('#btn-downloads', 'download');
  setIcon('#btn-settings', 'gear');
  setIcon('#win-min', 'min');
  setIcon('#win-max', 'max');
  setIcon('#win-close', 'close');

  $('#new-tab').addEventListener('click', () => api.invoke('tab:create'));
  $('#nav-back').addEventListener('click', () => api.invoke('nav:do', 'back'));
  $('#nav-fwd').addEventListener('click', () => api.invoke('nav:do', 'forward'));
  $('#nav-reload').addEventListener('click', () => {
    const t = currentTab();
    api.invoke('nav:do', t && t.loading ? 'stop' : 'reload');
  });
  $('#nav-home').addEventListener('click', () => api.invoke('nav:do', 'home'));

  const addr = $('#addr');
  addr.addEventListener('focus', () => addr.select());
  addr.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = addr.value.trim();
      if (v) api.invoke('tab:go', v);
      addr.blur();
    }
    if (e.key === 'Escape') addr.blur();
  });

  $('#star-btn').addEventListener('click', async () => {
    const t = currentTab();
    if (!t || !t.url) return;
    const existing = store.bookmarks.find((b) => b.url === t.url);
    if (existing) {
      await api.invoke('bookmark:remove', existing.id);
      toast('Удалено из закладок');
    } else {
      await api.invoke('bookmark:add', { url: t.url, title: t.title });
      toast('Добавлено в закладки');
    }
  });

  $('#win-min').addEventListener('click', () => api.invoke('win:minimize'));
  $('#win-max').addEventListener('click', () => api.invoke('win:toggle-max'));
  $('#win-close').addEventListener('click', () => api.invoke('win:close'));

  $('#tabs').addEventListener('click', (e) => {
    const tabEl = e.target.closest('.tab');
    if (!tabEl) return;
    const id = Number(tabEl.dataset.id);
    if (e.target.closest('.tab-close')) api.invoke('tab:close', id);
    else api.invoke('tab:activate', id);
  });
  $('#tabs').addEventListener('auxclick', (e) => {
    if (e.button !== 1) return;
    const tabEl = e.target.closest('.tab');
    if (tabEl) api.invoke('tab:close', Number(tabEl.dataset.id));
  });

  const popoverAnchors = {
    bookmarks: '#btn-bookmarks',
    history: '#btn-history',
    downloads: '#btn-downloads',
    profile: '#btn-profile',
  };
  for (const [type, sel] of Object.entries(popoverAnchors)) {
    $(sel).addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      api.invoke('popover:show', { type, anchor: { x: r.left, y: r.bottom } });
    });
  }

  $('#btn-settings').addEventListener('click', () => {
    api.invoke('tab:go', 'nova://settings');
  });

  api.on('tabs:changed', (d) => {
    store.tabs = d.tabs || [];
    store.activeId = d.activeId;
    renderTabs();
    renderNavState();
    updateAddressBar();
    updateStar();
  });

  api.on('data:changed', (d) => {
    if (d.bookmarks) store.bookmarks = d.bookmarks;
    if (d.history) store.history = d.history;
    if (d.settings) store.settings = d.settings;
    updateStar();
    updateAddrPlaceholder();
  });

  api.on('downloads:changed', (d) => {
    store.downloads = d || [];
    updateDlBadge();
  });

  api.on('theme:changed', (m) => applyTheme(m));
  api.on('win:maximized', (b) => {
    store.maximized = b;
    setIcon('#win-max', b ? 'restore' : 'max');
  });
  api.on('flash:message', (msg) => toast(msg));

  api.on('cmd:focus-address', () => {
    addr.focus();
    addr.select();
  });

  api.on('permission:request', (d) => showPermissionDialog(d));

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && !e.altKey && !e.metaKey && e.key >= '1' && e.key <= '9') {
      const idx = Number(e.key) - 1;
      const t = store.tabs[idx];
      if (t) api.invoke('tab:activate', t.id);
    }
  });

  loadInitial();
}

function loadInitial() {
  api.invoke('state:get').then((s) => {
    store.tabs = s.tabs || [];
    store.activeId = s.activeId;
    store.bookmarks = s.bookmarks || [];
    store.history = s.history || [];
    store.downloads = s.downloads || [];
    store.settings = s.settings || {};
    store.engines = s.searchEngines || {};
    store.version = s.version || '';
    store.userData = s.userData || '';
    applyTheme(s.theme || 'dark');
    applyAppearance(s.appearance);
    renderTabs();
    renderNavState();
    updateAddressBar();
    updateStar();
    updateAddrPlaceholder();
    updateDlBadge();
  });
}

function renderTabs() {
  const wrap = $('#tabs');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (const t of store.tabs) {
    const el = document.createElement('div');
    el.className = 'tab' + (t.id === store.activeId ? ' active' : '') + (t.loading ? ' loading' : '');
    el.dataset.id = String(t.id);
    el.title = t.title + (t.url ? '\n' + t.url : '');
    const fav = t.favicon
      ? `<img src="${t.favicon}" alt="">`
      : icon('globe');
    el.innerHTML = `
      <div class="tab-favicon">${fav}</div>
      <div class="tab-title">${escapeHtml(t.title || 'Новая вкладка')}</div>
      <button class="tab-close" title="Закрыть вкладку">${icon('close')}</button>`;
    wrap.appendChild(el);
  }
  document.body.classList.toggle('busy', store.tabs.some((t) => t.loading));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderNavState() {
  const t = currentTab();
  $('#nav-back').disabled = !(t && t.canBack);
  $('#nav-fwd').disabled = !(t && t.canForward);
  if (t && t.loading) {
    setIcon('#nav-reload', 'stop');
    $('#nav-reload').title = 'Остановить (Esc)';
  } else {
    setIcon('#nav-reload', 'reload');
    $('#nav-reload').title = 'Перезагрузить (Ctrl+R)';
  }
}

function updateAddressBar() {
  const t = currentTab();
  const addr = $('#addr');
  if (!t) {
    addr.value = '';
    setIcon('#addr-icon', 'search');
    return;
  }
  if (document.activeElement !== addr) {
    addr.value = t.url && !/^about:blank$/.test(t.url) ? t.url : '';
    if (!addr.value) addr.placeholder = updateAddrPlaceholder();
  }
  setIcon('#addr-icon', t.url && t.url.startsWith('https://') ? 'lock' : 'globe');
}

function updateAddrPlaceholder() {
  const el = $('#addr');
  const engine = store.engines[store.settings.searchEngine];
  const ph = engine ? `Поиск в ${engine.name} или введите адрес` : 'Поиск или адрес';
  if (el) el.placeholder = ph;
  return ph;
}

function updateStar() {
  const t = currentTab();
  const star = $('#star-btn');
  if (!star) return;
  const isBookmarked = t && t.url && store.bookmarks.some((b) => b.url === t.url);
  star.classList.toggle('filled', !!isBookmarked);
  star.title = isBookmarked ? 'Удалить из закладок (Ctrl+D)' : 'Добавить в закладки (Ctrl+D)';
  setIcon('#star-btn', 'star', { fill: isBookmarked });
}

function updateDlBadge() {
  const badge = $('#dl-badge');
  if (!badge) return;
  const active = store.downloads.filter((d) => d.status === 'in-progress').length;
  if (active > 0) {
    badge.textContent = String(active);
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

function showPermissionDialog(d) {
  const modal = $('#perm-modal');
  if (!modal) return;
  $('#perm-icon').innerHTML = icon(d.kind === 'media' ? 'cam' : 'shield', { size: 30 });
  $('#perm-title').textContent = d.domain;
  const what = d.kind === 'media' ? 'камере и микрофону' : 'разрешению «' + d.kind + '»';
  $('#perm-sub').textContent = 'Сайт запрашивает доступ к ' + what + '.';
  $('#perm-remember').checked = false;
  modal.hidden = false;
  const finish = (allow) => {
    modal.hidden = true;
    api.invoke('permission:respond', { requestId: d.requestId, allow, remember: $('#perm-remember').checked });
  };
  $('#perm-allow').onclick = () => finish(true);
  $('#perm-deny').onclick = () => finish(false);
}

function initPopover() {
  document.body.classList.add('is-popover');
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') api.invoke('popover:hide');
  });
  const panels = {
    bookmarks: renderBookmarksPanel,
    history: renderHistoryPanel,
    downloads: renderDownloadsPanel,
    settings: renderSettingsPanel,
    profile: renderProfilePanel,
  };
  const app = $('#app');
  app.innerHTML = '';
  api.invoke('state:get').then((s) => {
    store.bookmarks = s.bookmarks || [];
    store.history = s.history || [];
    store.downloads = s.downloads || [];
    store.settings = s.settings || {};
    store.engines = s.searchEngines || {};
    store.version = s.version || '';
    store.userData = s.userData || '';
    applyTheme(s.theme || 'dark');
    applyAppearance(s.appearance);
    const fn = panels[POPOVER_TYPE] || renderHistoryPanel;
    app.appendChild(fn());
api.on('theme:changed', (m) => applyAppearance(m));
    if (POPOVER_TYPE === 'downloads') {
      api.on('downloads:changed', (d) => {
        store.downloads = d || [];
        const app = $('#app');
        app.innerHTML = '';
        app.appendChild(panels.downloads());
      });
    }
  });
}

function renderBookmarksPanel() {
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="panel-header">
      <h2>${icon('bookmark')} Закладки</h2>
      <div class="grow"></div>
      <button class="btn small primary" id="bm-add">${icon('plus', { size: 13 })} Текущую страницу</button>
    </div>
    <div class="panel-list" id="bm-list"></div>
    <div class="panel-footer">
      <button class="btn small" id="bm-open-all" title="Открыть все закладки во вкладках">${icon('open', { size: 13 })} Открыть все</button>
    </div>`;
  const list = panel.querySelector('#bm-list');
  const fill = () => {
    if (!store.bookmarks.length) {
      list.innerHTML = `<div class="empty">${icon('bookmark')}<p>Закладок пока нет.<br>Нажмите звезду в адресной строке, чтобы добавить страницу.</p></div>`;
      return;
    }
    list.innerHTML = '';
    for (const b of store.bookmarks) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div class="row-icon">${icon('globe')}</div>
        <div class="row-main">
          <div class="row-title">${escapeHtml(b.title)}</div>
          <div class="row-sub">${escapeHtml(b.url)}</div>
        </div>
        <div class="row-time">${formatTime(b.time)}</div>
        <button class="row-del" title="Удалить">${icon('x')}</button>`;
      row.addEventListener('click', () => {
        api.invoke('tab:go', b.url);
        api.invoke('popover:hide');
      });
      row.querySelector('.row-del').addEventListener('click', (e) => {
        e.stopPropagation();
        api.invoke('bookmark:remove', b.id);
        fill();
      });
      list.appendChild(row);
    }
  };
  panel.querySelector('#bm-add').addEventListener('click', async () => {
    const s = await api.invoke('state:get');
    const t = s.tabs.find((x) => x.id === s.activeId);
    if (t && t.url) {
      await api.invoke('bookmark:add', { url: t.url, title: t.title });
      fill();
    }
  });
  panel.querySelector('#bm-open-all').addEventListener('click', async () => {
    for (const b of store.bookmarks) await api.invoke('tab:create', b.url);
    api.invoke('popover:hide');
  });
  fill();
  return panel;
}

function renderHistoryPanel() {
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="panel-header">
      <h2>${icon('clock')} История</h2>
      <div class="grow"></div>
      <input class="panel-input" id="hist-search" placeholder="Поиск по истории..." style="max-width:170px">
    </div>
    <div class="panel-list" id="hist-list"></div>
    <div class="panel-footer">
      <button class="btn small danger" id="hist-clear">${icon('trash', { size: 13 })} Очистить историю</button>
    </div>`;
  const list = panel.querySelector('#hist-list');
  const input = panel.querySelector('#hist-search');
  let all = store.history;
  const fill = () => {
    const q = input.value.trim().toLowerCase();
    const items = q ? all.filter((h) => (h.title + ' ' + h.url).toLowerCase().includes(q)) : all;
    if (!items.length) {
      list.innerHTML = `<div class="empty">${icon('clock')}<p>${q ? 'Ничего не найдено.' : 'История пуста.'}</p></div>`;
      return;
    }
    list.innerHTML = '';
    for (const h of items.slice(0, 300)) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div class="row-icon">${icon('globe')}</div>
        <div class="row-main">
          <div class="row-title">${escapeHtml(h.title)}</div>
          <div class="row-sub">${escapeHtml(h.url)}</div>
        </div>
        <div class="row-time">${formatTime(h.time)}</div>
        <button class="row-del" title="Удалить">${icon('x')}</button>`;
      row.addEventListener('click', () => {
        api.invoke('tab:go', h.url);
        api.invoke('popover:hide');
      });
      row.querySelector('.row-del').addEventListener('click', (e) => {
        e.stopPropagation();
        api.invoke('history:remove', h.id);
        all = all.filter((x) => x.id !== h.id);
        fill();
      });
      list.appendChild(row);
    }
  };
  input.addEventListener('input', fill);
  panel.querySelector('#hist-clear').addEventListener('click', async () => {
    await api.invoke('history:clear');
    all = [];
    fill();
  });
  fill();
  return panel;
}

function renderDownloadsPanel() {
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="panel-header">
      <h2>${icon('download')} Загрузки</h2>
      <div class="grow"></div>
      <button class="btn small" id="dl-clear">${icon('trash', { size: 13 })} Очистить</button>
    </div>
    <div class="panel-list" id="dl-list"></div>`;
  const list = panel.querySelector('#dl-list');
  const fill = () => {
    const items = store.downloads;
    if (!items.length) {
      list.innerHTML = `<div class="empty">${icon('download')}<p>Загрузок пока нет.</p></div>`;
      return;
    }
    list.innerHTML = '';
    for (const d of items) {
      const row = document.createElement('div');
      row.className = 'row dl-row';
      const pct = d.totalBytes ? Math.min(100, Math.round((d.receivedBytes / d.totalBytes) * 100)) : d.status === 'completed' ? 100 : 0;
      const stateLabel =
        d.status === 'completed' ? '<span class="dl-state ok">Готово</span>' : d.status === 'failed' || d.status === 'interrupted' ? '<span class="dl-state err">Ошибка</span>' : '<span class="dl-state run">Загружается</span>';
      const sub =
        d.status === 'completed'
          ? `${formatBytes(d.totalBytes || d.receivedBytes)} · ${d.filePath}`
          : `${formatBytes(d.receivedBytes)}${d.totalBytes ? ' из ' + formatBytes(d.totalBytes) : ''}`;
      row.innerHTML = `
        <div class="row-icon">${icon('download')}</div>
        <div class="row-main">
          <div class="row-title"><span class="dl-name">${escapeHtml(d.filename)}</span> ${stateLabel}</div>
          <div class="row-sub">${escapeHtml(sub)}</div>
          ${d.status === 'in-progress' ? `<div class="progress"><div style="width:${pct}%"></div></div>` : ''}
        </div>`;
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:2px;flex-shrink:0';
      if (d.status === 'in-progress') {
        actions.innerHTML = `
          <button class="icon-btn" style="width:26px;height:26px" title="Пауза">${icon('pause', { size: 14 })}</button>
          <button class="icon-btn" style="width:26px;height:26px" title="Отменить">${icon('x', { size: 14 })}</button>`;
        actions.children[0].addEventListener('click', (e) => {
          e.stopPropagation();
          api.invoke('downloads:action', { id: d.id, action: 'pause' });
        });
        actions.children[1].addEventListener('click', (e) => {
          e.stopPropagation();
          api.invoke('downloads:action', { id: d.id, action: 'cancel' });
        });
      } else {
        actions.innerHTML = `
          <button class="icon-btn" style="width:26px;height:26px" title="Показать в папке">${icon('folder', { size: 14 })}</button>
          <button class="icon-btn" style="width:26px;height:26px" title="Удалить из списка">${icon('trash', { size: 14 })}</button>`;
        actions.children[0].addEventListener('click', (e) => {
          e.stopPropagation();
          api.invoke('downloads:action', { id: d.id, action: 'reveal' });
        });
        actions.children[1].addEventListener('click', (e) => {
          e.stopPropagation();
          api.invoke('downloads:clear');
        });
      }
      row.appendChild(actions);
      list.appendChild(row);
    }
  };
  panel.querySelector('#dl-clear').addEventListener('click', () => api.invoke('downloads:clear'));
  fill();
  return panel;
}

function renderProfilePanel() {
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="panel-header">
      <h2>Профиль</h2>
      <div class="grow"></div>
    </div>
    <div class="profile-scroll">
      <div class="profile-hero">
        <img class="profile-avatar" src="avatar.png" alt="Аватар">
        <div class="profile-name">Nova</div>
        <div class="profile-sub">Профиль браузера · данные хранятся локально</div>
      </div>
      <div class="form-row">
        <label>Тема</label>
        <div class="seg" id="pro-theme">
          <button data-v="system" class="${store.settings.theme === 'system' ? 'on' : ''}">Системная</button>
          <button data-v="light" class="${store.settings.theme === 'light' ? 'on' : ''}">Светлая</button>
          <button data-v="dark" class="${store.settings.theme === 'dark' ? 'on' : ''}">Тёмная</button>
        </div>
      </div>
      <div class="form-row">
        <button class="btn small" id="pro-dl-folder">${icon('folder', { size: 13 })} Папка загрузок</button>
        <button class="btn small" id="pro-data-folder">${icon('open', { size: 13 })} Данные браузера</button>
      </div>
      <div class="about-line">Nova Browser v${escapeHtml(store.version)} · движок Chromium (Electron)</div>
    </div>`;
  const themeBtns = panel.querySelectorAll('#pro-theme button');
  themeBtns.forEach((b) =>
    b.addEventListener('click', () => {
      themeBtns.forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      api.invoke('settings:set', { theme: b.dataset.v });
    })
  );
  panel.querySelector('#pro-dl-folder').addEventListener('click', () => api.invoke('app:open-downloads-folder'));
  panel.querySelector('#pro-data-folder').addEventListener('click', () => api.invoke('app:open-data-folder'));
  return panel;
}

function renderSettingsPanel() {
  const panel = document.createElement('div');
  panel.className = 'panel';
  const engines = store.engines;
  const engineOptions = Object.entries(engines)
    .map(([k, v]) => `<option value="${k}" ${store.settings.searchEngine === k ? 'selected' : ''}>${escapeHtml(v.name)}</option>`)
    .join('');
  panel.innerHTML = `
    <div class="panel-header">
      <img class="header-avatar" src="avatar.png" alt="">
      <h2>${icon('gear')} Настройки</h2>
      <div class="grow"></div>
    </div>
    <div class="settings-scroll">
      <div class="form-row">
        <label>Стартовая страница</label>
        <input class="panel-input" id="set-home" value="${escapeHtml(store.settings.homePage || '')}" spellcheck="false">
      </div>
      <div class="form-row">
        <label>Поисковик по умолчанию</label>
        <select id="set-engine">${engineOptions}</select>
      </div>
      <div class="form-row">
        <label>Тема</label>
        <div class="seg" id="set-theme">
          <button data-v="system" class="${store.settings.theme === 'system' ? 'on' : ''}">Системная</button>
          <button data-v="light" class="${store.settings.theme === 'light' ? 'on' : ''}">Светлая</button>
          <button data-v="dark" class="${store.settings.theme === 'dark' ? 'on' : ''}">Тёмная</button>
        </div>
      </div>
      <div class="form-row">
        <button class="btn danger small" id="set-clear-hist">${icon('trash', { size: 13 })} Очистить историю</button>
        <button class="btn small" id="set-data-folder">${icon('folder', { size: 13 })} Открыть папку с данными</button>
      </div>
      <div class="about-line">Nova Browser v${escapeHtml(store.version)} · движок Chromium (Electron) · данные: ${escapeHtml(store.userData)}</div>
    </div>
    <div class="panel-footer">
      <div class="grow"></div>
      <button class="btn" id="set-cancel">Отмена</button>
      <button class="btn primary" id="set-save">${icon('shield', { size: 13 })} Сохранить</button>
    </div>`;

  const themeBtns = panel.querySelectorAll('#set-theme button');
  themeBtns.forEach((b) =>
    b.addEventListener('click', () => {
      themeBtns.forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
    })
  );

  panel.querySelector('#set-cancel').addEventListener('click', () => api.invoke('popover:hide'));
  panel.querySelector('#set-save').addEventListener('click', async () => {
    const home = panel.querySelector('#set-home').value.trim();
    const engine = panel.querySelector('#set-engine').value;
    const theme = panel.querySelector('#set-theme button.on').dataset.v;
    await api.invoke('settings:set', { homePage: home, searchEngine: engine, theme });
    api.invoke('popover:hide');
  });
  panel.querySelector('#set-clear-hist').addEventListener('click', async () => {
    await api.invoke('history:clear');
    toast('История очищена');
  });
  panel.querySelector('#set-data-folder').addEventListener('click', () => api.invoke('app:open-data-folder'));
  return panel;
}

if (IS_POPOVER) {
  initPopover();
} else {
  initMain();
}