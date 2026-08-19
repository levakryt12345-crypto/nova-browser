'use strict';

const {
  app,
  BrowserWindow,
  WebContentsView,
  ipcMain,
  shell,
  Menu,
  nativeTheme,
  nativeImage,
  dialog,
  session,
  screen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Store = require('./store');
const { registerBrowser } = require('./register-browser');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const INDEX_HTML = path.join(__dirname, '..', 'renderer', 'index.html');
const PRELOAD = path.join(__dirname, '..', 'preload', 'preload.js');
const SETTINGS_HTML = path.join(__dirname, '..', 'renderer', 'settings.html');
const HOME_HTML = path.join(__dirname, '..', 'renderer', 'home.html');
const SPLASH_HTML = path.join(__dirname, '..', 'renderer', 'splash.html');
const ICON_PNG = path.join(PROJECT_ROOT, 'assets', 'icon.png');
const AVATAR_PNG = path.join(PROJECT_ROOT, 'assets', 'avatar.png');

const SETTINGS_URL = 'nova://settings';
const HOME_URL = 'nova://home';

const CHROME_HEIGHT = 88;
const CHROME_COMPACT = 64;
const ACCENTS = ['violet', 'blue', 'green', 'amber', 'rose', 'teal'];
const WALLPAPERS = ['aurora', 'sunset', 'ocean', 'forest', 'mono'];
const DEFAULT_SETTINGS = {
  homePage: 'nova://home',
  searchEngine: 'google',
  theme: 'system',
  restoreTabs: true,
  recordHistory: true,
  newTabBlank: false,
  doNotTrack: false,
  blockThirdPartyCookies: false,
  zoom: 1,
  downloadDir: null,
  accent: 'violet',
  uiScale: 'medium',
  homeWallpaper: 'aurora',
  showHomeLinks: true,
  showHomeBookmarks: true,
  showTabCloseAlways: false,
  compactChrome: false,
  clearOnExit: false,
  downloadAsk: false,
  confirmCloseTabs: false,
};

const SEARCH_ENGINES = {
  google: { name: 'Google', url: 'https://www.google.com/search?q={q}' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q={q}' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={q}' },
  yandex: { name: 'Яндекс', url: 'https://yandex.ru/search/?text={q}' },
};

const POPOVER_SIZES = {
  bookmarks: { width: 400, height: 384 },
  history: { width: 400, height: 448 },
  downloads: { width: 400, height: 368 },
  settings: { width: 400, height: 452 },
  profile: { width: 320, height: 428 },
};

function argValue(name) {
  for (const a of process.argv) {
    if (a.startsWith(name + '=')) return a.slice(name.length + 1);
  }
  return null;
}

const VERIFY = process.argv.some((a) => a.startsWith('--nova-verify-url'));
const DEVTOOLS = !app.isPackaged || process.argv.includes('--nova-devtools');
const VERIFY_URL = argValue('--nova-verify-url') || 'https://example.com';
const VERIFY_OUT = argValue('--nova-verify-out')
  ? path.resolve(argValue('--nova-verify-out'))
  : path.join(app.getPath('userData'), 'verify.png');

function argUrlFromArgs(args) {
  for (const a of args) {
    if (/^https?:\/\//i.test(a)) return a;
  }
  return null;
}

const state = {
  win: null,
  store: null,
  tabs: new Map(),
  order: [],
  activeId: null,
  seq: 1,
  downloads: new Map(),
  dlSeq: 0,
  popover: null,
  verifyTimer: null,
  pendingPerm: new Map(),
  permSeq: 0,
  splash: null,
  revealed: false,
  closingConfirmed: false,
};

const CRASH_LOG = path.join(PROJECT_ROOT, 'crash.log');

function log(msg) {
  try {
    fs.appendFileSync(CRASH_LOG, new Date().toISOString() + ' [pid ' + process.pid + '] ' + msg + '\n');
  } catch {}
}

try {
  fs.writeFileSync(CRASH_LOG, 'module start\n');
} catch {}

process.on('uncaughtException', (err) => {
  log('UNCAUGHT: ' + (err && err.stack ? err.stack : String(err)));
});

process.on('unhandledRejection', (reason) => {
  log('UNHANDLED_REJECTION: ' + String(reason && (reason.stack || reason)));
});

function settings() {
  return state.store.getSettings();
}

function chromeHeight() {
  return settings().compactChrome ? CHROME_COMPACT : CHROME_HEIGHT;
}

function appearance() {
  const s = settings();
  return {
    theme: resolvedTheme(),
    accent: s.accent || 'violet',
    uiScale: s.uiScale || 'medium',
    homeWallpaper: s.homeWallpaper || 'aurora',
    compactChrome: !!s.compactChrome,
    showTabCloseAlways: !!s.showTabCloseAlways,
  };
}

function resolvedTheme() {
  const s = settings();
  if (s.theme !== 'system') return s.theme;
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function broadcast(channel, payload) {
  const targets = [state.win];
  if (state.popover && state.popover.win && !state.popover.win.isDestroyed()) targets.push(state.popover.win);
  for (const t of state.tabs.values()) targets.push(t.wc);
  for (const w of targets) {
    if (!w) continue;
    try {
      if (w.isDestroyed && w.isDestroyed()) continue;
    } catch {
      continue;
    }
    const wc = w.webContents ? w.webContents : w;
    try {
      if (!wc.isDestroyed()) wc.send(channel, payload);
    } catch {}
  }
}

function tabPublic(id) {
  const t = state.tabs.get(id);
  if (!t) return null;
  return {
    id: t.id,
    title: t.title,
    url: t.url,
    favicon: t.favicon,
    canBack: t.canBack,
    canForward: t.canForward,
    loading: t.loading,
  };
}

function pushTabs() {
  broadcast('tabs:changed', { tabs: state.order.map(tabPublic).filter(Boolean), activeId: state.activeId });
}

function pushData() {
  broadcast('data:changed', {
    bookmarks: state.store.getBookmarks(),
    history: state.store.getHistory(),
    settings: settings(),
  });
}

function pushTheme() {
  broadcast('theme:changed', appearance());
}

function pushDownloads() {
  const list = Array.from(state.downloads.values()).slice(-100).reverse();
  broadcast('downloads:changed', list);
}

function layout() {
  if (!state.win || state.win.isDestroyed()) return;
  const [w, h] = state.win.getContentSize();
  const ch = chromeHeight();
  for (const id of state.order) {
    const t = state.tabs.get(id);
    if (!t) continue;
    const active = id === state.activeId;
    t.view.setBounds(active ? { x: 0, y: ch, width: w, height: Math.max(0, h - ch) } : { x: 0, y: 0, width: 0, height: 0 });
  }
}

function recordHistory(tab) {
  if (!settings().recordHistory) return;
  if (!tab.url || /^(about|chrome|devtools|data|nova|file):/i.test(tab.url)) return;
  state.store.addHistory({ url: tab.url, title: tab.title });
  broadcast('data:changed', { bookmarks: state.store.getBookmarks(), history: state.store.getHistory(), settings: settings() });
}

function saveTabsState() {
  const urls = state.order
    .map((id) => state.tabs.get(id))
    .filter((t) => t && !t.special && t.url && !/^(about:blank|nova:)/i.test(t.url))
    .map((t) => t.url);
  state.store.setTabsState(urls);
}

function updateNavState(id) {
  const t = state.tabs.get(id);
  if (!t) return;
  try {
    t.canBack = t.wc.navigationHistory.canGoBack();
    t.canForward = t.wc.navigationHistory.canGoForward();
  } catch {
    t.canBack = false;
    t.canForward = false;
  }
}

function tabDirty(id) {
  updateNavState(id);
  pushTabs();
}

function activateTab(id) {
  const t = state.tabs.get(id);
  if (!t) return;
  state.activeId = id;
  for (const oid of state.order) {
    const ot = state.tabs.get(oid);
    if (!ot) continue;
    state.win.contentView.removeChildView(ot.view);
    try {
      ot.wc.setBackgroundThrottling(true);
    } catch {}
  }
  state.win.contentView.addChildView(t.view);
  try {
    t.wc.setBackgroundThrottling(false);
  } catch {}
  layout();
  if (t.pendingUrl) {
    const u = t.pendingUrl;
    t.pendingUrl = null;
    if (u === HOME_URL) {
      createHomeTab(t);
    } else {
      t.wc.loadURL(u);
    }
  }
  t.wc.focus();
  pushTabs();
}

function createTab(rawUrl, opts = {}) {
  const url = normalizeUrl(rawUrl, !!opts.strict);
  if (url === SETTINGS_URL) return createSettingsTab();
  if (url === HOME_URL) return createHomeTab();
  const wantBlank = !rawUrl && !!settings().newTabBlank;
  const id = state.seq++;
  const view = new WebContentsView({
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });
  const wc = view.webContents;
  view.setBackgroundColor(resolvedTheme() === 'dark' ? '#191a1f' : '#ffffff');

  const tab = {
    id,
    view,
    wc,
    title: 'Новая вкладка',
    url: '',
    favicon: null,
    canBack: false,
    canForward: false,
    loading: true,
    pendingUrl: opts.defer ? url : null,
  };
  state.tabs.set(id, tab);
  state.order.push(id);
  state.win.contentView.addChildView(view);

  wc.setWindowOpenHandler(({ url: u }) => {
    createTab(u);
    return { action: 'deny' };
  });
  wc.on('page-title-updated', (e, title) => {
    tab.title = title || 'Без названия';
    tabDirty(id);
  });
  wc.on('page-favicon-updated', (e, favicons) => {
    if (favicons && favicons.length) {
      tab.favicon = favicons[0];
      tabDirty(id);
    }
  });
  wc.on('did-start-loading', () => {
    if (VERIFY) log('did-start-loading ' + wc.getURL());
    tab.loading = true;
    tabDirty(id);
  });
  wc.on('did-stop-loading', () => {
    if (VERIFY) log('did-stop-loading ' + wc.getURL() + ' title=' + wc.getTitle());
    tab.loading = false;
    const u = wc.getURL();
    if (u && u !== tab.url) {
      tab.url = u;
      recordHistory(tab);
    }
    tabDirty(id);
    saveTabsState();
    try {
      wc.setZoomFactor(settings().zoom);
    } catch {}
  });
  wc.on('did-navigate', (e, u) => {
    if (VERIFY) log('did-navigate ' + u);
    tab.url = u;
    recordHistory(tab);
    tabDirty(id);
    saveTabsState();
  });
  wc.on('did-navigate-in-page', (e, u) => {
    tab.url = u;
    recordHistory(tab);
    tabDirty(id);
  });
  wc.on('did-fail-load', (e, code, desc, failedUrl, isMainFrame) => {
    if (isMainFrame && code !== -3) {
      tab.loading = false;
      if (failedUrl === tab.url) tab.title = 'Не удалось открыть страницу';
      tabDirty(id);
    }
  });
  wc.on('render-process-gone', () => {
    tab.title = 'Страница не отвечает';
    tabDirty(id);
  });
  wc.on('context-menu', (e, params) => {
    const tpl = [
      { label: 'Назад', enabled: tab.canBack, click: () => goBack(id) },
      { label: 'Вперёд', enabled: tab.canForward, click: () => goForward(id) },
      { label: 'Перезагрузить', click: () => reload(id) },
      { type: 'separator' },
      { label: 'Копировать', role: 'copy', enabled: params.editFlags.canCopy },
      { label: 'Вставить', role: 'paste', enabled: params.editFlags.canPaste },
      { label: 'Выделить всё', role: 'selectAll' },
    ];
    if (DEVTOOLS) {
      tpl.push({ type: 'separator' });
      tpl.push({ label: 'Просмотреть код', click: () => wc.toggleDevTools() });
    }
    const menu = Menu.buildFromTemplate(tpl);
    menu.popup();
  });

  if (!opts.silent) activateTab(id);
  if (opts.defer) return id;
  if (wantBlank) {
    wc.loadURL('about:blank');
  } else {
    wc.loadURL(url);
  }
  if (VERIFY && state.order.length === 1) setupVerify(wc, id);
  return id;
}

function createHomeTab(existing) {
  if (existing) {
    existing.special = 'home';
    existing.title = 'Новая вкладка';
    existing.url = HOME_URL;
    existing.wc.loadFile(HOME_HTML);
    tabDirty(existing.id);
    return existing.id;
  }
  const id = state.seq++;
  const view = new WebContentsView({
    webPreferences: {
      preload: PRELOAD,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });
  const wc = view.webContents;
  view.setBackgroundColor(resolvedTheme() === 'dark' ? '#191a1f' : '#ffffff');

  const tab = {
    id,
    view,
    wc,
    special: 'home',
    title: 'Новая вкладка',
    url: HOME_URL,
    favicon: null,
    canBack: false,
    canForward: false,
    loading: true,
  };
  state.tabs.set(id, tab);
  state.order.push(id);
  state.win.contentView.addChildView(view);

  wc.setWindowOpenHandler(({ url: u }) => {
    createTab(u);
    return { action: 'deny' };
  });
  wc.on('page-title-updated', (e, title) => {
    tab.title = title || 'Новая вкладка';
    tabDirty(id);
  });
  wc.on('did-start-loading', () => {
    tab.loading = true;
    tabDirty(id);
  });
  wc.on('did-stop-loading', () => {
    tab.loading = false;
    tab.url = wc.getURL() === 'file:///' + HOME_HTML.replace(/\\/g, '/') ? HOME_URL : wc.getURL();
    tabDirty(id);
  });
  wc.on('did-navigate', (e, u) => {
    if (u && u.startsWith('file:') && u.endsWith('home.html')) {
      tab.url = HOME_URL;
    } else {
      tab.url = u;
      tab.special = undefined;
    }
    tabDirty(id);
  });

  activateTab(id);
  wc.loadFile(HOME_HTML);
  if (VERIFY && state.order.length === 1) setupVerify(wc, id);
  return id;
}

function createSettingsTab() {
  const id = state.seq++;
  const view = new WebContentsView({
    webPreferences: {
      preload: PRELOAD,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });
  const wc = view.webContents;
  view.setBackgroundColor(resolvedTheme() === 'dark' ? '#191a1f' : '#ffffff');

  const tab = {
    id,
    view,
    wc,
    special: 'settings',
    title: 'Настройки',
    url: SETTINGS_URL,
    favicon: null,
    canBack: false,
    canForward: false,
    loading: true,
  };
  state.tabs.set(id, tab);
  state.order.push(id);
  state.win.contentView.addChildView(view);

  wc.setWindowOpenHandler(() => ({ action: 'deny' }));
  wc.on('will-navigate', (e) => e.preventDefault());
  wc.on('page-title-updated', (e, title) => {
    tab.title = title || 'Настройки';
    tabDirty(id);
  });
  wc.on('did-start-loading', () => {
    tab.loading = true;
    tabDirty(id);
  });
  wc.on('did-stop-loading', () => {
    tab.loading = false;
    tab.url = SETTINGS_URL;
    tabDirty(id);
  });
  wc.on('did-navigate', (e, u) => {
    if (u && u.startsWith('file:') && u.endsWith('settings.html')) tab.url = SETTINGS_URL;
    tabDirty(id);
  });

  activateTab(id);
  wc.loadFile(SETTINGS_HTML);
  if (VERIFY && state.order.length === 1) setupVerify(wc, id);
  return id;
}

function closeTab(id) {
  const t = state.tabs.get(id);
  if (!t) return;
  if (state.order.length === 1) {
    state.win.close();
    return;
  }
  const idx = state.order.indexOf(id);
  state.order.splice(idx, 1);
  state.tabs.delete(id);
  state.win.contentView.removeChildView(t.view);
  t.wc.close();
  saveTabsState();
  if (state.activeId === id) {
    const next = state.order[Math.min(idx, state.order.length - 1)];
    if (next !== undefined) activateTab(next);
  }
  pushTabs();
}

function normalizeUrl(input, strict = false) {
  const s = (input || '').trim();
  if (!s) return settings().homePage;
  if (/^nova:(\/\/)?settings$/i.test(s)) return SETTINGS_URL;
  if (/^nova:(\/\/)?home$/i.test(s)) return HOME_URL;
  if (strict && (/^localhost(:\d+)?([/?#][^\s]*)?$/i.test(s) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?([/?#][^\s]*)?$/.test(s))) return 'https://' + s;
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(s);
  if (m) {
    const sc = m[1].toLowerCase();
    if (sc === 'http' || sc === 'https') return s;
    if (strict) {
      const engine = SEARCH_ENGINES[settings().searchEngine] || SEARCH_ENGINES.google;
      return engine.url.replace('{q}', encodeURIComponent(s));
    }
    return s;
  }
  if (/^[\w-]+(\.[\w-]+)+([/?#][^\s]*)?$/.test(s) || /^localhost(:\d+)?([/?#][^\s]*)?$/i.test(s)) return 'https://' + s;
  const engine = SEARCH_ENGINES[settings().searchEngine] || SEARCH_ENGINES.google;
  return engine.url.replace('{q}', encodeURIComponent(s));
}

function activeTab() {
  return state.tabs.get(state.activeId);
}

function navigateTo(url) {
  const t = activeTab();
  if (!t) return;
  const u = normalizeUrl(url, true);
  if (u === SETTINGS_URL) {
    const existing = state.order.map((id) => state.tabs.get(id)).find((x) => x && x.special === 'settings');
    if (existing) {
      activateTab(existing.id);
      return;
    }
    if (t.special === 'settings') {
      t.wc.loadFile(SETTINGS_HTML);
    } else {
      createSettingsTab();
    }
    return;
  }
  if (u === HOME_URL) {
    const existing = state.order.map((id) => state.tabs.get(id)).find((x) => x && x.special === 'home');
    if (existing) {
      if (existing.url !== HOME_URL) existing.wc.loadFile(HOME_HTML);
      activateTab(existing.id);
      return;
    }
    if (t.special === 'home') {
      t.wc.loadFile(HOME_HTML);
    } else {
      createHomeTab();
    }
    return;
  }
  if (t.special) t.special = undefined;
  t.wc.loadURL(u);
}

function goBack(id) {
  const t = state.tabs.get(id);
  if (!t) return;
  try {
    if (t.wc.navigationHistory.canGoBack()) t.wc.navigationHistory.goBack();
  } catch {}
}

function goForward(id) {
  const t = state.tabs.get(id);
  if (!t) return;
  try {
    if (t.wc.navigationHistory.canGoForward()) t.wc.navigationHistory.goForward();
  } catch {}
}

function reload(id) {
  const t = state.tabs.get(id);
  if (!t) return;
  t.wc.reload();
}

function stop(id) {
  const t = state.tabs.get(id);
  if (!t) return;
  t.wc.stop();
}

function zoom(delta) {
  const t = activeTab();
  if (!t) return;
  const factor = clamp(t.wc.getZoomFactor() + delta, 0.25, 5);
  t.wc.setZoomFactor(factor);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function snapshot() {
  return {
    tabs: state.order.map(tabPublic).filter(Boolean),
    activeId: state.activeId,
    downloads: Array.from(state.downloads.values()).slice(-100).reverse(),
    bookmarks: state.store.getBookmarks(),
    history: state.store.getHistory(),
    settings: settings(),
    appearance: appearance(),
    version: app.getVersion(),
    searchEngines: SEARCH_ENGINES,
    searchUrl: (SEARCH_ENGINES[settings().searchEngine] || SEARCH_ENGINES.google).url,
    username: (() => {
      try {
        return os.userInfo().username || '';
      } catch {
        return '';
      }
    })(),
    userData: app.getPath('userData'),
    isVerify: VERIFY,
  };
}

function permissionDomain(requestingUrl, fallbackUrl) {
  try {
    const u = new URL(requestingUrl || fallbackUrl || '');
    return u.hostname || null;
  } catch {
    return null;
  }
}

function permissionKind(permission) {
  if (permission === 'media') return 'media';
  return permission;
}

function setupIpc() {
  ipcMain.handle('state:get', () => snapshot());

  ipcMain.handle('tab:create', (e, url) => createTab(url, { strict: true }));

  ipcMain.handle('tab:close', (e, id) => closeTab(id));

  ipcMain.handle('tab:activate', (e, id) => activateTab(id));

  ipcMain.handle('tab:go', (e, url) => navigateTo(url));

  ipcMain.handle('nav:do', (e, action) => {
    const id = state.activeId;
    if (action === 'back') goBack(id);
    else if (action === 'forward') goForward(id);
    else if (action === 'reload') reload(id);
    else if (action === 'stop') stop(id);
    else if (action === 'home') navigateTo(settings().homePage);
  });

  ipcMain.handle('bookmark:add', (e, { url, title } = {}) => {
    const t = activeTab();
    const target = { url: url || (t ? t.url : ''), title: title || (t ? t.title : '') };
    if (!target.url) return { added: false };
    const res = state.store.addBookmark(target);
    pushData();
    return res;
  });

  ipcMain.handle('bookmark:remove', (e, id) => {
    state.store.removeBookmark(id);
    pushData();
  });

  ipcMain.handle('history:clear', () => {
    state.store.clearHistory();
    pushData();
  });

  ipcMain.handle('history:remove', (e, id) => {
    state.store.removeHistory(id);
    pushData();
  });

  ipcMain.handle('settings:set', (e, partial) => {
    const safe = {};
    if (typeof partial.homePage === 'string' && partial.homePage.trim()) safe.homePage = partial.homePage.trim();
    if (SEARCH_ENGINES[partial.searchEngine]) safe.searchEngine = partial.searchEngine;
    if (['light', 'dark', 'system'].includes(partial.theme)) safe.theme = partial.theme;
    for (const k of ['restoreTabs', 'recordHistory', 'newTabBlank', 'doNotTrack', 'blockThirdPartyCookies']) {
      if (typeof partial[k] === 'boolean') safe[k] = partial[k];
    }
    if (typeof partial.zoom === 'number' && partial.zoom >= 0.5 && partial.zoom <= 2) safe.zoom = Math.round(partial.zoom * 100) / 100;
    if (typeof partial.downloadDir === 'string' && (partial.downloadDir === '' || partial.downloadDir.trim())) {
      safe.downloadDir = partial.downloadDir.trim();
    }
    if (ACCENTS.includes(partial.accent)) safe.accent = partial.accent;
    if (['small', 'medium', 'large'].includes(partial.uiScale)) safe.uiScale = partial.uiScale;
    if (WALLPAPERS.includes(partial.homeWallpaper)) safe.homeWallpaper = partial.homeWallpaper;
    for (const k of ['showHomeLinks', 'showHomeBookmarks', 'showTabCloseAlways', 'compactChrome', 'clearOnExit', 'downloadAsk', 'confirmCloseTabs']) {
      if (typeof partial[k] === 'boolean') safe[k] = partial[k];
    }
    state.store.setSettings(safe);
    const s = settings();
    for (const t of state.tabs.values()) {
      t.view.setBackgroundColor(resolvedTheme() === 'dark' ? '#191a1f' : '#ffffff');
      try {
        t.wc.setZoomFactor(s.zoom);
      } catch {}
    }
    layout();
    pushData();
    pushTheme();
  });

  ipcMain.handle('settings:reset', () => {
    state.store.resetSettings();
    const s = settings();
    for (const t of state.tabs.values()) {
      t.view.setBackgroundColor(resolvedTheme() === 'dark' ? '#191a1f' : '#ffffff');
      try {
        t.wc.setZoomFactor(s.zoom);
      } catch {}
    }
    layout();
    pushData();
    pushTheme();
  });

  ipcMain.handle('app:choose-download-dir', async () => {
    const res = await dialog.showOpenDialog(state.win, {
      title: 'Папка для загрузок',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (res.canceled || !res.filePaths.length) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('downloads:action', (e, { id, action } = {}) => {
    const dl = state.downloads.get(id);
    if (!dl || !dl.item) return;
    if (action === 'pause') dl.item.pause();
    else if (action === 'resume') dl.item.resume();
    else if (action === 'cancel') dl.item.cancel();
    else if (action === 'reveal') shell.showItemInFolder(dl.filePath);
  });

  ipcMain.handle('downloads:clear', () => {
    for (const [id, dl] of state.downloads) {
      if (dl.status === 'completed' || dl.status === 'failed') state.downloads.delete(id);
    }
    pushDownloads();
  });

  ipcMain.handle('win:minimize', () => state.win && state.win.minimize());
  ipcMain.handle('win:toggle-max', () => {
    if (!state.win) return;
    if (state.win.isMaximized()) state.win.unmaximize();
    else state.win.maximize();
  });
  ipcMain.handle('win:close', () => state.win && state.win.close());

  ipcMain.handle('popover:show', (e, { type, anchor } = {}) => popoverShow(type, anchor));
  ipcMain.handle('popover:hide', () => popoverHide());

  ipcMain.handle('app:open-data-folder', () => shell.openPath(app.getPath('userData')));

  ipcMain.handle('browser:register-default', async () => {
    const ok = await registerBrowser();
    shell.openExternal('ms-settings:defaultapps');
    return ok;
  });

  ipcMain.handle('app:open-downloads-folder', () => shell.openPath(app.getPath('downloads')));

  ipcMain.handle('permission:respond', (e, { requestId, allow, remember } = {}) => {
    const rec = state.pendingPerm.get(requestId);
    if (!rec || rec.answered) return;
    rec.answered = true;
    clearTimeout(rec.timer);
    rec.callback(!!allow);
    state.pendingPerm.delete(requestId);
  });

  ipcMain.handle('permission:get-all', () => state.store.getPermissions());

  ipcMain.handle('permission:set', (e, { domain, kind, value } = {}) => {
    state.store.setPermission(String(domain || ''), String(kind || ''), value || null);
    return state.store.getPermissions();
  });

  ipcMain.handle('permission:clear', (e, domain) => {
    state.store.clearPermission(String(domain || ''));
    return state.store.getPermissions();
  });

  ipcMain.handle('permission:clear-all', () => {
    state.store.clearPermissions();
    return state.store.getPermissions();
  });
}

class Popover {
  constructor() {
    this.win = null;
    this.type = null;
  }

  show(type, anchor = {}) {
    if (!POPOVER_SIZES[type]) return;
    if (this.win && !this.win.isDestroyed()) this.win.destroy();
    this.type = type;
    const size = POPOVER_SIZES[type];
    const win = new BrowserWindow({
      width: size.width,
      height: size.height,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      show: false,
      skipTaskbar: true,
      transparent: true,
      backgroundColor: '#00000000',
      parent: state.win,
      webPreferences: {
        preload: PRELOAD,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false,
      },
    });
    this.win = win;
    win.setAlwaysOnTop(true, 'pop-up-menu');
    win.webContents.on('will-navigate', (e) => e.preventDefault());
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.on('blur', () => this.hide());
    win.on('closed', () => {
      if (this.win === win) {
        this.win = null;
        this.type = null;
      }
    });
    win.webContents.on('did-finish-load', () => {
      this.position(type, anchor);
      if (!win.isDestroyed()) {
        win.show();
        win.focus();
      }
    });
    win.loadFile(INDEX_HTML, { query: { popover: type } });
  }

  hide() {
    if (this.win && !this.win.isDestroyed()) this.win.hide();
  }

  position(type, anchor = {}) {
    if (!this.win || !state.win) return;
    const size = POPOVER_SIZES[type];
    const mb = state.win.getContentBounds();
    const wa = screen.getDisplayMatching(mb).workArea;
    let x = mb.x + (typeof anchor.x === 'number' ? anchor.x : 60);
    let y = mb.y + (typeof anchor.y === 'number' ? anchor.y : chromeHeight()) + 8;
    x = Math.round(clamp(x, wa.x + 8, wa.x + wa.width - size.width - 8));
    y = Math.round(clamp(y, wa.y + 8, wa.y + wa.height - size.height - 8));
    this.win.setPosition(x, y);
  }
}

const popover = new Popover();

function popoverShow(type, anchor) {
  popover.show(type, anchor);
}

function popoverHide() {
  popover.hide();
}

function buildMenu() {
  const tpl = [
    {
      label: 'Файл',
      submenu: [
        { label: 'Новая вкладка', accelerator: 'CmdOrCtrl+T', click: () => createTab() },
        { label: 'Закрыть вкладку', accelerator: 'CmdOrCtrl+W', click: () => state.activeId && closeTab(state.activeId) },
        { type: 'separator' },
        { label: 'Выход', role: 'quit' },
      ],
    },
    {
      label: 'Правка',
      submenu: [
        { role: 'undo', label: 'Отменить' },
        { role: 'redo', label: 'Повторить' },
        { type: 'separator' },
        { role: 'cut', label: 'Вырезать' },
        { role: 'copy', label: 'Копировать' },
        { role: 'paste', label: 'Вставить' },
        { role: 'selectAll', label: 'Выделить всё' },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        { label: 'Назад', accelerator: 'Alt+Left', click: () => goBack(state.activeId) },
        { label: 'Вперёд', accelerator: 'Alt+Right', click: () => goForward(state.activeId) },
        { label: 'Перезагрузить', accelerator: 'CmdOrCtrl+R', click: () => reload(state.activeId) },
        { label: 'Домой', accelerator: 'CmdOrCtrl+Shift+H', click: () => navigateTo(settings().homePage) },
        { type: 'separator' },
        { label: 'Адресная строка', accelerator: 'CmdOrCtrl+L', click: () => state.win.webContents.send('cmd:focus-address') },
        { label: 'Закладки', accelerator: 'CmdOrCtrl+B', click: () => popoverShow('bookmarks', { x: 320, y: CHROME_HEIGHT }) },
        { label: 'История', accelerator: 'CmdOrCtrl+H', click: () => popoverShow('history', { x: 260, y: CHROME_HEIGHT }) },
        { label: 'Загрузки', accelerator: 'CmdOrCtrl+J', click: () => popoverShow('downloads', { x: 200, y: CHROME_HEIGHT }) },
        { label: 'Настройки', accelerator: 'CmdOrCtrl+,', click: () => navigateTo(SETTINGS_URL) },
        { type: 'separator' },
        { label: 'Добавить в закладки', accelerator: 'CmdOrCtrl+D', click: () => ipcBookmarkActive() },
        { label: 'Очистить историю', accelerator: 'CmdOrCtrl+Shift+Delete', click: () => { state.store.clearHistory(); pushData(); } },
        { type: 'separator' },
        { label: 'Масштаб +', accelerator: 'CmdOrCtrl+Plus', click: () => zoom(0.25) },
        { label: 'Масштаб -', accelerator: 'CmdOrCtrl+-', click: () => zoom(-0.25) },
        { label: 'Сбросить масштаб', accelerator: 'CmdOrCtrl+0', click: () => zoom(1 - (activeTab() ? activeTab().wc.getZoomFactor() : 1)) },
        { type: 'separator' },
        { label: 'Инструменты разработчика', accelerator: 'F12', visible: DEVTOOLS, click: () => { const t = activeTab(); if (t) t.wc.toggleDevTools(); } },
        { label: 'Полноэкранный режим', accelerator: 'F11', click: () => { if (state.win) state.win.setFullScreen(!state.win.isFullScreen()); } },
      ],
    },
    {
      label: 'Справка',
      submenu: [
        {
          label: 'О Nova Browser',
          click: () =>
            dialog.showMessageBox(state.win, {
              type: 'info',
              title: 'О Nova Browser',
              message: 'Nova Browser ' + app.getVersion(),
              detail:
                'Минималистичный браузер на базе Chromium (Electron).\n\nДанные (закладки, история, настройки) хранятся в:\n' + app.getPath('userData'),
              buttons: ['ОК'],
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

function ipcBookmarkActive() {
  const t = activeTab();
  if (!t || !t.url) return;
  const res = state.store.addBookmark({ url: t.url, title: t.title });
  pushData();
  state.win.webContents.send('flash:message', res.added ? 'Добавлено в закладки' : 'Закладка уже существует');
  return res;
}

function setupVerify(wc, tabId) {
  const timeout = setTimeout(() => {
    log('VERIFY_TIMEOUT ' + wc.getURL());
    app.exit(2);
  }, 90000);
  wc.once('did-finish-load', async () => {
    await new Promise((r) => setTimeout(r, 1500));
    const t = state.tabs.get(tabId);
    const url = t ? t.url : wc.getURL();
    let title = '';
    let body = '';
    let domNodes = 0;
    try {
      title = await wc.executeJavaScript('document.title');
      body = await wc.executeJavaScript('document.body ? document.body.innerText.slice(0, 300) : ""');
      domNodes = await wc.executeJavaScript('document.body ? document.body.children.length : 0');
    } catch (err) {
      log('VERIFY_DOM_FAIL ' + err.message);
    }
    const okUrl = url.startsWith(VERIFY_URL);
    const okTitle = (title || '').trim().length > 0;
    const okDom = (body || '').trim().length > 0 || (url.startsWith('nova:') && domNodes > 0);
    let shot = false;
    if (url.startsWith('nova:')) await new Promise((r) => setTimeout(r, 1500));
    if (state.win) {
      try {
        state.win.show();
        state.win.focus();
        state.win.moveTop();
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 400));
    for (let attempt = 0; attempt < 5 && !shot; attempt++) {
      try {
        const img = await wc.capturePage();
        fs.mkdirSync(path.dirname(VERIFY_OUT), { recursive: true });
        fs.writeFileSync(VERIFY_OUT, img.toPNG());
        shot = true;
        log('VERIFY_SHOT ' + VERIFY_OUT);
      } catch (err) {
        log('VERIFY_SHOT_FAIL attempt=' + (attempt + 1) + ' ' + err.message);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    const result = { url, title, body, okUrl, okTitle, okDom, shot, ok: okUrl && okTitle && okDom && shot };
    fs.writeFileSync(path.join(path.dirname(VERIFY_OUT), 'verify-result.json'), JSON.stringify(result, null, 2));
    log('VERIFY_RESULT ' + JSON.stringify(result));
    clearTimeout(timeout);
    setTimeout(() => app.exit(result.ok ? 0 : 1), 500);
  });
}

function showSplash() {
  if (VERIFY) return null;
  try {
    const wa = screen.getPrimaryDisplay().workArea;
    const splash = new BrowserWindow({
      width: wa.width,
      height: wa.height,
      x: wa.x,
      y: wa.y,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      show: false,
      backgroundColor: '#12131a',
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false,
      },
    });
    splash.setAlwaysOnTop(true, 'screen-saver');
    splash.loadFile(SPLASH_HTML);
    splash.showInactive();
    state.splash = splash;
    return splash;
  } catch {
    return null;
  }
}

function revealBrowser() {
  const splash = state.splash;
  if (!splash || splash.isDestroyed()) {
    if (state.win && !state.win.isDestroyed() && !state.win.isVisible()) state.win.show();
    return;
  }
  try {
    splash.webContents.executeJavaScript('document.documentElement.classList.add("out")');
  } catch {}
  if (state.win && !state.win.isDestroyed() && !state.win.isVisible()) state.win.show();
  setTimeout(() => {
    if (!splash.isDestroyed()) splash.destroy();
    state.splash = null;
  }, 950);
}

function waitForFirstPaint() {
  const act = activeTab();
  let fired = false;
  const go = () => {
    if (fired) return;
    fired = true;
    clearTimeout(fallback);
    setTimeout(revealBrowser, 700);
  };
  const fallback = setTimeout(go, 4500);
  if (act) {
    act.wc.once('did-finish-load', go);
    act.wc.once('did-fail-load', () => go());
  } else {
    go();
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    frame: false,
    show: false,
    backgroundColor: resolvedTheme() === 'dark' ? '#17181c' : '#f5f5f7',
    icon: ICON_PNG,
    webPreferences: {
      preload: PRELOAD,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  state.win = win;

  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.on('resize', layout);
  win.on('maximize', () => win.webContents.send('win:maximized', true));
  win.on('unmaximize', () => win.webContents.send('win:maximized', false));
  win.on('enter-full-screen', () => win.webContents.send('win:maximized', true));
  win.on('leave-full-screen', () => win.webContents.send('win:maximized', false));
  win.on('closed', () => {
    saveTabsState();
    state.win = null;
    app.quit();
  });

  win.on('close', (e) => {
    if (settings().confirmCloseTabs && state.order.length > 1 && !state.closingConfirmed) {
      e.preventDefault();
      dialog
        .showMessageBox(win, {
          type: 'warning',
          title: 'Закрыть Nova Browser?',
          message: 'В браузере открыто вкладок: ' + state.order.length,
          detail: 'Все открытые вкладки будут закрыты.',
          buttons: ['Закрыть', 'Отмена'],
          defaultId: 0,
          cancelId: 1,
        })
        .then(({ response }) => {
          if (response === 0) {
            state.closingConfirmed = true;
            win.close();
          }
        });
    }
  });

  win.webContents.on('did-start-loading', () => {
    if (VERIFY) log('ui did-start-loading');
  });
  win.webContents.on('did-finish-load', () => {
    if (VERIFY) log('ui did-finish-load');
    pushTabs();
    pushData();
    pushTheme();
  });
  win.webContents.on('did-fail-load', (e, code, desc, url) => {
    if (VERIFY) log('ui did-fail-load ' + code + ' ' + desc + ' ' + url);
  });
  win.webContents.on('preload-error', (e, p, err) => {
    if (VERIFY) log('ui preload-error ' + p + ' :: ' + err);
  });
  win.webContents.on('render-process-gone', (e, d) => {
    if (VERIFY) log('ui render-process-gone ' + JSON.stringify(d));
  });
  win.webContents.on('console-message', (event) => {
    if (VERIFY) log('ui console: ' + (event && event.message));
  });

  win.loadFile(INDEX_HTML);
  if (!VERIFY) showSplash();
  win.once('ready-to-show', () => {
    if (VERIFY) log('ready-to-show fired');
    if (VERIFY) {
      win.show();
      createTab(VERIFY_URL);
      return;
    }
    const extUrl = argUrlFromArgs(process.argv);
    const saved = state.store.getTabsState();
    if (extUrl) {
      createTab(extUrl);
    } else if (settings().restoreTabs && saved.length) {
      if (VERIFY) log('restoring tabs: ' + saved.length);
      for (const u of saved) {
        createTab(typeof u === 'string' ? u : (u && u.url) || '', { silent: true, defer: true });
      }
      const last = state.order[state.order.length - 1];
      if (last !== undefined) activateTab(last);
    } else {
      createTab(settings().homePage);
    }
    waitForFirstPaint();
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    const u = argUrlFromArgs(commandLine);
    if (state.win) {
      if (state.win.isMinimized()) state.win.restore();
      state.win.focus();
      if (u) createTab(u);
    }
  });

  app.whenReady().then(() => {
    log('whenReady begin');
    app.setAppUserModelId('nova.browser');
    state.store = new Store(app.getPath('userData'));
    log('store ready');

    if (app.isPackaged && !VERIFY) {
      registerBrowser().then((ok) => log('registerBrowser: ' + ok));
    }

    session.defaultSession.setPermissionCheckHandler((wc, permission, requestingOrigin, details) => {
      if (permission !== 'media' && permission !== 'mediaKeySystem') return false;
      const domain = permissionDomain(details && details.requestingUrl, requestingOrigin);
      if (!domain) return false;
      return state.store.getPermission(domain, permissionKind(permission)) === 'allow';
    });
    session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
      if (permission !== 'media') {
        callback(false);
        return;
      }
      const domain = permissionDomain(details && details.requestingUrl, wc.getURL());
      const kind = 'media';
      if (!domain) {
        callback(false);
        return;
      }
      const saved = state.store.getPermission(domain, kind);
      if (saved) {
        callback(saved === 'allow');
        return;
      }
      const requestId = ++state.permSeq;
      const timer = setTimeout(() => {
        const rec = state.pendingPerm.get(requestId);
        if (rec && !rec.answered) {
          rec.answered = true;
          rec.callback(false);
          state.pendingPerm.delete(requestId);
        }
      }, 60000);
      state.pendingPerm.set(requestId, { callback, timer });
      if (state.win && !state.win.isDestroyed()) {
        state.win.webContents.send('permission:request', { requestId, domain, kind, permission });
      }
    });

    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = details.requestHeaders || {};
      const s = settings();
      if (s.doNotTrack) headers['DNT'] = '1';
      if (s.blockThirdPartyCookies && details.referrer && headers.Cookie) {
        try {
          const refOrigin = new URL(details.referrer).hostname;
          const reqHost = new URL(details.url).hostname;
          if (refOrigin !== reqHost) delete headers.Cookie;
        } catch {}
      }
      callback({ requestHeaders: headers });
    });

    if (VERIFY) log('step: will-download handler');
    session.defaultSession.on('will-download', (event, item) => {
      const start = () => {
        const id = ++state.dlSeq;
        let filename = path.basename(item.getFilename());
        const dlDir = settings().downloadDir || app.getPath('downloads');
        let filePath = path.join(dlDir, filename);
        const parsed = path.parse(filename);
        let n = 1;
        while (fs.existsSync(filePath)) {
          filePath = path.join(dlDir, `${parsed.name} (${n++})${parsed.ext}`);
        }
        item.setSavePath(filePath);
        const rec = { id, filename, filePath, receivedBytes: 0, totalBytes: 0, status: 'in-progress', item };
        state.downloads.set(id, rec);
        item.on('updated', (e, st) => {
          rec.receivedBytes = item.getReceivedBytes();
          rec.totalBytes = item.getTotalBytes() || 0;
          rec.status = st === 'interrupted' ? 'interrupted' : 'in-progress';
          pushDownloads();
        });
        item.once('done', (e, st) => {
          rec.status = st === 'completed' ? 'completed' : 'failed';
          rec.receivedBytes = item.getReceivedBytes();
          pushDownloads();
        });
        pushDownloads();
      };
      if (settings().downloadAsk) {
        event.preventDefault();
        dialog
          .showMessageBox(state.win, {
            type: 'question',
            title: 'Загрузка файла',
            message: 'Скачать файл?',
            detail: item.getFilename(),
            buttons: ['Скачать', 'Отмена'],
            defaultId: 0,
            cancelId: 1,
          })
          .then(({ response }) => {
            if (response === 0) {
              start();
              item.resume();
            } else {
              item.cancel();
            }
          });
      } else {
        start();
      }
    });

    nativeTheme.on('updated', () => pushTheme());

    if (VERIFY) log('step: setupIpc');
    setupIpc();
    if (VERIFY) log('step: buildMenu');
    buildMenu();
    if (VERIFY) log('step: createWindow');
    createWindow();
    if (VERIFY) log('step: createWindow done');
  });

  app.on('window-all-closed', () => app.quit());

  app.on('will-quit', () => {
    if (state.store && settings().clearOnExit) {
      try {
        state.store.clearHistory();
        session.defaultSession.clearCache();
      } catch {}
    }
  });
}