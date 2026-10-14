/**
 * @date: 2024/3/17
 * @author: 小红
 * @fileName: post
 * @Description: 文章
 */

import App from '../core/App';
import codeBlock from '../modules/CodeBlock';
import Render from '../modules/Render';
import AmplifyImg from '../modules/AmplifyImg';
import ArtalkComment from '../modules/ArtalkComment';

@App([Render, codeBlock, AmplifyImg, ArtalkComment])
class Post {
  run_meta() {
    const render = document.querySelector('article.render');
    const wordCount = document.querySelector('.wordCount >  span');
    const clock = document.querySelector('.clock >  span');

    // 关闭文章首屏时 meta 区域不渲染,元素缺失直接跳过,避免中断后续模块注册
    if(!render || !wordCount || !clock) return;

    wordCount.textContent = `字数总计 ${render.textContent.length} 字`;
    clock.textContent = `阅读时间 ${Math.ceil(render.textContent.length / 500)} 分钟`;
  }
}
