const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {parseHTML} = require('linkedom');
const {load} = require('../test-support/load.cjs');

// 执行生产环境相同的词库入口，不用残缺字符表模拟 OpenCC。
const converterSource = fs.readFileSync(path.join(__dirname, '../src/js/modules/chinese-converter.js'), 'utf8')
  .replace(/from '([^']+)'/g, (_, module) => `from '${pathToFileURL(require.resolve(module)).href}'`);
const converterReady = import(`data:text/javascript;base64,${Buffer.from(converterSource).toString('base64')}`).then((module) => module.default);
const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

async function fixture(content = '', {storage, loader, lang = 'zh-CN'} = {}) {
  const convert = await converterReady;
  const {window, document} = parseHTML(`<!doctype html><html lang="${lang}"><head><title>简体标题</title></head><body>
    <button class="button script-toggle"><span class="script-label" translate="no">繁</span></button>${content}
    </body></html>`);
  let loads = 0, conversions = 0;
  const preferences = new Map();
  const warnings = [];
  const {ChineseConversion} = load('src/js/modules/ChineseConversion.js', ['ChineseConversion'], {
    document, window, location: new URL('https://example.com/post'), MutationObserver: window.MutationObserver,
    localStorage: storage || {getItem: (key) => preferences.get(key), setItem: (key, value) => preferences.set(key, value)},
    console: {warn: (...args) => warnings.push(args)},
  });
  const instance = new ChineseConversion(async () => {
    loads++;
    const converter = loader ? await loader(loads, convert) : convert;
    return {default(text) {conversions++; return converter(text);}};
  });
  return {instance, document, window, preferences, warnings, button: document.querySelector('.script-toggle'),
    get loads() {return loads;}, get conversions() {return conversions;}};
}

test('real OpenCC dictionaries disambiguate phrases and restore exact mixed original text', async () => {
  const original = '头发发展，皇后和后来，干杯与干部；鼠标、软件、硅，既有異體字。';
  const f = await fixture(`<p id="text" title="阅读文章" aria-label="查看正文">${original}</p><img alt="图片说明"><p id="rare">𠀾</p>`);
  assert.equal(f.loads, 0, 'the default page must not load dictionaries');
  f.button.dispatchEvent(new f.window.Event('click'));
  await settle();
  assert.equal(f.loads, 1);
  assert.equal(f.document.querySelector('#text').textContent, '頭髮發展，皇后和後來，乾杯與幹部；鼠標、軟件、硅，既有異體字。');
  assert.equal(f.document.title, '簡體標題');
  assert.equal(f.document.querySelector('#text').getAttribute('title'), '閱讀文章');
  assert.equal(f.document.querySelector('#text').getAttribute('aria-label'), '查看正文');
  assert.equal(f.document.querySelector('img').getAttribute('alt'), '圖片說明');
  assert.equal(f.document.querySelector('#rare').textContent, '𠁞');
  assert.equal(f.document.documentElement.lang, 'zh-TW');
  assert.equal(f.button.getAttribute('aria-pressed'), 'true');
  assert.equal(f.button.querySelector('.script-label').textContent, '简');
  await f.instance.setMode('cn');
  assert.equal(f.document.querySelector('#text').textContent, original);
  assert.equal(f.document.title, '简体标题');
  assert.equal(f.document.querySelector('#text').getAttribute('title'), '阅读文章');
  assert.equal(f.document.querySelector('#rare').textContent, '𠀾');
  assert.equal(f.document.documentElement.lang, 'zh-CN');
});

test('conversion skips code, forms, editable content, opted-out text, comments and other languages', async () => {
  const f = await fixture(`
    <pre>头发软件</pre><code>头发软件</code><script type="application/json">{"value":"头发软件"}</script>
    <style>.头发软件{color:red}</style><input value="头发软件" title="头发软件"><textarea>头发软件</textarea>
    <select><option>头发软件</option></select><div contenteditable="true"><p>头发软件</p></div>
    <p translate="no">头发软件</p><p class="notranslate">头发软件</p><p lang="ja">头发软件</p>
    <div id="artalk"><p>头发软件</p></div><comment-widget><p>头发软件</p></comment-widget>
    <p id="正文锚点"><a href="/文章路径#正文锚点" data-value="头发软件">头发软件</a></p>`);
  await f.instance.setMode('tw');
  for(const selector of ['pre', 'code', 'textarea', 'option', '[contenteditable] p', '[translate="no"]:not(.script-label)', '.notranslate', '[lang="ja"]', '#artalk p', 'comment-widget p']) {
    assert.equal(f.document.querySelector(selector).textContent, '头发软件', selector);
  }
  assert.equal(f.document.querySelector('input').getAttribute('value'), '头发软件');
  assert.equal(f.document.querySelector('input').getAttribute('title'), '头发软件');
  assert.match(f.document.querySelector('script').textContent, /头发软件/);
  assert.match(f.document.querySelector('style').textContent, /头发软件/);
  const link = f.document.querySelector('#正文锚点 a');
  assert.equal(link.textContent, '頭髮軟件');
  assert.equal(link.getAttribute('href'), '/文章路径#正文锚点');
  assert.equal(link.getAttribute('data-value'), '头发软件');
  assert.ok(f.document.getElementById('正文锚点'));
  await f.instance.setMode('cn');
});

