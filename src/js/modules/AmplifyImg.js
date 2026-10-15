/**
 * @date: 2024/7/4
 * @author: 小红
 * @fileName: AmplifyImg
 * @Description: 图片放大
 */
import {Fancybox} from '@fancyapps/ui';
import {useInsertStyle} from '../core/_util';
import fancyBoxCss from '@fancyapps/ui/dist/fancybox/fancybox.css';

export default class AmplifyImg {
  name = 'AmplifyImg';

  constructor() {
    this.#addCss();
    this.#fBox();
  }

  #addCss() {
    let cssStr = ``;
    cssStr += fancyBoxCss.toString();
    useInsertStyle(cssStr);
  }

  #fBox() {
    // 用带 data-fancybox 属性的 span 包裹正文图片，供灯箱识别
    document.querySelectorAll('.main > .content img').forEach((img) => {
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
