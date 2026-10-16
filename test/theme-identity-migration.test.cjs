const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const yaml = require('js-yaml');
const {migrateDocument, parseInput, OLD_CONFIG_MAP, NEW_CONFIG_MAP} = require('../scripts/migrate-theme-identity.cjs');

const script = path.resolve(__dirname, '../scripts/migrate-theme-identity.cjs');
const oldPath = '/themes/theme-butterfly/assets/';
const newPath = '/themes/theme-butterfly-shell/assets/';
const run = (args, options = {}) => spawnSync(process.execPath, [script, ...args], {encoding: 'utf8', ...options});

function fixture(t, document, extension = 'json') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'butterfly-identity-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const input = path.join(directory, `input.${extension}`);
  const raw = extension === 'json' ? JSON.stringify(document) : yaml.dump(document);
  fs.writeFileSync(input, raw, {mode: 0o600});
  return {directory, input, raw};
}

const configMap = (data) => ({apiVersion: 'v1alpha1', kind: 'ConfigMap', metadata: {name: OLD_CONFIG_MAP}, data});

test('plain exported JSON keeps every group and value, changes only internal asset prefixes, and leaves input untouched', () => {
  const input = {
    loading: {source: {type: 'site', site: oldPath, custom: `https://cdn.example.com${oldPath}`}},
    index: {enable_above: false, above_background: oldPath + 'img/default-banner.png'},
    future: {zero: 0, empty: '', nil: null, array: [oldPath + 'a.png', false, 0, '']},
    topFalse: false, topZero: 0, topEmpty: '',
    links: {url: 'https://img.example.com/a.png', content: `<img src="${oldPath}a.png">`, relative: 'themes/theme-butterfly/assets/a.png'},
  };
  const before = JSON.stringify(input);
  const result = migrateDocument(input);
  assert.equal(JSON.stringify(input), before);
  assert.notEqual(result, input);
  assert.notEqual(result.future.array, input.future.array);
  assert.equal(result.loading.source.site, newPath);
  assert.equal(result.loading.source.custom, input.loading.source.custom);
  assert.equal(result.index.above_background, newPath + 'img/default-banner.png');
  assert.deepEqual(result.future, {zero: 0, empty: '', nil: null, array: [newPath + 'a.png', false, 0, '']});
  assert.equal(result.topFalse, false);
  assert.equal(result.topZero, 0);
  assert.equal(result.topEmpty, '');
  assert.deepEqual(result.links, input.links);
  assert.deepEqual(migrateDocument(result), result);
});

test('grouped ConfigMaps rebuild isolated metadata and preserve all valid JSON data groups', () => {
  const input = configMap({loading: JSON.stringify({source: {site: oldPath}}), future: '{"x":false,"n":0,"s":""}', scalar: 'false', empty: '""'});
  Object.assign(input.metadata, {version: 22, uid: 'old-uid', creationTimestamp: 'old', finalizers: ['old'], annotations: {token: 'private'}, labels: {other: 'old-owner'}});
  input.status = {old: true};
  const original = JSON.stringify(input);
  const result = migrateDocument(input);
  assert.equal(JSON.stringify(input), original);
  assert.deepEqual(Object.keys(result), ['apiVersion', 'kind', 'metadata', 'data']);
  assert.deepEqual(result.metadata, {name: NEW_CONFIG_MAP, labels: {'theme.halo.run/theme-name': 'theme-butterfly-shell'}});
  assert.equal(JSON.parse(result.data.loading).source.site, newPath);
  assert.deepEqual(JSON.parse(result.data.future), {x: false, n: 0, s: ''});
  assert.equal(JSON.parse(result.data.scalar), false);
  assert.equal(JSON.parse(result.data.empty), '');
  assert.deepEqual(migrateDocument(result), result);
});

test('legacy data.default remains a JSON string without dropping sibling groups', () => {
  const input = configMap({default: JSON.stringify({index: {above_background: oldPath + 'hero.png'}, unknown: [false, 0, '']}), other: '{"keep":true}'});
  const result = migrateDocument(input);
  assert.equal(JSON.parse(result.data.default).index.above_background, newPath + 'hero.png');
  assert.deepEqual(JSON.parse(result.data.default).unknown, [false, 0, '']);
  assert.deepEqual(JSON.parse(result.data.other), {keep: true});
});

