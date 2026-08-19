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

function domainHost(d) {
  return d;
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
        <div class="perm-row-title">${esc(domainHost(domain))}</div>
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

async function init() {
  const s = await api.invoke('state:get');
  permissions = (await api.invoke('permission:get-all')) || {};

  document.documentElement.dataset.theme = s.theme || 'dark';

  const engines = s.searchEngines || {};
  $('#set-engine').innerHTML = Object.entries(engines)
    .map(([k, v]) => `<option value="${k}" ${(s.settings.searchEngine || 'google') === k ? 'selected' : ''}>${esc(v.name)}</option>`)
    .join('');

  const home = $('#set-home');
  home.value = s.settings.homePage || '';
  home.addEventListener('change', () => {
    const v = home.value.trim();
    if (v) api.invoke('settings:set', { homePage: v });
  });

  $('#set-engine').addEventListener('change', (e) => api.invoke('settings:set', { searchEngine: e.target.value }));

  const themeBtns = document.querySelectorAll('#set-theme button');
  const setTheme = (t) => {
    themeBtns.forEach((b) => b.classList.toggle('on', b.dataset.v === t));
  };
  setTheme(s.settings.theme || 'system');
  themeBtns.forEach((b) =>
    b.addEventListener('click', () => {
      const t = b.dataset.v;
      setTheme(t);
      api.invoke('settings:set', { theme: t });
    })
  );

  $('#perm-clear-all').addEventListener('click', async () => {
    permissions = (await api.invoke('permission:clear-all')) || {};
    renderPerms();
  });

  $('#set-data-folder').addEventListener('click', () => api.invoke('app:open-data-folder'));
  $('#set-clear-hist').addEventListener('click', async () => {
    await api.invoke('history:clear');
    alert('История очищена');
  });

  $('#about-line').textContent = 'Nova Browser v' + (s.version || '') + ' · движок Chromium (Electron) · данные: ' + (s.userData || '');

  api.on('theme:changed', (m) => {
    document.documentElement.dataset.theme = m;
  });

  renderPerms();
}

init();
