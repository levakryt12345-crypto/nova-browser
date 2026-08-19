'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const INVOKE_CHANNELS = new Set([
  'state:get',
  'tab:create',
  'tab:close',
  'tab:activate',
  'tab:go',
  'nav:do',
  'bookmark:add',
  'bookmark:remove',
  'history:clear',
  'history:remove',
  'settings:set',
  'downloads:action',
  'downloads:clear',
  'win:minimize',
  'win:toggle-max',
  'win:close',
  'popover:show',
  'popover:hide',
  'app:open-data-folder',
]);

const EVENT_CHANNELS = new Set([
  'tabs:changed',
  'data:changed',
  'downloads:changed',
  'theme:changed',
  'win:maximized',
  'flash:message',
  'cmd:focus-address',
]);

contextBridge.exposeInMainWorld('nova', {
  invoke: (channel, ...args) => {
    if (!INVOKE_CHANNELS.has(channel)) {
      return Promise.reject(new Error('IPC channel blocked: ' + channel));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel, callback) => {
    if (!EVENT_CHANNELS.has(channel)) return () => {};
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});