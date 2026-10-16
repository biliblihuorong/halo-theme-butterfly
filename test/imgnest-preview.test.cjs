const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function baseScript(preview = {}, href = 'https://blog.example.com/posts/a') {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src/html/views/config.html'), 'utf8');
  const source = /<script id="baseScript"[^>]*>([\s\S]*?)<\/script>/.exec(html)[1];
  const context = {
    window: {}, URL, location: new URL(href), localStorage: {getItem: () => null},
    document: {documentElement: {dataset: {}, classList: {add() {}, remove() {}}}},
  };
  vm.runInNewContext(source, context);
  Object.assign(context.window.MainApp.conf.preview, {enable: true, mode: 'imgnest', hosts: 'img.example.com'}, preview);
  return context.window.MainApp;
}

test('ImgNest rewrites actual image extensions to its one stored thumbnail', () => {
  const app = baseScript();
  for(const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'PNG', 'JpEg', 'WeBp']) {
    assert.equal(app.usePreview(`https://img.example.com/2026/a.${ext}`), 'https://img.example.com/2026/a_thumbs.webp');
  }
});

test('ImgNest preserves local storage and S3 path prefixes, encoded segments and fragments', () => {
  const app = baseScript();
  assert.equal(app.usePreview('https://img.example.com/i/12/2026/10/a.png#photo'), 'https://img.example.com/i/12/2026/10/a_thumbs.webp#photo');
  assert.equal(app.usePreview('https://img.example.com/bucket/prefix/%E4%B8%AD%E6%96%87/a%20b.png'), 'https://img.example.com/bucket/prefix/%E4%B8%AD%E6%96%87/a%20b_thumbs.webp');
  assert.equal(app.usePreview('https://img.example.com/2026/a.png#query?only=in-fragment'), 'https://img.example.com/2026/a_thumbs.webp#query?only=in-fragment');
});

test('ImgNest does not rewrite existing thumbnails or unsupported file paths', () => {
  const app = baseScript();
  for(const ending of ['a_thumbs.webp', 'A_THUMBS.WEBP', 'raw', 'a.svg', 'a.ico', 'a.webp/', 'a.png.txt', '']) {
    const src = `https://img.example.com/i/1/${ending}`;
    assert.equal(app.usePreview(src), src);
  }
});

test('ImgNest leaves all query-bearing links unchanged, including signed and empty queries', () => {
  const app = baseScript();
  for(const suffix of ['?X-Amz-Signature=secret', '?token=x#photo', '?w=800', '?v=1', '?']) {
    const src = `https://img.example.com/a.png${suffix}`;
    assert.equal(app.usePreview(src), src);
  }
});

test('ImgNest exact host matching rejects unrelated hosts, suffix attacks and ports', () => {
  const app = baseScript({hosts: 'https://img.example.com/\ncdn.example.com:8443'});
  for(const host of ['other.example.com', 'img.example.com.attacker.test', 'sub.img.example.com', 'img.example.com:8443', 'cdn.example.com']) {
    const src = `https://${host}/a.png`;
    assert.equal(app.usePreview(src), src);
  }
  assert.equal(app.usePreview('https://cdn.example.com:8443/a.png'), 'https://cdn.example.com:8443/a_thumbs.webp');
  assert.equal(app.usePreview('https://IMG.EXAMPLE.COM/a.png'), 'https://img.example.com/a_thumbs.webp');
});

test('ImgNest skips credentials, malformed URLs, non-HTTP protocols and inline sources', () => {
  const app = baseScript();
  for(const src of ['https://user:password@img.example.com/a.png', 'https://user@img.example.com/a.png', 'ftp://img.example.com/a.png', 'file://img.example.com/a.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'blob:https://img.example.com/a.png', 'https://[invalid/a.png']) {
    assert.equal(app.usePreview(src), src);
  }
  assert.equal(app.usePreview('http://img.example.com/a.png'), 'http://img.example.com/a_thumbs.webp');
});

test('ImgNest empty host list limits relative URLs to this site and can remain disabled', () => {
  const app = baseScript({hosts: ''});
  assert.equal(app.usePreview('/i/2/a.png'), 'https://blog.example.com/i/2/a_thumbs.webp');
  assert.equal(app.usePreview('https://img.example.com/a.png'), 'https://img.example.com/a.png');
  const disabled = baseScript({enable: false});
  assert.equal(disabled.usePreview('https://img.example.com/a.png'), 'https://img.example.com/a.png');
});
