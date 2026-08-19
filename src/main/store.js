'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = {
  homePage: 'https://www.google.com',
  searchEngine: 'google',
  theme: 'system',
};

class Store {
  constructor(dir) {
    this.dir = dir;
    this.settings = this._load('settings.json', DEFAULT_SETTINGS);
    this.bookmarks = this._load('bookmarks.json', []);
    this.history = this._load('history.json', []);
    if (!Array.isArray(this.bookmarks)) this.bookmarks = [];
    if (!Array.isArray(this.history)) this.history = [];
  }

  _load(name, fallback) {
    try {
      const raw = fs.readFileSync(path.join(this.dir, name), 'utf8');
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  _save(name, data) {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const file = path.join(this.dir, name);
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmp, file);
    } catch (err) {
      console.error('Store save failed:', name, err);
    }
  }

  getSettings() {
    return { ...DEFAULT_SETTINGS, ...this.settings };
  }

  setSettings(partial) {
    this.settings = { ...this.getSettings(), ...partial };
    this._save('settings.json', this.settings);
    return this.settings;
  }

  getBookmarks() {
    return this.bookmarks;
  }

  addBookmark({ url, title }) {
    const existing = this.bookmarks.find((b) => b.url === url);
    if (existing) return { added: false, id: existing.id };
    const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), url, title: title || url, time: Date.now() };
    this.bookmarks.unshift(rec);
    if (this.bookmarks.length > 500) this.bookmarks = this.bookmarks.slice(0, 500);
    this._save('bookmarks.json', this.bookmarks);
    return { added: true, id: rec.id };
  }

  removeBookmark(id) {
    this.bookmarks = this.bookmarks.filter((b) => b.id !== id);
    this._save('bookmarks.json', this.bookmarks);
  }

  getHistory() {
    return this.history;
  }

  addHistory({ url, title }) {
    const last = this.history[0];
    if (last && last.url === url) {
      last.time = Date.now();
      this._save('history.json', this.history);
      return;
    }
    this.history.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), url, title: title || url, time: Date.now() });
    if (this.history.length > 2000) this.history = this.history.slice(0, 2000);
    this._save('history.json', this.history);
  }

  removeHistory(id) {
    this.history = this.history.filter((h) => h.id !== id);
    this._save('history.json', this.history);
  }

  clearHistory() {
    this.history = [];
    this._save('history.json', this.history);
  }
}

module.exports = Store;