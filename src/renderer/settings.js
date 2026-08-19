'use strict';

const api = window.nova;
const $ = (sel) => document.querySelector(sel);

const PERM_NAMES = {
  media: 'Камера и микрофон',
};

let permissions = {};

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderPerms() {
  const list = $('#perm-list');
  const empty = $('#perm-empty');
  const domains = Object.keys(permissions).sort();
  empty.hidden = domains.length > 0;
  list.innerHTML = '';
  for (const domain of domains) {
    const rec = permissions[domain];
    const row = document.createElement('div');
    row.className = 'perm-row';
    const kinds = Object.keys(rec);
    row.innerHTML = `
      <div class="perm-row-main">
        <div class="perm-row-title">${esc(domain)}</div>
        <div class="perm-row-sub">${kinds.map((k) => esc(PERM_NAMES[k] || k)).join(', ') || '—'}</div>
      </div>
      <button class="btn small perm-state" data-domain="${esc(domain)}">${kinds.some((k) => rec[k] === 'allow') ? 'Разрешено' : 'Заблокировано'}</button>
      <button class="btn small danger perm-del" data-domain="${esc(domain)}" title="Удалить запись">✕</button>`;
    list.appendChild(row);
  }
  list.querySelectorAll('.perm-state').forEach((b) => {
    b.addEventListener('click', async () => {
      const domain = b.dataset.domain;
      const rec = permissions[domain] || {};
      const next = Object.keys(rec).some((k) => rec[k] === 'allow') ? 'deny' : 'allow';
      for (const k of Object.keys(rec)) {
        permissions = await api.invoke('permission:set', { domain, kind: k, value: next });
      }
      renderPerms();
    });
  });
  list.querySelectorAll('.perm-del').forEach((b) => {
    b.addEventListener('click', async () => {
      permissions = await api.invoke('permission:clear', b.dataset.domain);
      renderPerms();
    });
  });
}

function bindCheckbox(id, key) {
  const el = $(id);
  el.addEventListener('change', () => api.invoke('settings:set', { [key]: el.checked }));
  return el;
}

async function init() {
  const s = await api.invoke('state:get');
  permissions = (await api.invoke('permission:get-all')) || {};
  const set = s.settings || {};

  document.documentElement.dataset.theme = (s.appearance && s.appearance.theme) || s.theme || 'dark';
  document.documentElement.dataset.accent = (s.appearance && s.appearance.accent) || 'violet';
  document.documentElement.dataset.scale = (s.appearance && s.appearance.uiScale) || 'medium';

  const engines = s.searchEngines || {};
  $('#set-engine').innerHTML = Object.entries(engines)
    .map(([k, v]) => `<option value="${k}" ${(set.searchEngine || 'google') === k ? 'selected' : ''}>${esc(v.name)}</option>`)
    .join('');

  const home = $('#set-home');
  home.value = set.homePage || '';
  home.addEventListener('change', () => {
    const v = home.value.trim();
    if (v) api.invoke('settings:set', { homePage: v });
  });

  $('#set-engine').addEventListener('change', (e) => api.invoke('settings:set', { searchEngine: e.target.value }));

  const themeSel = $('#set-theme');
  themeSel.value = set.theme || 'system';
  themeSel.addEventListener('change', (e) => api.invoke('settings:set', { theme: e.target.value }));

  const accentSel = $('#set-accent');
  accentSel.value = set.accent || 'violet';
  accentSel.addEventListener('change', (e) => api.invoke('settings:set', { accent: e.target.value }));

  const scaleSel = $('#set-scale');
  scaleSel.value = set.uiScale || 'medium';
  scaleSel.addEventListener('change', (e) => api.invoke('settings:set', { uiScale: e.target.value }));

  const wallSel = $('#set-wallpaper');
  wallSel.value = set.homeWallpaper || 'aurora';
  wallSel.addEventListener('change', (e) => api.invoke('settings:set', { homeWallpaper: e.target.value }));

  const zoomSel = $('#set-zoom');
  zoomSel.value = String(set.zoom === undefined ? 1 : set.zoom);
  zoomSel.addEventListener('change', () => api.invoke('settings:set', { zoom: Number(zoomSel.value) }));

  bindCheckbox('#set-restore-tabs', 'restoreTabs').checked = set.restoreTabs !== false;
  bindCheckbox('#set-new-blank', 'newTabBlank').checked = !!set.newTabBlank;
  bindCheckbox('#set-close-always', 'showTabCloseAlways').checked = !!set.showTabCloseAlways;
  bindCheckbox('#set-compact', 'compactChrome').checked = !!set.compactChrome;
  bindCheckbox('#set-confirm-close', 'confirmCloseTabs').checked = !!set.confirmCloseTabs;
  bindCheckbox('#set-home-links', 'showHomeLinks').checked = set.showHomeLinks !== false;
  bindCheckbox('#set-home-bm', 'showHomeBookmarks').checked = set.showHomeBookmarks !== false;
  bindCheckbox('#set-history', 'recordHistory').checked = set.recordHistory !== false;
  bindCheckbox('#set-dnt', 'doNotTrack').checked = !!set.doNotTrack;
  bindCheckbox('#set-thirdparty', 'blockThirdPartyCookies').checked = !!set.blockThirdPartyCookies;
  bindCheckbox('#set-clear-exit', 'clearOnExit').checked = !!set.clearOnExit;
  bindCheckbox('#set-dl-ask', 'downloadAsk').checked = !!set.downloadAsk;

  const dlDir = $('#set-dl-dir');
  if (set.downloadDir) dlDir.value = set.downloadDir;
  $('#set-dl-dir-btn').addEventListener('click', async () => {
    const dir = await api.invoke('app:choose-download-dir');
    if (dir) {
      dlDir.value = dir;
      await api.invoke('settings:set', { downloadDir: dir });
    }
  });

  $('#perm-clear-all').addEventListener('click', async () => {
    permissions = (await api.invoke('permission:clear-all')) || {};
    renderPerms();
  });

  $('#set-data-folder').addEventListener('click', () => api.invoke('app:open-data-folder'));
  $('#set-default-browser').addEventListener('click', async () => {
    await api.invoke('browser:register-default');
    alert('Открыты настройки Windows. Найдите Nova Browser в списке приложений и нажмите «Установить по умолчанию».');
  });
  $('#set-clear-hist').addEventListener('click', async () => {
    await api.invoke('history:clear');
    alert('История очищена');
  });
  $('#set-reset').addEventListener('click', async () => {
    if (!confirm('Сбросить все настройки к значениям по умолчанию?')) return;
    await api.invoke('settings:reset');
    location.reload();
  });

  $('#about-line').textContent = 'Nova Browser v' + (s.version || '') + ' · движок Chromium (Electron) · данные: ' + (s.userData || '');

  api.on('theme:changed', (m) => {
    document.documentElement.dataset.theme = m.theme || 'dark';
    document.documentElement.dataset.accent = m.accent || 'violet';
    document.documentElement.dataset.scale = m.uiScale || 'medium';
  });

  renderPerms();
}

init();