/**
 * @fileName: ArtalkComment
 * @Description: Artalk 评论系统初始化
 */
export default class ArtalkComment {
  name = 'artalkComment';

  #tryInit = (attempts = 0) => {
    const cfg = window.ArtalkConfig;
    const el = document.getElementById('artalk');
    if(!cfg || !el) return;
    if(!window.Artalk || typeof window.Artalk.init !== 'function') {
      if(attempts > 60) return;
      return setTimeout(() => this.#tryInit(attempts + 1), 200);
    }
    if(el.dataset.artalkInited === '1') return;
    //pageKey 缺失时回退到当前路径；必须兜住 null，否则 endsWith 抛错会炸掉 App 的模块注册循环
    const rawKey = cfg.pageKey || location.pathname;
    const pageKey = cfg.trailingSlash && !rawKey.endsWith('/') ? `${rawKey}/` : rawKey;
    el.dataset.artalkInited = '1';
    try {
      const artalk = window.Artalk.init({
        el: '#artalk',
        server: cfg.server,
        site: cfg.site,
        pageKey,
        pageTitle: cfg.pageTitle || document.title,
        locale: cfg.locale,
        useBackendConf: cfg.useBackendConf,
        darkMode: document.documentElement.dataset.colorScheme === 'dark',
      });
      MainApp.useTheme.change((mode) => artalk.setDarkMode(mode === 'dark'));
    } catch(err) {
      //初始化失败也不能中断模块注册循环
      el.dataset.artalkInited = '';
      console.warn('[Artalk] init failed:', err && err.message);
    }
  };

  // 评论区接近视口（或通过评论锚点进入页面）时才加载 Artalk 资源
  constructor() {
    const el = document.getElementById('artalk');
    if(!window.ArtalkConfig || !el) return;

    const start = () => {
      this.#loadAssets(el);
      this.#tryInit();
    };
    if(typeof IntersectionObserver === 'undefined' || /^#atk-/.test(location.hash || '')) {
      start();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if(!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      start();
    }, {rootMargin: '600px 0px'});
    observer.observe(el);
  }

  #loadAssets(el) {
    const {js, css, customCss} = el.dataset;
    [css, customCss].filter(Boolean).forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
    if(!js || typeof window.Artalk?.init === 'function') return;
    const script = document.createElement('script');
    script.src = js;
    script.async = true;
    script.onload = () => this.#tryInit();
    document.head.appendChild(script);
  }
}
