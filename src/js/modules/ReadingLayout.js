/** 桌面文章阅读宽度；仅改变访客当前浏览器的布局偏好。 */
export default class ReadingLayout {
  name = 'readingLayout';

  constructor() {
    const button = document.querySelector('.wide-toggle');
    const page = document.querySelector('#Butterfly.post, #Butterfly.single');
    const aside = page?.querySelector('.main > .aside');
    if(!button || !aside) return;

    const root = document.documentElement;
    let enabled = root.classList.contains('reading-wide');
    try {
      enabled = localStorage.getItem('butterfly-reading-wide') === '1';
    } catch (_) { /* 存储受限时仍能切换当前页面 */ }

    const update = () => {
      root.classList.toggle('reading-wide', enabled);
      const label = enabled ? '退出宽屏阅读' : '开启宽屏阅读';
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-label', label);
      button.title = label;
      const icon = button.querySelector('i');
      if(icon) icon.className = enabled ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    };
    button.hidden = false;
    update();

    button.addEventListener('click', () => {
      enabled = !enabled;
      update();
      try {
        localStorage.setItem('butterfly-reading-wide', enabled ? '1' : '0');
      } catch (_) { /* 偏好无法保存不影响当前页面 */ }
    });
  }
}
