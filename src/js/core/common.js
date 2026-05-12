/**
 * @date: 2024/3/2
 * @author: 小红
 * @fileName: _aside
 * @Description:common
 */
import $ from 'jquery';
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
    const dom = $('.main > .aside .aside-webInfo .run-day');

    if(!dom.length) return;

    const siteDate = new Date(dom.attr('data-date'));

    if(siteDate.toString() === 'Invalid Date') return;

    const currentDate = new Date();

    const date = currentDate.getTime() - siteDate.getTime();

    const day = parseInt((date / (1000 * 24 * 60 * 60)).toString());

    dom.html(day + ' 天');
  }

  /**
   * Umami 访问量获取
   * 流程: 检查缓存 → 登录获取 token → 调用 stats API → 更新 DOM
   */
  async #fetchUmamiVisits() {
    const conf = MainApp.conf.umami;
    if(!conf.url || !conf.websiteId || !conf.username || !conf.password) return;

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
      // 获取 token
      const token = await this.#getUmamiToken(conf);
      if(!token) return;

      // 调用 stats API（从网站创建至今）
      const startAt = 0;
      const endAt = Date.now();
      const res = await fetch(`${conf.url}/api/websites/${conf.websiteId}/stats?startAt=${startAt}&endAt=${endAt}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if(!res.ok) return;

      const data = await res.json();
      const pageviews = data.pageviews?.value ?? data.pageviews ?? 0;

      // 缓存结果
      localStorage.setItem(cacheKey, JSON.stringify({ pageviews, time: Date.now() }));

      this.#updateVisitsDom(pageviews);
    } catch(e) {
      console.warn('Umami 统计获取失败:', e.message);
    }
  }

  /**
   * 获取 Umami Token（带缓存）
   */
  async #getUmamiToken(conf) {
    const tokenKey = 'butterfly-umami-token';
    const cacheMs = (conf.cacheMinutes || 30) * 60 * 1000;

    // 检查 token 缓存
    try {
      const cached = JSON.parse(localStorage.getItem(tokenKey));
      if(cached && Date.now() - cached.time < cacheMs) {
        return cached.token;
      }
    } catch(e) { /* 缓存无效 */ }

    // 登录获取新 token
    const res = await fetch(`${conf.url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: conf.username, password: conf.password }),
    });

    if(!res.ok) return null;

    const data = await res.json();
    const token = data.token;

    if(token) {
      localStorage.setItem(tokenKey, JSON.stringify({ token, time: Date.now() }));
    }

    return token;
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
      elements_selector: 'img', threshold: 0, data_src: 'lazy-src',
    });

    //移动端侧边栏呼出图标
    const sideBar = $('.side-bar');
    $('.nav a.bars').click((e) => {
      e.preventDefault();
      sideBar.addClass('active');
      useMask(() => sideBar.removeClass('active'));
    });

    //移动端侧边栏侧边菜单
    $('menu.bar').on('click', 'li.child', (event) => event.currentTarget.classList.toggle('active'));
  }

  //返回顶部
  backTop() {
    $('html,body').animate({scrollTop: 0}, 300);
  }

  //第一屏图片预加载
  #loadAboveBackgroundImg() {
    const img = new Image();
    img.src = window.MainApp.conf.above_background;
    img.onload = () => {
      const above = document.querySelector('.header > .above');
      above.style.backgroundImage = `url(${img.src})`;
    };
    img.onerror = () => {
      console.error('第一屏图片预加载失败');
    };
  }
}

