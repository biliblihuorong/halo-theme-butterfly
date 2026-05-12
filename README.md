<p align="center">
  <strong>Halo Theme Butterfly 🦋 (Shell's Mod)</strong>
</p>

> 基于 [dhjddcn/halo-theme-butterfly](https://github.com/dhjddcn/halo-theme-butterfly) 进行深度定制和修复的魔改版本。
> 原主题由 [Jerry](https://github.com/jerryc127) 创作，感谢原作者们的无私奉献！❤️

## 👀 预览主题

- **演示站点**：[某科学的贝壳的博客 (blog.ning.moe)](https://blog.ning.moe/)

## 🚀 核心魔改特性 (v2.1.3+)

在这个魔改版本中，进行了大量深度优化和 Bug 修复：

- **深度修复 Halo 2.0 兼容性**：彻底解决原主题在构建工具中由于 Thymeleaf 语法错误导致的页面奔溃（500）和完全空白问题。
- **页面数据自修复 (Self-healing)**：增强了归档、相册、瞬间等页面的数据获取机制，即使路由未提供数据，前端也能自主获取。
- **第三方插件无缝适配**：
  - [x] **朋友圈插件 (`plugin-friends`)**：增加双栏/单栏切换支持，完美适配主题卡片 UI。
  - [x] **Steam 插件 (`halo-plugin-steam`)**：原生集成个人主页、近两周游玩和游戏库展示。
- **侧边栏深度优化**：移除多余的点赞统计，改为直观的**标签总数**和基于 **Umami** 的全站真实总访问量对接。
- **更好的分页与路由**：完善的组件分页体验及 URL 状态同步。

## 🌈 安装指南

- 主题仓库地址：`https://github.com/biliblihuorong/halo-theme-butterfly.git`
- 在 [Release](https://github.com/biliblihuorong/halo-theme-butterfly/releases) 页面下载最新的 `theme-butterfly-dist.zip`，进入 `Halo Console` -> `外观` -> `主题` 中上传安装即可。

## ⚠️ 注意事项

安装主题后，需要在 `Halo Console - 外观 - 主题设置 - 基本设置 - 博主标识` (metadata.name) 中进行配置，填入你的**用户名**，否则侧边栏的博主资料将无法正常显示。

## 📊 Umami 访问量对接说明

由于 Halo 内部仅统计本系统产生的流量，本主题提供原生对接 Umami 统计的功能。
1. 在 Umami 后台创建一个 **View Only** 的只读账号。
2. 在主题设置的「Umami 统计」中，填入你的 Umami 链接、站点 ID 及其只读账号密码。
3. 侧边栏的“总访问量”将自动并无感地读取你站点的全历史访问数据。

## 🛡️ 许可证 (License)

本主题遵循 [GPL-3.0 协议](LICENSE) 开源。

在分发、修改和二次开发时，请务必保留原作者和本魔改版本的开源许可与版权声明。
- 原作者: [小红 / dhjddcn](https://github.com/dhjddcn)
- 魔改作者: [shell](https://github.com/biliblihuorong)
