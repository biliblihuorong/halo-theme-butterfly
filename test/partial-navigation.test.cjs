const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {load} = require('../test-support/load.cjs');

const {shouldHandle} = load('src/js/modules/PartialNavigation.js', ['shouldHandle']);

const event = {button: 0, defaultPrevented: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false};
const link = {origin: 'https://example.com', target: '', hasAttribute: () => false};

assert.equal(shouldHandle(event, link, 'https://example.com'), true);
assert.equal(shouldHandle({...event, ctrlKey: true}, link, 'https://example.com'), false);
assert.equal(shouldHandle(event, {...link, origin: 'https://other.example'}, 'https://example.com'), false);

// webpack 会把注入了 babel runtime helper 的文件当作 ES 模块，混用 module.exports 会在运行时抛错。
const jsRoot = path.join(__dirname, '..', 'src/js');
for (const dir of fs.readdirSync(jsRoot)) {
  for (const file of fs.readdirSync(path.join(jsRoot, dir)).filter((name) => name.endsWith('.js'))) {
    const source = fs.readFileSync(path.join(jsRoot, dir, file), 'utf8');
    assert.doesNotMatch(source, /\bmodule\.exports\b|\bexports\.\w+\s*=/, `${dir}/${file} must use ESM exports`);
  }
}