test('unrelated resources, wrong ConfigMap identities and invalid data are rejected', () => {
  const invalid = [null, false, [], 'private', {kind: 'Setting', apiVersion: 'v1alpha1'},
    {...configMap({}), apiVersion: 'v2'},
    {...configMap({}), metadata: {name: 'other-config'}},
    {...configMap({}), metadata: {name: 'theme-butterfly-shell-configMap'}},
    {...configMap({}), data: []},
    configMap({unknown: 'not-json-private-secret'}), configMap({group: {object: true}}),
    configMap({default: 'null'}), configMap({default: '[]'}), configMap({group: ''}),
  ];
  for(const input of invalid) assert.throws(() => migrateDocument(input));
  const cycle = {}; cycle.self = cycle;
  assert.throws(() => migrateDocument(cycle), /JSON/);
  assert.throws(() => migrateDocument({date: new Date()}), /JSON/);
});

test('JSON key names cannot alter object prototypes', () => {
  const input = JSON.parse(`{"__proto__":{"asset":"${oldPath}x"},"constructor":{"prototype":{"safe":true}}}`);
  const result = migrateDocument(input);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(Object.hasOwn(result, '__proto__'), true);
  assert.equal(result.__proto__.asset, newPath + 'x');
  assert.equal({}.asset, undefined);
});

test('CLI emits plain JSON to stdout without extra schema fields or modifying input', (t) => {
  const {input, raw} = fixture(t, {loading: {source: {site: oldPath}}, unknown: false});
  const result = run([input]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), {loading: {source: {site: newPath}}, unknown: false});
  assert.equal(fs.readFileSync(input, 'utf8'), raw);
});

test('standalone CLI handles JSON without installing js-yaml or any other package', (t) => {
  const {directory, input} = fixture(t, {background: oldPath + 'a.png'});
  const copy = path.join(directory, 'migrate.cjs');
  fs.copyFileSync(script, copy);
  const result = spawnSync(process.execPath, [copy, input], {encoding: 'utf8', cwd: directory});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).background, newPath + 'a.png');
});

test('CLI round-trips full YAML and JSON ConfigMap exports with private output permissions', (t) => {
  for(const extension of ['json', 'yaml']) {
    const {directory, input, raw} = fixture(t, configMap({base: '{"zero":0}', loading: JSON.stringify({site: oldPath})}), extension);
    const output = path.join(directory, 'migrated.' + extension);
    const result = run([input, '-o', output]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    const migrated = extension === 'json' ? JSON.parse(fs.readFileSync(output, 'utf8')) : yaml.load(fs.readFileSync(output, 'utf8'));
    assert.equal(migrated.metadata.name, NEW_CONFIG_MAP);
    assert.equal(JSON.parse(migrated.data.loading).site, newPath);
    assert.equal(fs.statSync(output).mode & 0o777, 0o600);
    assert.equal(fs.readFileSync(input, 'utf8'), raw);
  }
});

test('CLI refuses same, existing, symlink and hardlink output paths without changing any file', (t) => {
  const {directory, input, raw} = fixture(t, {keep: 'private-value'});
  const existing = path.join(directory, 'existing.json');
  const symbolic = path.join(directory, 'symbolic.json');
  const hardlink = path.join(directory, 'hardlink.json');
  fs.writeFileSync(existing, 'do not overwrite');
  fs.symlinkSync(input, symbolic);
  fs.linkSync(input, hardlink);
  for(const output of [input, path.join(directory, '.', 'input.json'), existing, symbolic, hardlink]) {
    const result = run([input, '-o', output]);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /private-value/);
    assert.equal(fs.readFileSync(input, 'utf8'), raw);
    assert.equal(fs.readFileSync(existing, 'utf8'), 'do not overwrite');
  }
});

test('invalid inputs and arguments produce no migrated file and never echo private configuration', (t) => {
  const {directory, input} = fixture(t, configMap({group: 'private-secret-not-json'}));
  const output = path.join(directory, 'must-not-exist.json');
  for(const args of [[input, '-o', output], [input, '--in-place'], [input, '-o'], [input, '-o', output, '-o', output], [input, 'extra-file']]) {
    const result = run(args);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /private-secret/);
    assert.equal(fs.existsSync(output), false);
  }
  fs.writeFileSync(input, 'base: {secret: private-secret}\n');
  const result = run([input, '-o', output]);
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(output), false);
  assert.doesNotMatch(result.stderr, /private-secret/);
  assert.throws(() => parseInput('kind: ConfigMap\n---\nprivate-secret: value'), /解析/);
});
