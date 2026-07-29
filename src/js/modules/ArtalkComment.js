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
    const pageKey = cfg.trailingSlash && !cfg.pageKey.endsWith('/')
      ? `${cfg.pageKey}/`
      : cfg.pageKey;
    el.dataset.artalkInited = '1';
    window.Artalk.init({
      el: '#artalk',
      server: cfg.server,
      site: cfg.site,
      pageKey,
      pageTitle: cfg.pageTitle,
      locale: cfg.locale,
      useBackendConf: cfg.useBackendConf,
      darkMode: document.documentElement.dataset.colorScheme === 'dark',
    });
  };

  constructor() {
    if(!window.ArtalkConfig || !document.getElementById('artalk')) return;
    this.#tryInit();
  }
}
