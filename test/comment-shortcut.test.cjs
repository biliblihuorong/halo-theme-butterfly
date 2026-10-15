const assert = require('node:assert/strict');
const test = require('node:test');
const {load} = require('../test-support/load.cjs');

function fixture({provider = 'none', clientReady = false, reducedMotion = false, widget = true} = {}) {
  const clicks = [];
  const scrolls = [];
  const appended = [];
  const observers = [];
  const timers = [];
  const initializations = [];
  const button = {
    hidden: true,
    addEventListener(name, callback) {
      if(name === 'click') clicks.push(callback);
    },
  };
  const target = {
    id: provider === 'artalk' ? 'artalk' : (widget ? '' : 'comment-content-halo-run-Post-test'),
    dataset: {js: '/artalk.js', css: '/artalk.css'},
    scrollIntoView: (options) => scrolls.push(options),
  };
  const client = {init(options) {
    initializations.push(options);
    return {setDarkMode() {}};
  }};
  const window = {
    ...(provider === 'artalk' ? {ArtalkConfig: {pageKey: '/post/test', server: 'https://comments.example.com'}} : {}),
    ...(clientReady ? {Artalk: client} : {}),
  };
  const MainApp = {modules: {}, useTheme: {change() {}}};
  const document = {
    documentElement: {dataset: {colorScheme: 'light'}},
    getElementById: (id) => provider === 'artalk' && id === 'artalk' ? target : null,
    querySelector(selector) {
      if(selector === '.comment-shortcut') return button;
      if(provider === 'halo' && (widget ? selector.includes('comment-widget') : selector.includes('[id^="comment-content-halo-run-"]'))) return target;
      return null;
    },
    createElement: (tag) => ({tag}),
    head: {appendChild: (node) => appended.push(node)},
  };
  const globals = {
    document, window, MainApp,
    location: {pathname: '/post/test', hash: '#atk-comment-previous'},
    useScrollBehavior: () => reducedMotion ? 'auto' : 'smooth',
    setTimeout: (callback) => timers.push(callback),
    IntersectionObserver: class {
      constructor(callback) {
        this.entry = {callback, disconnected: false};
        observers.push(this.entry);
      }
      observe() {}
      disconnect() {this.entry.disconnected = true;}
    },
  };
  // 普通访问保留滚动懒加载；点击按钮也不得改写现有评论锚点。
  globals.location.hash = '#existing-bookmark';
  const {CommentShortcut} = load('src/js/modules/CommentShortcut.js', ['CommentShortcut'], globals);
  const {ArtalkComment} = load('src/js/modules/ArtalkComment.js', ['ArtalkComment'], globals);
  return {CommentShortcut, ArtalkComment, MainApp, window, client, document, button, clicks, scrolls, appended, observers, timers, initializations, location: globals.location};
}

test('pages without an available comment area keep the shortcut hidden', () => {
  const f = fixture();
  new f.CommentShortcut();
  assert.equal(f.button.hidden, true);
  assert.equal(f.clicks.length, 0);
});

test('an Artalk-looking element without enabled comment configuration stays hidden', () => {
  const f = fixture({provider: 'artalk'});
  delete f.window.ArtalkConfig;
  new f.CommentShortcut();
  assert.equal(f.button.hidden, true);
  assert.equal(f.clicks.length, 0);
});

for(const widget of [true, false]) {
  test(`Halo ${widget ? 'rendered widget' : 'server container before widget mounting'} can be reached without Artalk`, () => {
    const f = fixture({provider: 'halo', widget});
    new f.CommentShortcut();
    assert.equal(f.button.hidden, false);
    f.clicks[0]();
    assert.equal(f.scrolls[0].behavior, 'smooth');
    assert.equal(f.scrolls[0].block, 'start');
    assert.equal(f.appended.length, 0);
    assert.equal(f.location.hash, '#existing-bookmark');
  });
}

test('the shortcut respects reduced motion when scrolling', () => {
  const f = fixture({provider: 'halo', reducedMotion: true});
  new f.CommentShortcut();
  f.clicks[0]();
  assert.equal(f.scrolls[0].behavior, 'auto');
});

test('clicking before lazy loading immediately starts Artalk; repeated clicks and intersection initialize once', () => {
  const f = fixture({provider: 'artalk'});
  // App can register the shortcut before the page-specific Artalk module.
  new f.CommentShortcut();
  f.MainApp.modules.artalkComment = new f.ArtalkComment();
  assert.equal(f.button.hidden, false);
  assert.equal(f.appended.length, 0);
  f.clicks[0]();
  f.clicks[0]();
  f.observers[0].callback([{isIntersecting: true}]);
  assert.equal(f.observers[0].disconnected, true);
  assert.deepEqual(f.appended.map((node) => node.href || node.src), ['/artalk.css', '/artalk.js']);
  assert.equal(f.timers.length, 1);
  assert.equal(f.scrolls.length, 2);

  f.window.Artalk = f.client;
  f.appended[1].onload();
  f.clicks[0]();
  f.observers[0].callback([{isIntersecting: true}]);
  f.timers.shift()();
  assert.equal(f.initializations.length, 1);
  assert.equal(f.appended.length, 2);
  assert.equal(f.location.hash, '#existing-bookmark');
});

test('clicking after scroll loading uses the initialized comment area', () => {
  const f = fixture({provider: 'artalk', clientReady: true});
  f.MainApp.modules.artalkComment = new f.ArtalkComment();
  new f.CommentShortcut();
  f.observers[0].callback([{isIntersecting: true}]);
  f.clicks[0]();
  assert.equal(f.initializations.length, 1);
  assert.equal(f.appended.length, 1);
  assert.equal(f.scrolls.length, 1);
});
