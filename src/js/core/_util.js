/**
 * @date: 2023/10/9
 * @author: 小红
 * @fileName: Utils
 * @Description:工具
 */

/**
 * 防抖
 * @param func
 * @param wait
 * @param immediate
 * @returns {(function(): void)|*}
 */
export function useDebounce(func, wait, immediate) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    const later = function() {
      timeout = null;
      if(!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if(callNow) func.apply(context, args);
  };
}

/**
 * 节流
 * @param func
 * @param wait
 * @param options
 * @returns {(function(): void)|*}
 */
export function useThrottle(func, wait, options = {}) {
  let timeOut, context, args;
  let previous = 0;

  const later = function() {
    previous = options['leading'] === false ? 0 : new Date().getTime();
    timeOut = null;
    func.apply(context, args);
    context = args = null;
  };

  return function() {
    const now = new Date().getTime();
    if(!previous && options['leading'] === false) previous = now;
    const remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if(remaining <= 0 || remaining > wait) {
      if(timeOut) {
        clearTimeout(timeOut);
        timeOut = null;
      }
      previous = now;
      func.apply(context, args);
      if(!timeOut) context = args = null;
    }
    else if(!timeOut && options['leading'] !== false) {
      timeOut = setTimeout(later, remaining);
    }
  };
}

/**
 * 禁用滚动
 * @param bool
 */
export function useDisableScroll(bool) {
  if(bool) {
    document.body.style.overflow = 'hidden';
  }
  else {
    document.body.removeAttribute('style');
  }
}

/**
 * 判断白天还是夜晚
 * @returns {boolean}
 */
/**
 * 用户是否在系统中开启了“减少动态效果”
 * @returns {boolean}
 */
export function useReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 滚动行为：减少动态效果时直接跳转
 * @returns {'auto'|'smooth'}
 */
export function useScrollBehavior() {
  return useReducedMotion() ? 'auto' : 'smooth';
}

export function useIsDaytime() {
  const now = new Date();
  const currentHour = now.getHours();

  // 定义白天和夜晚的时间范围（可以根据需要调整）
  const daytimeStartHour = 6; // 早上6点
  const daytimeEndHour = 18;  // 晚上6点

  // 判断当前小时是否在白天时间范围内
  return currentHour >= daytimeStartHour && currentHour < daytimeEndHour;
}

/**
 * 遮罩层（淡入显示，点击后淡出并回调）
 * @param close
 */
export function useMask(close) {
  let dom = document.querySelector('#Butterfly > .mask');
  if(!dom) {
    dom = document.createElement('div');
    dom.className = 'mask';
    document.getElementById('Butterfly')?.appendChild(dom);
  }

  // 淡入：先以透明态显示，再过渡到不透明（双 rAF 确保初始值先生效）
  dom.style.transition = 'opacity 0.4s ease';
  dom.style.opacity = '0';
  dom.style.display = 'block';
  requestAnimationFrame(() => requestAnimationFrame(() => { dom.style.opacity = '1'; }));

  useDisableScroll(true);

  const onClick = () => {
    dom.removeEventListener('click', onClick);
    useDisableScroll(false);
    dom.style.opacity = '0';
    setTimeout(() => { dom.style.display = 'none'; }, 400);
    close();
  };
  dom.addEventListener('click', onClick);
}

/**
 * 随机获取颜色值
 * @returns {string}
 */
export function useRandomColor() {
  const randomColor = Math.random() * (0xFFFFFF - 0x100000) + 0x100000;

  return '#' + ('00000' + (randomColor << 0).toString(16)).slice(-6);
}

/**
 * 插入style
 */
export function useInsertStyle(str) {
  const style = document.createElement('style');
  style.textContent = str;
  document.head.appendChild(style);
}

/**
 * 转为布尔值 判断是否为true
 */
export function useToBool(str) {
  return [true, 'true'].includes(str);
}

/**
 * 延迟
 * @param time
 * @returns {*}
 */
export function useDelay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

/**
 *  图表渲染 支持浅色暗色
 *  ECharts 走动态 import,只有图表进入视口并且调用方完成组件注册后才加载并初始化。
 * @param dom
 * @param register async (echartsCore) => options
 */
export async function useChart(dom, register) {
  if(!dom) return;
  // 视口外不加载,等图表滚到附近再动态 import echarts/core
  await new Promise((resolve) => {
    if (typeof IntersectionObserver === 'undefined') return resolve();
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        obs.disconnect();
        resolve();
      }
    }, {rootMargin: '200px'});
    obs.observe(dom);
  });

  // webpackExports 列出实际用到的导出，让 webpack 只打包这些；页面注册图表时同样按名导入。
  const echarts = await import(/* webpackChunkName: "echarts", webpackExports: ["init", "use", "graphic"] */ 'echarts/core');
  const options = await register(echarts);

  let es = null;

  const observer = new ResizeObserver(entries => {
    for (let entry of entries) {
      const {width} = entry.contentRect;
      if(width > 0) {
        es = echarts.init(dom, MainApp.useTheme.getMode());
        es.setOption(options);
        observer.disconnect();
      }
    }
  });

  observer.observe(dom);

  MainApp.useTheme.change((mode) => {
    es?.dispose();
    es = echarts.init(dom, mode);
    es.setOption(options);
  });

  window.addEventListener('resize', useThrottle(() => {
    es?.resize();
  }, 500));
}

/**
 * 清理页面
 */
export function useClearPage() {
  window.addEventListener('load', () => {
    const scripts = document.querySelectorAll('script');

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if(script.id.includes('Script')) script.remove();
    }
  });
}

/**
 * 获取url参数
 * @returns {{}}
 */
export function getQueryParams(search = window.location.search) {
  if(!search) return null;

  const queryStr = search.substring(1);

  const params = {};
  
  const pairs = queryStr.split('&');
  
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const kv = pair.split('=');
    params[kv[0]] = kv[1] || '';
  }
  
  return params;
}
