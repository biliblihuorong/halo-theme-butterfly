const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const version = JSON.parse(read('package.json')).version;
assert.match(version, /^\d+\.\d+\.\d+$/);
const theme = yaml.load(read('theme.yaml'));
assert.equal(theme.spec.version, version, 'package.json and theme.yaml versions differ');
assert.equal(theme.metadata.name, 'theme-butterfly-shell', 'The fork must use its independent Halo theme identity');
assert.equal(theme.spec.settingName, `${theme.metadata.name}-setting`);
assert.equal(theme.spec.configMapName, `${theme.metadata.name}-configmap`);
assert.equal(yaml.load(read('settings.yaml')).metadata.name, theme.spec.settingName, 'Setting resource identity differs from theme metadata');
for (const resource of yaml.loadAll(read('annotation-setting.yaml'))) {
  assert.ok(resource.metadata.name?.startsWith(`${theme.metadata.name}-`), 'Theme annotations must use stable names owned by this fork');
  assert.ok(!resource.metadata.generateName, 'Theme annotations must not be regenerated on reload');
}
assert.ok(theme.spec.homepage && theme.spec.issues && theme.spec.license?.length, 'Missing application-market metadata');
if (process.env.GITHUB_REF?.startsWith('refs/tags/')) {
  assert.equal(process.env.GITHUB_REF, `refs/tags/v${version}`, 'Release tag does not match the package');
}

const builtJs = path.join(root, 'templates/assets/js');
const chunks = fs.readdirSync(builtJs).filter((name) => name.endsWith('.chunk.min.js'));
assert.ok(chunks.length > 0, 'Missing asynchronous chart bundle');
chunks.forEach((name) => assert.match(name, /\.[a-f0-9]{12}\.chunk\.min\.js$/, 'Asynchronous assets must have content hashes'));
assert.ok(read('templates/views/render-config.html').includes('enable_code_copy'), 'Missing shared page rendering configuration');
assert.ok(!read('templates/views/layout.html').includes('rel="canonical"'), 'Theme still duplicates canonical metadata');

const context = {
  console, URL, TextEncoder, TextDecoder, performance: {now: () => 0}, navigator: {userAgent: 'release-check'},
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  document: {createElement: () => ({style: {}, setAttribute() {}}), querySelector: () => null, documentElement: {style: {}}},
};
context.window = context; context.self = context; context.globalThis = context;
vm.runInNewContext(read('templates/assets/plugins/artalk/Artalk.min.js'), context, {timeout: 5000});
assert.equal(typeof context.Artalk?.init, 'function', 'Built Artalk lost its browser export');

function walk(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const files = [...walk(path.join(root, 'templates')), ...['theme.yaml', 'settings.yaml', 'annotation-setting.yaml', 'LICENSE'].map((file) => path.join(root, file))];
const assets = files.map((file) => ({
  path: path.relative(root, file).replace(/\\/g, '/'),
  bytes: fs.statSync(file).size,
  sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
})).sort((a, b) => a.path.localeCompare(b.path));
const zip = 'theme-butterfly-dist.zip';
const zipData = fs.readFileSync(path.join(root, zip));
assert.ok(zipData.length > 1000 && zipData.subarray(0, 2).toString() === 'PK', 'Missing or invalid release ZIP');
const zipHash = crypto.createHash('sha256').update(zipData).digest('hex');
let sourceCommit = null;
try {sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();} catch {}
const manifest = {version, sourceCommit, generatedAt: new Date().toISOString(), zip: {name: zip, bytes: zipData.length, sha256: zipHash}, assets};
fs.writeFileSync(path.join(root, `${zip}.sha256`), `${zipHash}  ${zip}\n`);
fs.writeFileSync(path.join(root, `${zip}.manifest.json`), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({version, sourceCommit, assets: assets.length, zipBytes: zipData.length, sha256: zipHash, browserArtalkExport: true, hashedChunks: chunks}));
