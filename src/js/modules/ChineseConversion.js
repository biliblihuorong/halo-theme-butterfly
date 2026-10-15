const STORAGE_KEY = 'butterfly-chinese-script';
const ATTRIBUTES = ['title', 'aria-label', 'alt'];
const EXCLUDED = 'pre,code,kbd,samp,script,style,noscript,template,svg,math,input,textarea,select,option,' +
  '[contenteditable]:not([contenteditable="false"]),[translate="no"],.notranslate,.ignore-opencc,.script-toggle,' +
  '#artalk,.artalk,.atk-main,halo-comment,comment-widget,.comment-widget,#comment-widget,.halo-comment,' +
  '#waline,.waline,#twikoo,.twikoo';
const hasChinese = (text) => /\p{Script=Han}/u.test(text);

/** 页面显示层的简繁切换：保留原文，不反向转换或修改文章数据。 */
export default class ChineseConversion {
  name = 'ChineseConversion';
  #mode = 'cn';
  #texts = new WeakMap();
  #attributes = new WeakMap();
  #pending = new Set();
  #timer;
  #observer;
  #converter;
  #loading;
  #request = 0;
  #buttons;
  #loadConverter;
  #originalLang;

  constructor(loadConverter = () => import(/* webpackChunkName: "chinese-conversion" */ './chinese-converter')) {
    this.#buttons = Array.from(document.querySelectorAll('.script-toggle'));
    if(!this.#buttons.length) return;
    this.#loadConverter = loadConverter;
    this.#originalLang = document.documentElement.getAttribute('lang');
    this.#buttons.forEach((button) => button.addEventListener('click', () => this.setMode(this.#mode === 'tw' ? 'cn' : 'tw')));
    this.#updateButtons();
    try {
      if(localStorage.getItem(STORAGE_KEY) === 'tw') this.setMode('tw');
    } catch { /* 偏好读取失败不影响当页切换 */ }
  }

  async setMode(mode) {
    const request = ++this.#request;
    if(mode === 'tw') {
      this.#updateButtons(true);
      try {
        this.#converter = await this.#getConverter();
        if(request !== this.#request) return;
      } catch(error) {
        if(request === this.#request) this.#updateButtons(false, true);
        console.warn('[ChineseConversion] conversion unavailable:', error.message);
        return;
      }
    }
    if(request !== this.#request) return;
    this.#observer?.disconnect();
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#pending.clear();
    // 目录可能刚复制了繁体标题、观察器尚未来得及处理；先记录它的原文再恢复。
    if(this.#mode === 'tw' && mode !== 'tw') {
      this.#walk(document.body);
      this.#walk(document.querySelector('title'));
    }
    this.#mode = mode === 'tw' ? 'tw' : 'cn';
    this.#walk(document.body);
    this.#walk(document.querySelector('title'));
    if(!this.#originalLang || /^zh(?:-|$)/i.test(this.#originalLang)) {
      if(this.#mode === 'tw') document.documentElement.setAttribute('lang', 'zh-TW');
      else if(this.#originalLang === null) document.documentElement.removeAttribute('lang');
      else document.documentElement.setAttribute('lang', this.#originalLang);
    }
    if(this.#mode === 'tw') this.#observe();
    try {
      localStorage.setItem(STORAGE_KEY, this.#mode);
    } catch { /* 存储只是偏好持久化 */ }
    this.#updateButtons();
  }

  #getConverter() {
    if(this.#converter) return Promise.resolve(this.#converter);
    if(this.#loading) return this.#loading;
    this.#loading = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Conversion loading timed out')), 15000);
      Promise.resolve().then(() => this.#loadConverter()).then((module) => {
        const convert = module.default || module;
        if(typeof convert !== 'function') throw new Error('Conversion module did not initialize');
        resolve(convert);
      }).catch(reject).finally(() => clearTimeout(timeout));
    }).catch((error) => {
      this.#loading = undefined;
      throw error;
    });
    return this.#loading;
  }

  #updateButtons(busy = false, failed = false) {
    this.#buttons.forEach((button) => {
      button.disabled = busy;
      button.setAttribute('aria-busy', String(busy));
      button.setAttribute('aria-pressed', String(this.#mode === 'tw'));
      const title = failed ? '加载失败，点击重试繁体转换' : this.#mode === 'tw' ? '切換至簡體中文' : '切换至繁体中文';
      button.setAttribute('title', title);
      button.setAttribute('aria-label', title);
      const label = button.querySelector('.script-label');
      if(label) label.textContent = busy ? '…' : this.#mode === 'tw' ? '简' : '繁';
    });
  }

  #excluded(element) {
    if(!element || element.closest(EXCLUDED)) return true;
    const lang = element.closest('[lang]')?.getAttribute('lang');
    return !!lang && !/^zh(?:-|$)/i.test(lang);
  }

  #walk(root) {
    if(!root) return;
    const nodes = [root];
    while(nodes.length) {
      const node = nodes.pop();
      if(node.nodeType === 3) {
        if(!this.#excluded(node.parentElement)) this.#text(node);
      } else if(node.nodeType === 1 && !this.#excluded(node)) {
        ATTRIBUTES.forEach((attribute) => this.#attribute(node, attribute));
        for(let child = node.lastChild; child; child = child.previousSibling) nodes.push(child);
      }
    }
  }

  #text(node) {
    const previous = this.#texts.get(node);
    if(this.#mode === 'cn') {
      if(previous && node.data === previous.output) node.data = previous.source;
      return;
    }
    if(previous && node.data === previous.output) return;
    if(!hasChinese(node.data)) return;
    const source = this.#tocSource(node.parentElement, node.data) ?? node.data;
    const output = this.#converter(source);
    this.#texts.set(node, {source, output});
    if(node.data !== output) node.data = output;
  }

  // tocbot 可能在切繁后复制标题。用它指向的原始标题恢复目录，保留原文里的异体字。
  #tocSource(element, current) {
    const link = element.closest('.toc a[href],.toc-list a[href]');
    if(!link || link.textContent !== current) return null;
    let url;
    try { url = new URL(link.getAttribute('href'), location.href); } catch { return null; }
    if(url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return null;
    let heading;
    try { heading = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { return null; }
    // tocbot 用可见标题（缺少 innerText 时用 textContent）去掉首尾空白后的文字。
    if(!heading || (heading.innerText || heading.textContent).trim() !== current) return null;
    const walker = document.createTreeWalker(heading, 4);
    let source = '', text;
    while((text = walker.nextNode())) {
      const record = this.#texts.get(text);
      source += record && text.data === record.output ? record.source : text.data;
    }
    return source.trim();
  }

  #attribute(element, name) {
    const current = element.getAttribute(name);
    const records = this.#attributes.get(element);
    const previous = records?.get(name);
    if(this.#mode === 'cn') {
      if(previous && current === previous.output) element.setAttribute(name, previous.source);
      return;
    }
    if(current === null || !hasChinese(current) || (previous && current === previous.output)) return;
    const source = (name === 'title' ? this.#tocSource(element, current) : null) ?? current;
    const output = this.#converter(source);
    const values = records || new Map();
    values.set(name, {source, output});
    this.#attributes.set(element, values);
    if(current !== output) element.setAttribute(name, output);
  }

  #observe() {
    if(typeof MutationObserver === 'undefined') return;
    this.#observer ||= new MutationObserver((records) => this.#queue(records));
    this.#observer.observe(document.documentElement, {
      childList: true, characterData: true, subtree: true, attributes: true,
      attributeFilter: [...ATTRIBUTES, 'lang', 'translate', 'contenteditable'],
    });
  }

  #queue(records, schedule = true) {
    records.forEach((record) => {
      const nodes = record.type === 'childList' ? record.addedNodes : [record.target];
      nodes.forEach((node) => {
        if(!node.isConnected || this.#excluded(node.nodeType === 1 ? node : node.parentElement)) return;
        this.#pending.add(node);
      });
    });
    if(this.#pending.size > 100) {
      this.#pending.clear();
      this.#pending.add(document.body);
      const title = document.querySelector('title');
      if(title) this.#pending.add(title);
    }
    if(schedule && this.#pending.size && this.#timer === undefined) {
      this.#timer = setTimeout(() => this.#flush(), 20);
    }
  }

  #flush() {
    this.#timer = undefined;
    if(this.#mode !== 'tw') return;
    this.#queue(this.#observer.takeRecords(), false);
    this.#observer.disconnect();
    try {
      const roots = [...this.#pending];
      this.#pending.clear();
      roots.forEach((root) => {
        if(root.isConnected && !roots.some((other) => other !== root && other.contains(root))) this.#walk(root);
      });
    } finally {
      this.#observe();
    }
  }
}
