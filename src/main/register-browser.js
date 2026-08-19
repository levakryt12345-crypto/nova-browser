'use strict';

const { execFile } = require('child_process');

let done = false;

function run(args) {
  return new Promise((resolve) => {
    execFile('reg', ['add', ...args], { windowsHide: true, timeout: 15000 }, (err) => {
      resolve(!err);
    });
  });
}

async function registerBrowser() {
  if (done) return true;
  const exe = process.execPath;
  const appName = 'Nova Browser';
  const progId = 'NovaBrowserHTML';
  const cl = 'HKCU\\Software\\Clients\\StartMenuInternet\\' + appName;
  const cmd = '"' + exe + '" "%1"';
  const icon = '"' + exe + ',0"';
  const desc = 'Быстрый и лёгкий браузер на базе Chromium';

  const cmds = [
    [cl, '/ve', '/d', appName, '/f'],
    [cl, '/v', 'LocalizedString', '/d', appName, '/f'],
    [cl, '/v', 'ApplicationDescription', '/d', desc, '/f'],
    [cl, '/v', 'ApplicationName', '/d', appName, '/f'],
    [cl + '\\Capabilities', '/v', 'ApplicationName', '/d', appName, '/f'],
    [cl + '\\Capabilities', '/v', 'ApplicationDescription', '/d', desc, '/f'],
    [cl + '\\Capabilities', '/v', 'ApplicationIcon', '/d', icon, '/f'],
    [cl + '\\Capabilities\\FileAssociations', '/v', '.htm', '/d', progId, '/f'],
    [cl + '\\Capabilities\\FileAssociations', '/v', '.html', '/d', progId, '/f'],
    [cl + '\\Capabilities\\URLAssociations', '/v', 'http', '/d', progId, '/f'],
    [cl + '\\Capabilities\\URLAssociations', '/v', 'https', '/d', progId, '/f'],
    [cl + '\\Capabilities\\URLAssociations', '/v', 'ftp', '/d', progId, '/f'],
    [cl + '\\Capabilities\\StartMenu', '/v', 'StartMenuInternet', '/d', appName, '/f'],
    [cl + '\\DefaultIcon', '/ve', '/d', icon, '/f'],
    [cl + '\\shell\\open\\command', '/ve', '/d', cmd, '/f'],
    ['HKCU\\Software\\RegisteredApplications', '/v', appName, '/d', cl + '\\Capabilities', '/f'],
    ['HKCU\\Software\\Classes\\' + progId, '/ve', '/d', 'Nova Browser Document', '/f'],
    ['HKCU\\Software\\Classes\\' + progId, '/v', 'FriendlyTypeName', '/d', 'HTML Document', '/f'],
    ['HKCU\\Software\\Classes\\' + progId + '\\DefaultIcon', '/ve', '/d', icon, '/f'],
    ['HKCU\\Software\\Classes\\' + progId + '\\shell\\open\\command', '/ve', '/d', cmd, '/f'],
    ['HKCU\\Software\\Classes\\' + progId + '\\Application', '/v', 'AppUserModelID', '/d', 'nova.browser', '/f'],
    ['HKCU\\Software\\Classes\\' + progId + '\\Application', '/v', 'ApplicationName', '/d', appName, '/f'],
    ['HKCU\\Software\\Classes\\' + progId + '\\Application', '/v', 'FriendlyAppName', '/d', appName, '/f'],
    ['HKCU\\Software\\Classes\\' + progId + '\\Application', '/v', 'ApplicationIcon', '/d', icon, '/f'],
    ['HKCU\\Software\\Classes\\http\\OpenWithProgids', '/v', progId, '/d', '', '/f'],
    ['HKCU\\Software\\Classes\\https\\OpenWithProgids', '/v', progId, '/d', '', '/f'],
    ['HKCU\\Software\\Classes\\.html\\OpenWithProgids', '/v', progId, '/d', '', '/f'],
    ['HKCU\\Software\\Classes\\.htm\\OpenWithProgids', '/v', progId, '/d', '', '/f'],
  ];

  const results = await Promise.all(cmds.map(run));
  done = results.every(Boolean);
  return done;
}

module.exports = { registerBrowser };