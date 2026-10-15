const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {buildBundle, writePrism, COMPONENTS_DIR} = require('../scripts/build-prism.cjs');

function run(src = 'https://blog.example.com/themes/theme-butterfly/assets/plugins/prism/prism.min.js?v=1') {
  const document = {
    currentScript: {src}, readyState: 'complete', addEventListener() {}, querySelectorAll: () => [],
    getElementsByTagName: () => [], createElement: () => ({}),
  };
  const context = {document, setTimeout, requestAnimationFrame() {}, addEventListener() {}};
  context.window = context.self = context;
  vm.runInNewContext(buildBundle(), context);
  return context.Prism;
}

test('bundle stays in manual mode so it never scans the whole page', () => {
  assert.equal(run().manual, true);
});

test('autoloader loads versioned language files next to the bundle', () => {
  const {autoloader} = run().plugins;
  assert.equal(autoloader.languages_path, `https://blog.example.com/themes/theme-butterfly/assets/plugins/prism/${COMPONENTS_DIR}/`);
  assert.ok(autoloader.known.includes('yaml') && autoloader.known.includes('yml') && !autoloader.known.includes('env'));
});

test('bundle keeps the plugins the theme toolbar relies on', () => {
  const Prism = run();
  for (const name of ['lineNumbers', 'customClass', 'toolbar', 'autoloader']) assert.ok(Prism.plugins[name], name);
  for (const lang of ['markup', 'css', 'javascript']) assert.ok(Prism.languages[lang], lang);
});

test('writePrism outputs the bundle and every language file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-'));
  writePrism(dir);
  assert.ok(fs.existsSync(path.join(dir, 'prism.min.js')));
  assert.ok(fs.existsSync(path.join(dir, COMPONENTS_DIR, 'prism-yaml.min.js')));
  assert.ok(!fs.existsSync(path.join(dir, COMPONENTS_DIR, 'prism-core.min.js')));
  fs.rmSync(dir, {recursive: true});
});
