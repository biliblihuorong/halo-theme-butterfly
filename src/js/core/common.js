/**
 * @date: 2024/3/2
 * @author: 小红
 * @fileName: _aside
 * @Description:common
 */
import {useMask} from './_util';
import LazyLoad from './_lazyLoad';

export default class Common {

  constructor() {
    if(window.MainApp.conf.enable_above && window.MainApp.conf.above_background) this.#loadAboveBackgroundImg(); //第一屏图片预加载

    this.#createSingleAction(); //创建单一行为事件

    if(MainApp.conf.enable_aside && MainApp.conf.enable_webInfo) this.#runDay(); //站点运行时间

    if(MainApp.conf.umami?.enable) this.#fetchUmamiVisits(); //Umami 总访问量

  }

  // 站点运行时间
  #runDay() {
    const dom = document.querySelector('.main > .aside .aside-webInfo .run-day');

    if(!dom) return;

    const siteDate = new Date(dom.getAttribute('data-date'));

    if(siteDate.toString() === 'Invalid Date') return;

    const currentDate = new Date();

    const date = currentDate.getTime() - siteDate.getTime();

    const day = parseInt((date / (1000 * 24 * 60 * 60)).toString());

    dom.textContent = day + ' 天';
  }

  /**
   * Umami 访问量获取（分享链接公开 API，无需凭据）
   * 流程: 检查缓存 → 调用 share stats API → 更新 DOM
   * 兼容 v2（/api/share/{id}/stats）与 v3（两步：share 换 token → websites stats + 双请求头）
   */
  async #fetchUmamiVisits() {
    const conf = MainApp.conf.umami;
    if(!conf.url || !conf.shareId) return;

    const cacheKey = 'butterfly-umami-data';
    const cacheMs = (conf.cacheMinutes || 30) * 60 * 1000;

    // 检查缓存
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      if(cached && Date.now() - cached.time < cacheMs) {
        this.#updateVisitsDom(cached.pageviews);
        return;
      }
    } catch(e) { /* 缓存无效则继续 */ }

    try {
      const endAt = Date.now();
      let data = null;

      // Umami v3：/api/share/{id} 返回 {token, websiteId}，再带双请求头查网站统计
      try {
        const shareRes = await fetch(`${conf.url}/api/share/${conf.shareId}`);
        if(shareRes.ok) {
          const share = await shareRes.json();
          if(share && share.token && share.websiteId) {
            const statsRes = await fetch(`${conf.url}/api/websites/${share.websiteId}/stats?startAt=0&endAt=${endAt}`, {
              headers: {
                'x-umami-share-token': share.token,
                'x-umami-share-context': '1',
              },
            });
            if(statsRes.ok) data = await statsRes.json();
          }
        }
      } catch(e) { /* v3 流程失败则尝试 v2 */ }

      // Umami v2 回退：旧的 share stats 端点
      if(!data) {
        const res = await fetch(`${conf.url}/api/share/${conf.shareId}/stats?startAt=0&endAt=${endAt}`);
        if(res.ok) data = await res.json();
      }

      if(!data) return;

      const pageviews = data.pageviews?.value ?? data.pageviews ?? 0;

      // 缓存结果
      localStorage.setItem(cacheKey, JSON.stringify({ pageviews, time: Date.now() }));

      this.#updateVisitsDom(pageviews);
    } catch(e) {
      console.warn('Umami 统计获取失败:', e.message);
    }
  }

  /**
   * 更新 DOM 中的访问量显示
   */
  #updateVisitsDom(count) {
    const dom = document.getElementById('umami-visits');
    if(dom) {
      dom.textContent = this.#formatNumber(count) + '人';
    }
  }

  /**
   * 格式化数字（加千分位）
   */
  #formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * 创建单一行为事件
   */
  #createSingleAction() {
    //图片懒加载
    new LazyLoad({
      elements_selector: 'img', threshold: 300, data_src: 'lazy-src',
    });

    //移动端侧边栏呼出图标
    const sideBar = document.querySelector('.side-bar');
    document.querySelector('.nav a.bars')?.addEventListener('click', (e) => {
      e.preventDefault();
      sideBar?.classList.add('active');
      useMask(() => sideBar?.classList.remove('active'));
    });

    //移动端侧边栏侧边菜单（事件委托：点击子菜单链接切换父级展开状态）
    document.querySelector('menu.bar')?.addEventListener('click', (e) => {
      const link = e.target.closest('li.child > a.link');
      if(!link) return;
      e.preventDefault();
      link.parentElement.classList.toggle('active');
    });
  }

  //返回顶部
  backTop() {
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  //第一屏图片预加载
  #loadAboveBackgroundImg() {
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = 'high';
    img.src = window.MainApp.conf.above_background;
    img.onload = () => {
      const above = document.querySelector('.header > .above');
      if(above) above.style.backgroundImage = `url(${img.src})`;
    };
    img.onerror = () => {
      console.error('第一屏图片预加载失败');
    };
  }
}
