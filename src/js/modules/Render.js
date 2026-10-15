/**
 * @date: 2024/2/25
 * @author: 小红
 * @fileName: Render
 * @Description: 渲染html
 */
import tocBot from 'tocbot';

export function resolveAnchorId(id, ids) {
  if(ids.includes(id)) return id;
  const normalize = (value) => value.replace(/^(?:user-content-)+/, '');
  const matches = ids.filter((value) => normalize(value) === normalize(id));
  return matches.length === 1 ? matches[0] : null;
}

export default class Render {
  name = 'Render';

  #renderDom = document.querySelector('article.render'); // 文章渲染区域

  #tocStickyDom = document.querySelector('.aside .is-sticky');

  #conf = MainApp.conf;

  constructor() {
    this.#repairAnchors();
    if(this.#renderDom) {
      window.addEventListener('hashchange', () => this.#repairAnchors());
      if(document.readyState !== 'complete') {
        window.addEventListener('load', () => this.#repairAnchors(), {once: true});
      }
    }
    this.#h();
    this.#domObserver();
    this.#tocBotH5();
    this.#copyRight();
  }

  /**
   * h标题
   */
  #h() {
    if(this.#conf.enable_h_icon) this.#renderDom?.classList.add('enable_h_icon');
  }

  #domObserver() {
    const renderDom = document.querySelector('article.render');
    if(!renderDom || !this.#tocStickyDom) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        if(entry.contentRect.height > 0) {
          this.#tocBot();
          observer.disconnect();
        }
      }
    });
    observer.observe(renderDom);
  }

  /**
   * 设置目录
   */
  #tocBot() {
    if(!this.#tocStickyDom) return;
    tocBot.init({
      contentSelector: 'article.render',
      tocSelector: '.aside-toc > .toc',
      headingSelector: 'h1,h2,h3,h4,h5,h6',
      hasInnerContainers: true,
      scrollSmooth: true,
      includeTitleTags: true,
      scrollSmoothDuration: 280,
      throttleTimeout: 30,
      headingsOffset: 20, // 目录中高亮的偏移值，和scrollSmoothOffset有关联
      scrollSmoothOffset: -20, // 屏幕滚动的偏移值（这里和导航条固定也有关联）
      fixedSidebarOffset: 'auto',
      onClick: (e) => e.preventDefault(),
      scrollEndCallback: function(e) {
      },
    });

    MainApp.useScroll.change((max, num, scrollTop) => {
      if(scrollTop < max || window.innerWidth <= 1100) return;
      if(num <= scrollTop) {
        this.#tocStickyDom.style.top = '';
      }
      else {
        this.#tocStickyDom.style.top = '70px';
      }
    });

    const toc = document.querySelector('.aside-toc > .toc');

    if(toc && !toc.innerHTML) toc.textContent = '暂无目录~';

  }

  /**
   * h5目录
   */
  #tocBotH5() {
    const adeToc = this.#tocStickyDom?.querySelector('.aside-toc');

    const sideBtn = document.querySelector('.side-btn');
    if(!adeToc || !sideBtn) return;
    adeToc.id ||= 'article-toc';

    const tocBtn = document.createElement('button');
    tocBtn.className = 'button h5-toc';
    tocBtn.type = 'button';
    tocBtn.title = '文章目录';
    tocBtn.setAttribute('aria-label', '文章目录');
    tocBtn.setAttribute('aria-controls', adeToc.id);
    tocBtn.setAttribute('aria-expanded', 'false');
    tocBtn.innerHTML = '<i class="fa-solid fa-list-ul"></i>';

    sideBtn.prepend(tocBtn);

    tocBtn.addEventListener('click', () => {
      const expanded = adeToc.classList.toggle('is-open');
      tocBtn.setAttribute('aria-expanded', String(expanded));
    });
  }

  #repairAnchors() {
    if(!this.#renderDom) return;
    const ids = Array.from(this.#renderDom.querySelectorAll('[id]'), (el) => el.id);
    if(!ids.length) return;
    const current = new URL(window.location.href);
    this.#renderDom.querySelectorAll('a[href*="#"]').forEach((link) => {
      try {
        const url = new URL(link.getAttribute('href'), current);
        if(url.origin !== current.origin || url.pathname !== current.pathname || url.search !== current.search) return;
        const id = decodeURIComponent(url.hash.slice(1));
        const target = resolveAnchorId(id, ids);
        if(!target || target === id) return;
        url.hash = target;
        link.setAttribute('href', url.pathname + url.search + url.hash);
      } catch {
        // 无效或跨页面的锚点保持原链接。
      }
    });
    try {
      const id = decodeURIComponent(current.hash.slice(1));
      if(!id) return;
      const target = resolveAnchorId(id, ids);
      if(target && target !== id) {
        current.hash = target;
        window.history.replaceState(window.history.state, '', current);
        document.getElementById(target)?.scrollIntoView();
      }
    } catch {
      // 无法更新地址时，正文内已经修正的脚注链接仍可使用。
    }
  }

  /**
   * 版权
   */
  #copyRight() {
    const a = document.querySelector('.copy-right a.permalink');

    if(a) {
      a.setAttribute('href', window.location.href);
      try {
        a.textContent = decodeURI(window.location.href);
      } catch {
        a.textContent = window.location.href;
      }
    }
  }

}
