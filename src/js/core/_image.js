/**
 * @fileName: _image
 * @Description: 图片加载：原生懒加载、预览图与失败回退
 */

/**
 * 预加载一张图片
 * @param src
 * @returns {Promise<string>}
 */
export function useLoadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error(`Image failed: ${src}`));
    img.src = src;
  });
}

/**
 * 依次尝试候选地址，加载成功时添加 loaded，全部失败时显示失败图并添加 error。
 * 直接设置 img 自身的 src，懒加载交给浏览器，离开视口不会取消，已加载的图片不会重复请求。
 * @param img
 * @param candidates
 * @param fallback 全部失败时的占位图
 */
export function useImageCandidates(img, candidates, fallback) {
  const list = candidates.filter((src, index) => src && candidates.indexOf(src) === index);
  let index = 0;
  let current = '';
  let responsive = Boolean(img.getAttribute('srcset')?.trim());

  // 占位图的 load/error 事件可能晚于监听注册才派发，只处理当前候选地址的事件
  const isCurrent = () => img.src === current;
  const done = () => {
    img.removeEventListener('load', onLoad);
    img.removeEventListener('error', onError);
  };
  const next = () => {
    if(index < list.length) {
      img.src = list[index++];
      current = img.src;
      // 原生图片可能已在 defer 脚本运行前命中缓存；此时没有后续 load 事件可等。
      if(img.complete && img.naturalWidth > 0) onLoad();
      return;
    }
    done();
    img.classList.add('error');
    if(fallback && img.getAttribute('src') !== fallback) img.src = fallback;
  };
  const onLoad = () => {
    if(!isCurrent()) return;
    // 保留响应式图片的监听，窗口变化后选择的新档位也需要失败回退。
    if(!responsive) done();
    img.classList.add('loaded');
  };
  const onError = () => {
    if(!isCurrent()) return;
    if(responsive) {
      // srcset 优先于 src；失败时先撤下候选，再重试当前原图。
      responsive = false;
      img.removeAttribute('srcset');
      index = Math.max(0, index - 1);
    }
    next();
  };

  img.addEventListener('load', onLoad);
  img.addEventListener('error', onError);
  next();
}

/**
 * 主题图片（文章封面、头像、友链图标等）：模板输出占位图和 data-lazy-src。
 * 封面（data-preview="cover"）只加载预览图，失败时回退原图。
 * @param root
 */
export function useLazyImages(root = document) {
  const {usePreview = (src) => src, conf = {}} = window.MainApp || {};
  root.querySelectorAll('img[data-lazy-src]:not([data-lazy-state])').forEach((img) => {
    img.dataset.lazyState = '1';
    const origin = img.dataset.lazySrc;
    // 占位图自身可能被 Halo 增加 srcset，不能把它带到真实图片上。
    // 响应式图片插件为真实图片写入 srcset 时会用 data-responsive-src 标明原图，这种要保留。
    const ownSrcset = img.getAttribute('data-responsive-src') === origin;
    if(!ownSrcset && img.getAttribute('srcset') && img.getAttribute('src') !== origin) img.removeAttribute('srcset');
    const candidates = img.getAttribute('srcset')?.trim()
      ? [origin]
      : (img.dataset.preview === 'cover' ? [usePreview(origin), origin] : [origin]);
    useImageCandidates(img, candidates, conf.img_err);
  });
}

/**
 * 正文图片：先显示预览图，进入视口加载完成后再在后台加载原图并替换；预览图失败时直接使用原图。
 * @param root
 */
export function useProgressiveImages(root) {
  root?.querySelectorAll('img[data-origin]').forEach((img) => {
    const origin = img.dataset.origin;
    const upgrade = () => {
      img.removeEventListener('load', upgrade);
      img.removeEventListener('error', fallback);
      useLoadImage(origin).then(() => {
        img.src = origin;
      }).catch(() => {
        // 原图不可用时保留已显示的预览图
      });
    };
    const fallback = () => {
      img.removeEventListener('load', upgrade);
      img.removeEventListener('error', fallback);
      img.src = origin;
    };

    if(img.complete) {
      if(img.naturalWidth > 0) upgrade();
      else fallback();
      return;
    }
    img.addEventListener('load', upgrade);
    img.addEventListener('error', fallback);
  });
}