test('saved traditional preference loads lazily and storage failures do not block either switch', async () => {
  const saved = await fixture('<p>头发</p>', {storage: {getItem: () => 'tw', setItem() {}}});
  await settle();
  assert.equal(saved.loads, 1);
  assert.equal(saved.document.querySelector('p').textContent, '頭髮');
  await saved.instance.setMode('cn');
  const blocked = await fixture('<p>头发</p>', {storage: {
    getItem() {throw new Error('blocked');}, setItem() {throw new Error('blocked');},
  }});
  assert.equal(blocked.loads, 0);
  await blocked.instance.setMode('tw');
  assert.equal(blocked.document.querySelector('p').textContent, '頭髮');
  await blocked.instance.setMode('cn');
  assert.equal(blocked.document.querySelector('p').textContent, '头发');
});

test('new content, changed attributes and TOC cloned from converted headings keep their original text', async () => {
  const f = await fixture('<h2 id="heading">头发与既有異體字</h2><div class="toc"></div><section id="results"><p>原始文章</p></section>');
  await f.instance.setMode('tw');
  f.document.querySelector('#results').innerHTML = '<p title="阅读头发">新增软件与異體字</p>';
  const toc = f.document.createElement('a');
  toc.setAttribute('href', '#heading');
  toc.textContent = f.document.querySelector('h2').textContent;
  toc.title = toc.textContent;
  f.document.querySelector('.toc').appendChild(toc);
  await settle();
  assert.equal(f.document.querySelector('#results p').textContent, '新增軟件與異體字');
  assert.equal(f.document.querySelector('#results p').title, '閱讀頭髮');
  assert.equal(toc.textContent, '頭髮與既有異體字');
  f.document.querySelector('#results p').firstChild.data = '动态发展';
  f.document.querySelector('#results p').setAttribute('aria-label', '动态发展');
  await settle();
  assert.equal(f.document.querySelector('#results p').textContent, '動態發展');
  assert.equal(f.document.querySelector('#results p').getAttribute('aria-label'), '動態發展');
  await f.instance.setMode('cn');
  assert.equal(f.document.querySelector('h2').textContent, '头发与既有異體字');
  assert.equal(toc.textContent, '头发与既有異體字');
  assert.equal(toc.title, '头发与既有異體字');
  assert.equal(f.document.querySelector('#results p').textContent, '动态发展');
  assert.equal(f.document.querySelector('#results p').title, '阅读头发');
});

test('observer ignores comment activity and its own DOM writes without repeated conversion', async () => {
  const f = await fixture('<p id="text">头发</p><div id="artalk"></div>');
  await f.instance.setMode('tw');
  const converted = f.conversions;
  for(let i = 0; i < 150; i++) {
    const comment = f.document.createElement('p');
    comment.textContent = `评论头发 ${i}`;
    f.document.querySelector('#artalk').appendChild(comment);
  }
  await settle();
  assert.equal(f.conversions, converted);
  f.document.querySelector('#text').textContent = '软件';
  await settle();
  const afterUpdate = f.conversions;
  assert.equal(f.document.querySelector('#text').textContent, '軟件');
  await settle();
  assert.equal(f.conversions, afterUpdate, 'converted writes must not queue another conversion');
  await f.instance.setMode('cn');
});

test('immediate restore also restores a TOC added before the observer batch runs', async () => {
  const f = await fixture('<h2 id="heading">头发与既有異體字</h2><div class="toc"></div>');
  await f.instance.setMode('tw');
  const toc = f.document.createElement('a');
  toc.setAttribute('href', '#heading');
  toc.textContent = f.document.querySelector('h2').textContent;
  toc.title = toc.textContent;
  f.document.querySelector('.toc').appendChild(toc);
  await f.instance.setMode('cn');
  assert.equal(toc.textContent, '头发与既有異體字');
  assert.equal(toc.title, '头发与既有異體字');
  assert.equal(f.document.querySelector('h2').textContent, '头发与既有異體字');
});

test('TOC restoration matches tocbot trimming while preserving original heading whitespace', async () => {
  const original = ' \n 头发与既有異體字 \t ';
  const f = await fixture(`<h2 id="heading">${original}</h2><div class="toc"></div>`);
  await f.instance.setMode('tw');
  const heading = f.document.querySelector('h2');
  const toc = f.document.createElement('a');
  toc.setAttribute('href', '#heading');
  toc.textContent = (heading.innerText || heading.textContent).trim();
  toc.title = toc.textContent;
  f.document.querySelector('.toc').appendChild(toc);
  await f.instance.setMode('cn');
  assert.equal(heading.textContent, original);
  assert.equal(toc.textContent, original.trim());
  assert.equal(toc.title, original.trim());
});

test('failed dictionary loads release the button and can be retried', async () => {
  const f = await fixture('<p>头发</p>', {loader: (attempt, convert) => {
    if(attempt === 1) throw new Error('Chunk unavailable');
    return convert;
  }});
  await f.instance.setMode('tw');
  assert.equal(f.button.disabled, false);
  assert.equal(f.button.getAttribute('aria-busy'), 'false');
  assert.equal(f.document.querySelector('p').textContent, '头发');
  assert.match(f.button.title, /重试/);
  await f.instance.setMode('tw');
  assert.equal(f.loads, 2);
  assert.equal(f.document.querySelector('p').textContent, '頭髮');
  await f.instance.setMode('cn');
});

test('a late converter response cannot overwrite a newer simplified choice', async () => {
  let release;
  const f = await fixture('<p>头发</p>', {loader: (_, convert) => new Promise((resolve) => {release = () => resolve(convert);})});
  const pending = f.instance.setMode('tw');
  await Promise.resolve();
  await f.instance.setMode('cn');
  release();
  await pending;
  assert.equal(f.document.querySelector('p').textContent, '头发');
  assert.equal(f.button.disabled, false);
  assert.equal(f.button.getAttribute('aria-busy'), 'false');
});
