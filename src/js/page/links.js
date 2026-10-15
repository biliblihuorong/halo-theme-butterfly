/**
 * @date: 2024/5/23
 * @author: 小红
 * @fileName: Links
 * @Description: 链接
 */

import {marked} from 'marked';
import App from '../core/App';
import ArtalkComment from '../modules/ArtalkComment';

@App([ArtalkComment])
class Links {
  /***
   * @desc: 渲染 Markdown 内容（友链底部内容，原文存在 th:text 里，渲染后展示）
   */
  run_md() {
    document.querySelectorAll('article.md-content').forEach((el) => {
      el.innerHTML = marked.parse(el.textContent || '');
      el.hidden = false;
    });
  }
}
