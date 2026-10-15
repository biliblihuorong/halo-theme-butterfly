/**
 * @date: 2024/2/25
 * @author: 小红
 * @fileName: pagination
 * @Description:页码
 */


export default class Pagination {
  name = 'Pagination';

  #conf = MainApp.conf;

  constructor() {
    if(!MainApp.conf.total || this.#conf.totalPages <= 1) return;

    if(this.#conf.page > this.#conf.totalPages) return;

    this.#createPage();
  }

  // 获取上一页
  #getPrevUrl() {
    return this.#conf.hasPrevious ? `<a class="page prev" rel="prev" aria-label="prev" href="${this.#conf.prevUrl}"><i class="fas fa-chevron-left fa-fw"></i></a>` : '';
  }

  // 获取下一页
  #getNextUrl() {
    return this.#conf.hasNext ? `<a class="page next" aria-label="next" href="${this.#conf.nextUrl}"><i class="fas fa-chevron-right fa-fw"></i></a>` : '';
  }

  // 获取路径
  #getPageUrl(page) {
    const suffix = /\/page\/\d+\/?$/;
    const candidate = [this.#conf.nextUrl, this.#conf.prevUrl].find((value) => {
      return typeof value === 'string' && suffix.test(new URL(value, window.location.href).pathname);
    });
    const url = new URL(candidate || window.location.href, window.location.href);
    const base = url.pathname.replace(suffix, '').replace(/\/$/, '');
    url.pathname = page === 1 ? (base || '/') : `${base}/page/${page}`;
    return url.pathname + url.search + url.hash;
  }

  // 获取页码
  #getPage() {
    const {totalPages, page} = this.#conf;
    const maxPagesToShow = 5; // 可见的最大页码数
    const halfMaxPagesToShow = Math.floor(maxPagesToShow / 2);
    let startPage, endPage;

    if(totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    }
    else {
      if(page <= halfMaxPagesToShow + 1) {
        startPage = 1;
        endPage = maxPagesToShow;
      }
      else if(page >= totalPages - halfMaxPagesToShow) {
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
      }
      else {
        startPage = page - halfMaxPagesToShow;
        endPage = page + halfMaxPagesToShow;
      }
    }
    let html = '';

    for (let i = startPage; i <= endPage; i++) {
      html += `<a class="page${i === page ? ' current' : ''}"  href="${this.#getPageUrl(i)}">${i}</a>`;
    }

    return html;
  }

  #createPage() {
    document.querySelector('main.main  section.content')?.insertAdjacentHTML('beforeend', `<div class="pagination">${this.#getPrevUrl()}${this.#getPage()}${this.#getNextUrl()}</div>`);
  }
}
