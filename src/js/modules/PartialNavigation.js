/**
 * 同页筛选和分页只替换结果区，失败时回退到普通导航。
 */

export function shouldHandle(event, link, origin = window.location.origin) {
  return !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey &&
    link.origin === origin &&
    (!link.target || link.target === '_self') &&
    !link.hasAttribute('download');
}

export default class PartialNavigation {
  name = 'PartialNavigation';

  #page;
  #controller;

  constructor() {
    const root = document.getElementById('Butterfly');
    if(!root?.querySelector('[data-partial-navigation]')) return;

    this.#page = root.className;
    history.replaceState({...history.state, partialNavigation: this.#page}, '');

    document.addEventListener('click', (event) => {
      const link = event.target.closest('[data-partial-navigation] a');
      if(!link || !shouldHandle(event, link)) return;

      event.preventDefault();
      this.#load(link.href, true);
    });

    window.addEventListener('popstate', (event) => {
      if(event.state?.partialNavigation === this.#page) this.#load(window.location.href, false);
    });
  }

  async #load(url, pushState) {
    const current = document.querySelector('[data-partial-navigation]');
    if(!current) return window.location.assign(url);

    this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;
    current.setAttribute('aria-busy', 'true');
    current.style.opacity = '.6';
    current.style.pointerEvents = 'none';

    try {
      const response = await fetch(url, {signal: controller.signal});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);

      const template = document.createElement('template');
      template.innerHTML = await response.text();
      const root = template.content.querySelector('#Butterfly');
      const next = root?.classList.contains(this.#page) && root.querySelector('[data-partial-navigation]');
      if(!next) throw new Error('Partial content not found');

      current.replaceWith(next);
      if(pushState) history.pushState({partialNavigation: this.#page}, '', url);
      next.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
    catch(error) {
      if(error.name !== 'AbortError') window.location.assign(url);
    }
    finally {
      if(this.#controller === controller) {
        this.#controller = null;
        current.removeAttribute('aria-busy');
        current.style.opacity = '';
        current.style.pointerEvents = '';
      }
    }
  }
}
