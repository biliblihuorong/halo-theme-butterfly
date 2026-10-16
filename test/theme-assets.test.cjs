const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const {load} = require('../test-support/load.cjs');
const {buildBundle, COMPONENTS_DIR} = require('../scripts/build-prism.cjs');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const settle = () => new Promise((resolve) => setImmediate(resolve));
const legacyBanner = '/themes/theme-butterfly/assets/img/default-banner.png';

// 执行实际 head 脚本，验证预加载和后续 Common 读取的是同一个归一化配置。
function preload(conf) {
  const {document} = parseHTML('<!doctype html><html><head></head><body></body></html>');
  const script = [...read('src/html/views/layout.html').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1]).find((source) => source.includes('(function (conf)'));
  assert.ok(script);
  const app = {conf: {enable_above: true, ...conf}, usePreview: (src) => src};
  vm.runInNewContext(script, {document, window: {MainApp: app}});
  return {conf: app.conf, links: document.head.querySelectorAll('link')};
}

test('an imported default banner follows the current theme directory before preloading', () => {
  for(const themeName of ['theme-butterfly-shell', 'theme-another-installation']) {
    const assets_site = `/themes/${themeName}/assets/`;
    const f = preload({assets_site, assets_link: 'https://cdn.example.com/custom/', above_background: legacyBanner});
    const expected = `${assets_site}img/default-banner.png`;
    assert.equal(f.conf.above_background, expected);
    assert.equal(f.links.length, 1);
    assert.equal(f.links[0].getAttribute('href'), expected);
    assert.equal(f.links[0].getAttribute('fetchpriority'), 'high');
    assert.equal(f.conf.assets_link, 'https://cdn.example.com/custom/');
  }
});

test('custom backgrounds, CDN URLs and nondefault local paths are preserved exactly', () => {
  for(const src of [
    'https://images.example.com/themes/theme-butterfly/assets/img/default-banner.png',
    'https://cdn.example.com/banner.webp',
    '/upload/custom-banner.png',
    `${legacyBanner}?custom=1`,
    '/themes/theme-butterfly/assets/img/another-banner.png',
  ]) {
    const f = preload({assets_site: '/themes/theme-butterfly-shell/assets/', above_background: src});
    assert.equal(f.conf.above_background, src);
    assert.equal(f.links[0].getAttribute('href'), src);
  }
});

test('disabled heroes normalize imported defaults without preloading; random images still skip preloading', () => {
  const disabled = preload({enable_above: false, assets_site: '/themes/theme-butterfly-shell/assets/', above_background: legacyBanner});
  assert.equal(disabled.conf.above_background, '/themes/theme-butterfly-shell/assets/img/default-banner.png');
  assert.equal(disabled.links.length, 0);
  const random = preload({above_background: 'https://api.example.com/random', random_link: 'https://api.example.com/random'});
  assert.equal(random.links.length, 0);
});

function codeResources(configuration) {
  const {document, window} = parseHTML('<!doctype html><html><head></head><body><article class="render"><pre><code class="language-yaml">value: true</code></pre></article></body></html>');
  const conf = {enable_code: true, code_theme_light: 'one-light', code_theme_dark: 'one-dark', theme_version: '2.3.4', ...configuration};
  const {codeBlock} = load('src/js/modules/CodeBlock.js', ['codeBlock'], {
    document, window,
    MainApp: {conf, attrs: {}, useTheme: {getMode: () => 'light', change() {}}},
    Clipboard: class {}, useInsertStyle() {}, useToBool: Boolean,
    setTimeout: () => 1, clearTimeout() {}, console: {warn() {}},
  });
  new codeBlock();
  const script = document.head.querySelector('script');
  // 不发网络请求，测试结束时进入已存在的失败回退分支。
  script.onerror();
  return {script, links: [...document.head.querySelectorAll('link')]};
}

function languagePath(src) {
  const document = {
    currentScript: {src}, readyState: 'complete', addEventListener() {}, querySelectorAll: () => [],
    getElementsByTagName: () => [], createElement: () => ({}),
  };
  const context = {document, setTimeout, requestAnimationFrame() {}, addEventListener() {}};
  context.window = context.self = context;
  vm.runInNewContext(buildBundle(), context);
  return context.Prism.plugins.autoloader.languages_path;
}

test('Prism CSS, script and language files follow dynamic theme IDs and configured resource roots', async () => {
  const scenarios = [
    [{theme_name: 'theme-butterfly-shell'}, '/themes/theme-butterfly-shell/assets/'],
    [{theme_name: 'theme-another-installation'}, '/themes/theme-another-installation/assets/'],
    [{theme_name: 'theme-another-installation', assets_site: '/blog/themes/theme-another-installation/assets/'}, '/blog/themes/theme-another-installation/assets/'],
    [{theme_name: 'theme-butterfly-shell', assets_link: '/custom-static/butterfly/'}, '/custom-static/butterfly/'],
    [{theme_name: 'theme-butterfly-shell', assets_site: '/themes/theme-butterfly-shell/assets/', assets_link: 'https://cdn.example.com/halo-theme-butterfly/assets/'}, 'https://cdn.example.com/halo-theme-butterfly/assets/'],
  ];
  for(const [conf, assets] of scenarios) {
    const f = codeResources(conf);
    const base = `${assets}plugins/prism/`;
    assert.equal(f.script.getAttribute('src'), `${base}prism.min.js?v=2.3.4`);
    assert.deepEqual(f.links.map((link) => link.getAttribute('href')), [
      `${base}themes/prism-one-light.css?v=2.3.4`,
      `${base}themes/prism-one-dark.css?v=2.3.4`,
      `${base}prism.min.css?v=2.3.4`,
    ]);
    const scriptUrl = new URL(f.script.getAttribute('src'), 'https://blog.example.com');
    assert.equal(languagePath(scriptUrl.href), new URL(`${COMPONENTS_DIR}/`, scriptUrl).href);
  }
  await settle();
});

test('cursor files resolve beside the stylesheet under either a renamed theme or custom CDN', () => {
  const css = read('src/plugins/cursor/simple.min.css');
  const resources = [...css.matchAll(/url\(([^)]+)\)/g)].map((match) => match[1]);
  assert.equal(resources.length, 2);
  for(const cssUrl of [
    'https://blog.example.com/themes/theme-butterfly-shell/assets/plugins/cursor/simple.min.css?v=2.3.4',
    'https://cdn.example.com/custom/assets/plugins/cursor/simple.min.css?v=2.3.4',
  ]) {
    for(const resource of resources) {
      assert.ok(fs.existsSync(path.join(__dirname, '../src/plugins/cursor', resource)));
      const resolved = new URL(resource, cssUrl);
      const root = new URL('./', cssUrl);
      assert.equal(resolved.href, `${root.href}${resource.replace(/^\.\//, '')}`);
    }
  }
});
