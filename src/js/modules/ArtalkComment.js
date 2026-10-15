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

  constructor() {
    if(!window.ArtalkConfig || !document.getElementById('artalk')) return;
    this.#tryInit();
  }
}
