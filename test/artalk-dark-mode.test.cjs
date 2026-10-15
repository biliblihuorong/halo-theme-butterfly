const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function fixture(initialMode = 'light', clientReady = true) {
  const el = {dataset: {}};
  const document = {
    documentElement: {dataset: {}, classList: {add() {}, remove() {}}},
    getElementById: () => el,
  };
  const storage = new Map();
  const MainApp = {conf: {style_mode: initialMode}};
  const modes = [];
  const initializations = [];
  const timers = [];
  const client = {
    init(options) {
      initializations.push(options);
      return {setDarkMode: (dark) => modes.push(dark)};
    },
  };
  const window = {
    ArtalkConfig: {pageKey: '/post/test', server: 'https://comments.example.com'},
    Artalk: clientReady ? client : undefined,
  };
  const context = vm.createContext({
    document,
    MainApp,
    window,
    localStorage: {getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value)},
    location: {pathname: '/post/test'},
    setTimeout: (callback) => timers.push(callback),
    console,
  });

  function load(file, className) {
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', file), 'utf8')
      .replace(/^import .*;\r?\n/gm, '')
      .replace('export default class', 'class');
    return vm.runInContext(`${source}\n${className}`, context);
  }

  const Theme = load('core/theme.js', 'Theme');
  MainApp.useTheme = new Theme();
  const ArtalkComment = load('modules/ArtalkComment.js', 'ArtalkComment');
  return {theme: MainApp.useTheme, ArtalkComment, modes, initializations, timers, window, client};
}

test('Artalk follows repeated theme switches without reinitializing comments', () => {
  const f = fixture();
  new f.ArtalkComment();
  assert.equal(f.initializations[0].darkMode, false);
  f.theme.toggleMode();
  f.theme.toggleMode();
  f.theme.toggleMode();
  assert.deepEqual(f.modes, [true, false, true]);
  assert.equal(f.initializations.length, 1);
});

test('Artalk starts dark when the page starts dark and can return to light', () => {
  const f = fixture('dark');
  new f.ArtalkComment();
  assert.equal(f.initializations[0].darkMode, true);
  f.theme.toggleMode();
  assert.deepEqual(f.modes, [false]);
});

for (const codeRegistersFirst of [true, false]) {
  test(`comments and code highlighting both update when code registers ${codeRegistersFirst ? 'first' : 'last'}`, () => {
    const f = fixture();
    const codeModes = [];
    const registerCode = () => f.theme.change((mode) => codeModes.push(mode));
    if (codeRegistersFirst) registerCode();
    new f.ArtalkComment();
    if (!codeRegistersFirst) registerCode();
    f.theme.setMode('dark');
    f.theme.setMode('light');
    assert.deepEqual(f.modes, [true, false]);
    assert.deepEqual(codeModes, ['dark', 'light']);
  });
}

test('Artalk loading late uses the current theme and follows later switches', () => {
  const f = fixture('light', false);
  new f.ArtalkComment();
  f.theme.setMode('dark');
  f.window.Artalk = f.client;
  f.timers.shift()();
  assert.equal(f.initializations[0].darkMode, true);
  f.theme.setMode('light');
  assert.deepEqual(f.modes, [false]);
});
