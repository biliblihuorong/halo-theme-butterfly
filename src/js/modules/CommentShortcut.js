import {useScrollBehavior} from '../core/_util';

export default class CommentShortcut {
  name = 'commentShortcut';

  constructor() {
    const button = document.querySelector('.comment-shortcut');
    if(!button || !this.#getTarget()) return;

    button.hidden = false;
    button.addEventListener('click', () => {
      const target = this.#getTarget();
      if(!target) {
        button.hidden = true;
        return;
      }
      if(target.id === 'artalk') MainApp.modules?.artalkComment?.start();
      target.scrollIntoView({behavior: useScrollBehavior(), block: 'start'});
    });
  }

  #getTarget() {
    const artalk = document.getElementById('artalk');
    if(artalk && window.ArtalkConfig) return artalk;
    // Halo 插件先输出容器，再异步挂载 comment-widget；两种阶段都能跳转。
    return document.querySelector('comment-widget, halo-comment, [id^="comment-content-halo-run-"]');
  }
}
