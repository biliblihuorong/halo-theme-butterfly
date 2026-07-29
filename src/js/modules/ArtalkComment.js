/**
 * @fileName: ArtalkComment
 * @Description: Artalk 评论系统初始化
 */
export default class ArtalkComment {
  name = 'artalkComment';

  #conf = window.MainApp?.conf || {};

  #tryInit = (attempts = 0) => {
    const cfg = window.ArtalkConfig;
    const el = document.getElementById('artalk');
    if(!cfg || !el) return;
    if(typeof window.Artalk !== 'function') {
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
      preferRemoteConf: cfg.preferRemoteConf,
      darkMode: document.documentElement.dataset.colorScheme === 'dark',
    });
  };

  constructor() {
    const provider = this.#conf.comment?.provider;
    if(provider !== 'artalk') return;
    if(!document.getElementById('artalk')) return;
    this.#tryInit();
  }
}
