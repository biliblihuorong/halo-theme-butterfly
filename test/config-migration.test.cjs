const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const yaml = require('yamljs');
const {migrateConfig, migrateDocument} = require('../scripts/migrate-page-hero');

test('migration includes article hero and card style without changing the input', () => {
  const original = {post: {enable_above: false}, card: {radius: '15px', shadow: 'none'}, style: {mode: 'dark'}};
  const result = migrateConfig(original);
  assert.deepEqual(result.config, {page_hero: {post: {enable_above: false}}, style: {mode: 'dark', radius: '15px', shadow: 'none'}});
  assert.equal(original.post.enable_above, false);
  assert.equal(result.config.post, undefined);
});

test('partial migration fills missing fields and preserves new values, false and empty strings', () => {
  const result = migrateConfig({
    archives: {enable_above: true, above_background: 'old.jpg'},
    links: {footer_content: 'old notice', footer_content_type: 'markdown'},
    page_hero: {archives: {enable_above: false}, links: {footer_content: ''}},
  });
  assert.deepEqual(result.config.page_hero.archives, {enable_above: false, above_background: 'old.jpg'});
  assert.equal(result.config.page_hero.links.footer_content, '');
  assert.equal(result.config.page_hero.links.footer_content_type, 'markdown');
  assert.equal(migrateConfig(result.config).skipped, true);
});

test('grouped ConfigMaps migrate and preserve unrelated raw values', () => {
  const result = migrateDocument({kind: 'ConfigMap', metadata: {name: 'theme-butterfly-configMap'}, data: {
    post: JSON.stringify({enable_above: false}), card: JSON.stringify({radius: '12px'}),
    style: JSON.stringify({mode: 'user'}), base: 'unrelated raw data',
  }});
  assert.equal(JSON.parse(result.doc.data.page_hero).post.enable_above, false);
  assert.equal(JSON.parse(result.doc.data.style).radius, '12px');
  assert.equal(result.doc.data.base, 'unrelated raw data');
  assert.equal(result.doc.data.post, undefined);
});

test('legacy data.default remains a JSON string and migration is idempotent', () => {
  const first = migrateDocument({kind: 'ConfigMap', data: {default: JSON.stringify({post: {enable_above: false}})}});
  assert.equal(JSON.parse(first.doc.data.default).page_hero.post.enable_above, false);
  assert.deepEqual(migrateDocument(first.doc).doc, first.doc);
});

test('invalid structures and JSON are rejected before overwriting anything', () => {
  assert.throws(() => migrateConfig({page_hero: 'invalid', post: {}}));
  assert.throws(() => migrateDocument({kind: 'Setting', data: {}}));
  assert.throws(() => migrateDocument({kind: 'ConfigMap', data: {post: 'not JSON'}}));
});

test('CLI output stays valid YAML when there is nothing left to migrate', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'butterfly-migration-'));
  const input = path.join(dir, 'config.yaml');
  const original = {kind: 'ConfigMap', data: {page_hero: JSON.stringify({post: {enable_above: false}})}};
  fs.writeFileSync(input, yaml.stringify(original, 4, 2));
  const output = execFileSync(process.execPath, [path.join(__dirname, '../scripts/migrate-page-hero.js'), input], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  assert.deepEqual(yaml.parse(output), original);
});
