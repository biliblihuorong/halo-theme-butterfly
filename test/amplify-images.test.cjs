const assert = require('node:assert/strict');
const test = require('node:test');
const {parseHTML} = require('linkedom');
const {load} = require('../test-support/load.cjs');

const settle = () => new Promise((resolve) => setImmediate(resolve));

function fixture(content = '', loader) {
  const {document} = parseHTML(`<!doctype html><html><head></head><body>${content}</body></html>`);
  const bindings = [];
  const warnings = [];
  let loads = 0;
  const {AmplifyImg} = load('src/js/modules/AmplifyImg.js', ['AmplifyImg'], {
    document,
    console: {warn: (...args) => warnings.push(args)},
    useInsertStyle(css) {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    },
  });
  const instance = new AmplifyImg(() => {
    loads++;
    if(loader) return loader();
    return Promise.resolve([
      {Fancybox: {bind: (...args) => bindings.push(args)}},
      {default: {toString: () => '.fancybox-test { display: block; }'}},
    ]);
  });
  return {instance, document, bindings, warnings, get loads() {return loads;}};
}

test('pages without content images do not load the lightbox or inject its CSS', async () => {
  const f = fixture('<main class="main"><div class="content"><p>文章正文</p></div><aside><img src="/avatar.jpg"></aside></main>');
  await settle();
  assert.equal(f.loads, 0);
  assert.equal(f.document.head.querySelector('style'), null);
  assert.equal(f.document.querySelector('[data-fancybox]'), null);
  assert.equal(f.bindings.length, 0);
});

test('content images load the lightbox and retain its toolbar and original-image links', async () => {
  const f = fixture(`<main class="main"><div class="content">
    <img id="preview" src="/preview.jpg" data-origin="/original.jpg">
    <img id="original" src="/ordinary.jpg">
    </div><aside><img id="avatar" src="/avatar.jpg"></aside></main>`);
  assert.equal(f.loads, 1);
  assert.equal(f.document.head.querySelector('style'), null, 'CSS waits for the asynchronous modules');
  await settle();
  assert.equal(f.document.head.querySelectorAll('style').length, 1);
  assert.match(f.document.head.querySelector('style').textContent, /fancybox-test/);
  const preview = f.document.getElementById('preview');
  const original = f.document.getElementById('original');
  assert.equal(preview.getAttribute('src'), '/preview.jpg');
  assert.equal(preview.parentNode.getAttribute('href'), '/original.jpg');
  assert.equal(original.parentNode.getAttribute('href'), '/ordinary.jpg');
  assert.equal(f.document.querySelectorAll('span[data-fancybox="fancyBoxImg"]').length, 2);
  assert.equal(f.document.getElementById('avatar').parentNode.tagName, 'ASIDE');
  assert.equal(f.bindings.length, 1);
  assert.equal(f.bindings[0][0], '[data-fancybox="fancyBoxImg"]');
  const display = f.bindings[0][1].Toolbar.display;
  assert.deepEqual(Array.from(display.left), ['infobar']);
  assert.deepEqual(Array.from(display.middle), ['zoomIn', 'zoomOut', 'toggle1to1', 'rotateCCW', 'rotateCW', 'flipX', 'flipY']);
  assert.deepEqual(Array.from(display.right), ['slideshow', 'thumbs', 'close']);
});

for(const mode of ['reject', 'throw']) {
  test(`a loader ${mode} is handled without wrapping images or injecting CSS`, async () => {
    const f = fixture('<main class="main"><div class="content"><img src="/image.jpg"></div></main>', () => {
      if(mode === 'throw') throw new Error('lightbox chunk unavailable');
      return Promise.reject(new Error('lightbox chunk unavailable'));
    });
    await settle();
    assert.equal(f.loads, 1);
    assert.equal(f.warnings.length, 1);
    assert.equal(f.document.head.querySelector('style'), null);
    assert.equal(f.document.querySelector('[data-fancybox]'), null);
    assert.equal(f.document.querySelector('img').getAttribute('src'), '/image.jpg');
    assert.equal(f.bindings.length, 0);
  });
}
