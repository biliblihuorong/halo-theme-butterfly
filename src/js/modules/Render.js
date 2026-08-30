/**
 * @date: 2024/2/25
 * @author: 小红
 * @fileName: Render
 * @Description: 渲染html
 */
import tocBot from 'tocbot';

export default class Render {
  name = 'Render';

  #renderDom = document.querySelector('article.render'); // 文章渲染区域

  #tocStickyDom = document.querySelector('.aside .is-sticky');

  #conf = MainApp.conf;

  constructor() {
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
    if(!renderDom) return;

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

    const tocBtn = document.createElement('button');
    tocBtn.className = 'button h5-toc';
    tocBtn.type = 'button';
    tocBtn.title = '文章目录';
    tocBtn.innerHTML = '<i class="fa-sharp fa-solid fa-list-tree"></i>';

    sideBtn?.prepend(tocBtn);

    tocBtn.addEventListener('click', () => {
      if(!adeToc) return;
      // 切换显示状态；恢复时清掉 inline display，交回样式表控制
      const isHidden = adeToc.style.display === 'none';
      adeToc.style.display = isHidden ? '' : 'none';
    });
  }

  /**
   * 版权
   */
  #copyRight() {
    const a = document.querySelector('.copy-right a.permalink');

    if(a) {
      a.setAttribute('href', window.location.href);
      a.textContent = decodeURI(window.location.href);
    }
  }

}
