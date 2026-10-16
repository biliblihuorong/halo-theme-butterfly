/**
 * @date: 2024/7/4
 * @author: 小红
 * @fileName: AmplifyImg
 * @Description: 图片放大
 */
import {useInsertStyle} from '../core/_util';

export default class AmplifyImg {
  name = 'AmplifyImg';

  constructor(loadFancybox = () => Promise.all([
    import(/* webpackChunkName: "fancybox" */ '@fancyapps/ui'),
    import(/* webpackChunkName: "fancybox" */ '@fancyapps/ui/dist/fancybox/fancybox.css'),
  ])) {
    const images = document.querySelectorAll('.main > .content img');
    if(!images.length) return;
    this.#init(images, loadFancybox);
  }

  async #init(images, loadFancybox) {
    try {
      const [{Fancybox}, {default: fancyBoxCss}] = await loadFancybox();
      useInsertStyle(fancyBoxCss.toString());
      this.#fBox(Fancybox, images);
    } catch(error) {
      // 灯箱资源不可用时保留普通图片，不影响其他页面模块。
      console.warn('[AmplifyImg] lightbox unavailable:', error);
    }
  }

  #fBox(Fancybox, images) {
    // 用带 data-fancybox 属性的 span 包裹正文图片，供灯箱识别
    images.forEach((img) => {
      if(!img.isConnected || !img.parentNode) return;
      const span = document.createElement('span');
      span.setAttribute('data-fancybox', 'fancyBoxImg');
      // 启用预览图时正文显示的是预览图，灯箱始终打开原图
      span.setAttribute('href', img.dataset.origin || img.getAttribute('src'));
      img.parentNode.insertBefore(span, img);
      span.appendChild(img);
    });

    Fancybox.bind(
      '[data-fancybox="fancyBoxImg"]',
      {
        Toolbar: {
          display: {
            left: ['infobar'],
            middle: [
              'zoomIn',
              'zoomOut',
              'toggle1to1',
              'rotateCCW',
              'rotateCW',
              'flipX',
              'flipY',
            ],
            right: ['slideshow', 'thumbs', 'close'],
          },
        },
      });
  }
}
