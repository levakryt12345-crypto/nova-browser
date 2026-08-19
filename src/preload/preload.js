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
  'settings:reset',
  'app:choose-download-dir',
  'browser:register-default',
  'downloads:action',
  'downloads:clear',
  'win:minimize',
  'win:toggle-max',
  'win:close',
  'popover:show',
  'popover:hide',
  'app:open-data-folder',
  'permission:respond',
  'permission:get-all',
  'permission:set',
  'permission:clear',
  'permission:clear-all',
]);

const EVENT_CHANNELS = new Set([
  'tabs:changed',
  'data:changed',
  'downloads:changed',
  'theme:changed',
  'win:maximized',
  'flash:message',
  'cmd:focus-address',
  'permission:request',
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