/**
 * @date: 2024/3/30
 * @author: 小红
 * @fileName: App
 * @Description: 注册应用
 */

import {useClearPage} from '../core/_util';
import Message from './_message';
import Theme from './theme';
import Scroll from './scroll';
import Common from './common';
/**
 * @desc: 注册应用
 * @returns function(*): *
 * @param modules
 */
export default function App(modules = []) {
  return function(target) {
    Object.assign(window.MainApp, {
      useTheme: new Theme(), //主题
      useCommon: new Common(), // 公用逻辑
      useScroll: new Scroll(), //滚动导航侧边
      useMessage: new Message(), //消息提示
    });

    const ins = new target();

    const fns = Reflect.ownKeys(target.prototype);

    // 单个 run_* 异常只记录自身,不中断后续初始化与模块注册
    for (let i = 0; i < fns.length; i++) {
      if(!fns[i].startsWith('run_')) continue;
      try {
        ins[fns[i]]();
      } catch(e) {
        console.error(`[${target.name}] ${fns[i]}() 执行失败:`, e);
      }
    }

    for (let i = 0; i < modules.length; i++) {
      const mods = new modules[i]();
      window.MainApp.modules[mods.name] = mods;
    }

    useClearPage();

    return ins;
  };
}
