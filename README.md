<p align="center">
  <strong>Halo Theme Butterfly 🦋 — Shell's Mod</strong><br>
  <sub>面向 Halo 2.x 的 Butterfly 卡片式博客主题</sub>
</p>

<p align="center">
  <a href="https://github.com/biliblihuorong/halo-theme-butterfly">主题仓库</a> ·
  <a href="https://butterfly.js.org/">Butterfly 原版文档</a> ·
  <a href="https://docs.halo.run/guide/use/themes">Halo 主题文档</a>
</p>

![主题预览](docs/renderings.png)

> 当前文档对应主题 `2.2.9`。本项目基于 [dhjddcn/halo-theme-butterfly](https://github.com/dhjddcn/halo-theme-butterfly) 深度定制，视觉与交互灵感来自 Jerry 的 [Hexo Butterfly](https://github.com/jerryc127/hexo-theme-butterfly)。原版文档中的 Hexo 命令、`_config.yml`、Front-matter 和标签外挂不能直接用于本主题，实际能力以本仓库代码和本文档为准。

## 目录

- [主题能力](#主题能力)
- [环境要求](#环境要求)
- [安装与首次配置](#安装与首次配置)
- [页面与路由](#页面与路由)
- [主题设置](#主题设置)
- [菜单与文章元数据](#菜单与文章元数据)
- [插件适配](#插件适配)
- [升级与配置迁移](#升级与配置迁移)
- [开发与构建](#开发与构建)
- [常见问题](#常见问题)
- [已知边界](#已知边界)

## 主题能力

- Butterfly 风格卡片布局，支持列表与平铺首页。
- 桌面端、平板和移动端响应式布局，支持左右侧边栏和移动端抽屉菜单。
- 浅色、深色、按时间自动切换和访客手动切换四种模式。
- 首页及多个列表页的首屏大图、打字机文案和页面加载动画。
- 图片懒加载、失败占位、随机封面和文章图片灯箱预览。
- 文章目录、阅读字数与时长、版权区、结构化数据和返回顶部。
- 内置 Prism 代码高亮，可配置标题、分割线、行号、复制、折叠及浅色/深色代码主题。
- 归档趋势图、分类玫瑰图和标签 Top 10 图表；ECharts 在图表接近视口时才加载。
- Halo 主菜单与二级菜单、搜索组件、评论组件及页脚注入点适配。
- 链接、瞬间、图库、朋友圈、Steam 游戏库和 B 站追番插件页面适配。
- Artalk 或 Halo 评论组件二选一，Umami v2/v3 公开分享统计。
- 自带 `404`、`500` 页面，静态资源支持本站、npm CDN 或自定义地址。

## 环境要求

| 项目 | 要求 |
| --- | --- |
| Halo | `theme.yaml` 声明 `>= 2.0.0` |
| 浏览器 | 支持 `IntersectionObserver`、`ResizeObserver`、CSS 自定义变量的现代浏览器 |
| 本地开发 | Node.js >=22.13、pnpm 11.20.0；构建工具为 Gulp 4 + Webpack 5 + Sass |
| Steam 页面 | 当前 `halo-plugin-steam` 自身要求 Halo `>= 2.22.1` |

所有插件均为可选项；未安装插件时，不要在菜单中添加相应插件路由。搜索和 Halo 评论入口会在插件不可用时自动隐藏。

## 安装与首次配置

### 使用发行包安装

1. 从主题仓库的 Release 页面下载 `theme-butterfly-dist.zip`。
2. 进入 Halo Console → 外观 → 主题 → 主题管理 → 安装主题。
3. 上传压缩包，选中 `Butterfly-shell` 并点击启用。
4. 升级主题或发现设置项缺失时，在主题详情页右上角 `···` 中执行“重载主题配置”。

不要直接把源码目录压缩后上传。Halo 运行时需要 `templates/`，而该目录是构建产物，不提交到 Git；请使用 Release 包或执行 `npm run build-zip` 自行生成。

### 首次必配

1. Console → 设置 → 基本设置：填写站点标题、副标题、Logo、Favicon 和外部访问地址。
2. Console → 外观 → 菜单：创建并设置一个主菜单。主题支持一级和二级菜单。
3. Console → 外观 → 主题设置 → 基本设置：将“作者用户名”填写为 Console → 用户中真实的用户名，例如 `admin`。这里不是显示名称。
4. 主题设置 → 加载与资源：初次使用建议保持“本站”，排除第三方 CDN 缓存或版本不一致问题。
5. 按需安装插件，再把 `/links`、`/moments` 等插件页面加入主菜单。

作者用户名错误时，`contributorFinder` 无法取得头像、昵称和简介，侧边栏会显示异常。

## 页面与路由

### Halo 核心页面

| 页面 | 模板源码 | 默认路由/来源 | 说明 |
| --- | --- | --- | --- |
| 首页 | `src/html/index.html` | `/` | 文章列表/平铺、打字机、分页 |
| 文章 | `src/html/post.html` | 文章固定链接 | 封面首屏、目录、代码块、评论、版权区 |
| 独立页面 | `src/html/page.html` | 页面固定链接 | 正文、目录、代码块、图片灯箱、评论 |
| 归档 | `src/html/archives.html` | `/archives` | 年月归档、文章趋势图、分页 |
| 分类集合 | `src/html/categories.html` | `/categories` | 分类列表和分类统计图 |
| 分类归档 | `src/html/category.html` | 分类固定链接 | 分类文章列表和分页 |
| 标签集合 | `src/html/tags.html` | `/tags` | 标签云和 Top 10 图表 |
| 标签归档 | `src/html/tag.html` | 标签固定链接 | 标签文章列表和分页 |
| 错误页 | `src/html/error/*.html` | `404`、`500` | 自定义错误提示 |

Halo 中的归档、分类和标签路由前缀可在系统设置中修改。主题侧边栏目前仍使用 `/archives`、`/categories` 和 `/tags` 固定链接；修改系统路由后请同步检查菜单和主题源码。

### 插件页面

| 页面 | 路由 | 数据提供者 | 主题能力 |
| --- | --- | --- | --- |
| 友链 | `/links` | `plugin-links` | 分组卡片、本站信息复制、Markdown/HTML 底部内容、评论 |
| 瞬间 | `/moments` | `plugin-moments` | 图文、视频、音频时间流，图片灯箱 |
| 图库 | `/photos` | `plugin-photos` | 分组筛选、图片网格、灯箱 |
| 朋友圈 | `/friends`、`/friends/page/{n}` | `plugin-friends` | 单栏/双栏、分页、Artalk |
| Steam | `/steam`、`/steam/page/{n}` | `halo-plugin-steam` | 个人资料、统计、最近游玩、游戏库、成就进度 |
| 追番 | `/bangumis`、`/bangumis/page/{n}` | `plugin-bilibili-bangumi` | 追番/追剧、想看/在看/已看筛选、分页 |

`theme.yaml` 还把友链、瞬间、图库、归档、分类列表和标签列表注册成了 Halo 独立页面模板。可在 Console → 内容 → 页面中选择这些模板，但插件数据页优先使用插件提供的固定路由，因为插件路由会注入完整的数据模型。未安装对应插件时选择插件模板，可能因 Finder 不存在而渲染失败。

## 主题设置

下文中的配置路径省略了共同前缀 `theme.config.`。所有设置都可以在 Console → 外观 → 主题设置中完成，不需要手改 YAML。

### 基本设置 `base`

| 配置 | 说明 |
| --- | --- |
| `base.metadata_name` | 作者真实用户名，供侧边栏和文章作者信息查询；必填 |
| `base.icp` | ICP 备案号，留空不显示 |
| `base.moe_icp` | 萌国 ICP 编号，留空不显示 |
| `base.police` | 公网安备号，留空不显示 |
| `base.site_birthday` | 建站日期，用于页脚年份和网站运行天数 |

### 外观 `style`

| 配置 | 说明 |
| --- | --- |
| `style.mode` | `auto` 按访客本地时间 06:00–18:00 使用浅色；`user` 显示切换按钮；`light`/`dark` 固定模式 |
| `style.font_family` | 浏览器默认、旧版内置字体，或 Noto Sans SC、Manrope + Noto Sans SC、Resource Han Rounded CN、GenSen Rounded TW；新增字体来源见 [`src/font/THIRD_PARTY_NOTICES.md`](src/font/THIRD_PARTY_NOTICES.md) |
| `style.body_background` | 浅色模式页面背景，填写合法 CSS 颜色 |
| `style.radius` | 卡片圆角，例如 `15px` |
| `style.shadow` | 卡片阴影，填写完整 `box-shadow` 值 |

主题色目前固定为浅色 `#1c69ed`、深色 `#3aa675`。导航栏颜色可以单独设置，主题设置中暂时没有主色选择器。

### 加载与资源 `loading`

页面 Loading 支持关闭、转圈、沙漏、交叉线和小圆点；DOM 就绪后关闭，异常时由 `loading.timeout` 强制解除遮罩。

| 配置 | 说明 |
| --- | --- |
| `loading.type` | Loading 类型，`null` 表示关闭 |
| `loading.timeout` | 最长显示时间，范围 1000–10000 ms |
| `loading.source.type` | 静态资源来源：本站、npm 或自定义 |
| `loading.source.custom` | 自定义静态资源根地址；目录内容必须与主题 `assets/` 完全一致 |
| `loading.source.npm` | unpkg/jsDelivr 等 npm CDN 根地址 |
| `loading.img.preload` | 图片真实地址加载前的占位图 |
| `loading.img.err` | 图片加载失败时的替代图 |
| `loading.img.random_enable` | 没有文章封面时是否调用随机图 API |
| `loading.img.random_link` | 随机图 API 地址；主题会附加查询参数避免复用同一张图 |

本站资源最稳妥。使用 npm 或自定义 CDN 时必须保证资源版本与当前主题一致，否则容易出现页面只有文字/图标、脚本报错或样式错乱。

### 导航栏 `nav`

以下每项都包含 `light` 和 `dark` 两个值，可填写十六进制、`rgb()`、`rgba()` 或 CSS 变量：

- `nav.font_color`：首屏顶部的默认文字颜色。
- `nav.active_font_color`：页面滚动后的文字颜色。
- `nav.active_hover_font_color`：滚动状态下的悬停文字颜色。
- `nav.active_background_color`：滚动状态下的导航背景。
- `nav.active_shadow`：滚动状态下的导航阴影。
- `nav.dropdown_background_color`：二级菜单背景。
- `nav.dropdown_font_color`：二级菜单文字。
- `nav.dropdown_hover_font_color`：二级菜单悬停颜色。

### 侧边栏 `aside`

| 配置 | 说明 |
| --- | --- |
| `aside.enable` | 通用侧边栏开关；文章目录侧栏的当前行为见“已知边界” |
| `aside.position` | `aside-left` 或 `aside-right` |
| `aside.button` | 作者卡片按钮名称和链接；名称支持 HTML |
| `aside.social` | 社交账号列表，图标填写 Font Awesome HTML，例如 `<i class="fa-brands fa-github"></i>` |
| `aside.notice` | 公告内容，支持 HTML |
| `aside.enable_category` | 展示最多 5 个一级分类 |
| `aside.enable_tags` | 展示最多 25 个有文章的标签 |
| `aside.enable_webInfo` | 显示文章数、运行时间和总访问量 |

按钮、社交图标和公告通过非转义 HTML 输出，只粘贴可信内容。外部脚本请优先使用 Halo 的代码注入功能，不要放进这些字段。

### 首页 `index`

| 配置 | 说明 |
| --- | --- |
| `index.enable_above` | 首页首屏开关 |
| `index.above_background` | 首页首屏背景图 |
| `index.typewriter_custom_text` | 打字机文案，多条使用 `|&|` 分隔 |
| `index.enable_typewriter_random_text` | 改用远程随机文案 API |
| `index.typewriter_random_api` | 随机文案 API 地址，当前版本建议返回纯文本 |
| `index.typewriter_api_value_format` | JSON 取值路径字段；当前版本前端实现尚不可靠，见“已知边界” |
| `index.post_layout` | `list` 列表或 `tile` 平铺，仅首页生效 |

### 页面首屏 `page_hero`

| 子配置 | 说明 |
| --- | --- |
| `page_hero.archives` | 归档页首屏开关和背景 |
| `page_hero.tags` | 标签集合与标签归档页首屏开关和背景 |
| `page_hero.categories` | 分类集合与分类归档页首屏开关和背景 |
| `page_hero.friends` | 朋友圈首屏、背景和单栏/双栏布局 |
| `page_hero.links` | 友链首屏、本站信息卡片、申请说明及移出记录（Markdown/HTML） |
| `page_hero.bangumis` | 追番页首屏开关和背景 |
| `page_hero.post` | 文章首屏开关；背景优先使用文章封面 |

瞬间、图库、Steam 和普通独立页面目前复用首页首屏配置。

友链交换规则、本站信息和移出记录的编辑入口为 **主题设置 → 页面设置 → 友链页 → 友链申请说明**，格式由上方“申请说明格式”选择。原入口名为“友链底部内容”，保存字段仍是 `page_hero.links.footer_content`，已有内容会继续使用。这个入口属于主题，链接管理插件负责维护友链条目；页面标题会跟随插件设置中的“页面标题”，插件未提供标题时使用“友情链接”。升级后若看不到这些设置，请在主题详情页的 `···` 菜单执行“重载主题配置”。

### 正文与代码块 `render`

| 配置 | 说明 |
| --- | --- |
| `render.enable_h_icon` | 为正文 `h1`–`h6` 添加标题图标 |
| `render.enable_code` | 启用主题内置 Prism；安装其他代码高亮插件时应关闭 |
| `render.enable_code_title` | 显示代码语言/标题 |
| `render.enable_code_hr` | 显示标题与代码之间的分割线 |
| `render.enable_code_line` | 显示行号 |
| `render.enable_code_copy` | 显示复制按钮 |
| `render.enable_code_expander` | 显示折叠/展开按钮 |
| `render.code_theme_light` | 浅色模式 Prism 主题 |
| `render.code_theme_dark` | 深色模式 Prism 主题 |

代码主题下拉框已列出仓库内全部 Prism 主题。单篇文章还可以通过文章元数据“启用代码复制”覆盖全局复制按钮设置。

### Umami 统计 `umami`

主题不再接收 Umami 用户名或密码，只使用公开分享接口：

1. 在 Umami 网站设置中开启 Share URL。
2. 将 Umami 实例地址填入 `umami.url`，末尾不带 `/`。
3. 把分享链接 `/share/` 后面的字符串填入 `umami.share_id`。
4. 设置 `umami.cache_minutes`，默认 30 分钟。

前端兼容 Umami v3 的 share token 流程，并在失败时回退 v2 `/api/share/{id}/stats`。请求失败时，侧边栏保留 Halo 自带的访问量；请检查分享链接是否公开、HTTPS 和跨域配置。

### 评论 `comment`

`comment.provider` 可选关闭、Artalk 或 Halo 评论插件。

#### Halo 评论插件

安装并启用 `PluginCommentWidget`，选择“Halo 评论插件”，同时确保文章/页面自身开启“允许评论”。搜索按钮同理由 `PluginSearchWidget` 提供。

#### Artalk

| 配置 | 说明 |
| --- | --- |
| `comment.artalk_server` | Artalk 服务端 HTTPS 地址，末尾不带 `/` |
| `comment.artalk_site` | 与 Artalk 控制中心完全一致的站点名 |
| `comment.artalk_asset_source` | 主题内置、Artalk 服务端或自定义客户端资源 |
| `comment.artalk_custom_js/css` | 选择自定义资源时使用 |
| `comment.artalk_locale` | 简中、繁中、自动、英语、日语、韩语、法语或俄语 |
| `comment.prefer_remote_conf` | 是否优先使用 Artalk 控制中心的界面配置 |
| `comment.artalk_css` | 在基础样式之后加载的额外 CSS |
| `comment.pagekey_trailing_slash` | 是否给 pageKey 追加 `/`；需与旧评论数据保持一致 |
| `comment.artalk_enable_post/page` | 文章与普通页面的独立开关 |
| `comment.artalk_enable_friends` | 朋友圈评论开关 |
| `comment.artalk_friends_page_key/title` | 朋友圈在 Artalk 中的页面标识与标题 |

本地 Artalk 客户端资源最稳定。执行 `npm run sync-artalk -- --server https://artalk.example.com` 可以从指定服务端同步新版客户端源码，再重新构建主题。

### 性能优化 `performance`

- `performance.preconnect`：每行一个完整 URL，提前建立 DNS/TCP/TLS，建议只放 2–4 个必用来源。
- `performance.dns_prefetch`：每行一个域名或 URL，仅做 DNS 预解析，适合可能使用的第三方来源。

## 菜单与文章元数据

### 菜单图标

`annotation-setting.yaml` 为 Halo 菜单项增加了“图标”字段。编辑菜单项时填写 Font Awesome class，例如：

```text
fa-solid fa-house
fa-brands fa-github
fa-solid fa-images
```

主题最多渲染两级菜单。三级及更深层级不会出现在当前导航结构中。

### 单篇文章关闭代码复制

文章元数据中提供“启用代码复制”，值为字符串 `true`/`false`。全局开启复制后，可在某篇文章上选择 `false` 单独隐藏复制按钮。

## 插件适配

| 插件 | 用途 | 项目地址 |
| --- | --- | --- |
| 搜索组件 `PluginSearchWidget` | 顶部搜索入口 | [halo-dev/plugin-search-widget](https://github.com/halo-dev/plugin-search-widget) |
| 评论组件 `PluginCommentWidget` | Halo 原生评论区域 | [halo-dev/plugin-comment-widget](https://github.com/halo-dev/plugin-comment-widget) |
| 链接管理 `plugin-links` | `/links` | [halo-sigs/plugin-links](https://github.com/halo-sigs/plugin-links) |
| 瞬间 `plugin-moments` | `/moments` | [halo-sigs/plugin-moments](https://github.com/halo-sigs/plugin-moments) |
| 图库 `plugin-photos` | `/photos` | [halo-sigs/plugin-photos](https://github.com/halo-sigs/plugin-photos) |
| 朋友圈 `plugin-friends` | `/friends` | [chengzhongxue/plugin-friends](https://github.com/chengzhongxue/plugin-friends) |
| Steam 信息展示 | `/steam` | [Tim0x0/halo-plugin-steam](https://github.com/Tim0x0/halo-plugin-steam) |
| Bilibili 追番 | `/bangumis` | [Roozenlz/plugin-bilibili-bangumi](https://github.com/Roozenlz/plugin-bilibili-bangumi) |

安装方式：Console → 插件 → 安装，从应用市场、远程地址或本地 JAR 安装并启用。插件页面的数据、分页大小、同步任务和 API 凭据在各插件设置中配置，主题只负责展示。

评论支持范围：

- 文章、普通独立页面：Halo 评论插件或 Artalk。
- 友链：插件路由下可使用 Artalk；Halo 评论需要模板同时取得对应 `SinglePage` 模型。
- 朋友圈：当前模板只集成 Artalk。
- 瞬间、图库、Steam、追番：当前主题模板未放置评论区域。

本次完整修复和升级步骤见 [v2.2.9 发布说明](docs/releases/v2.2.9.md)。发行包同时附带 ZIP SHA-256 与逐文件 manifest，版本号、提交和资源可互相核对。

## 升级与配置迁移

1. 升级前备份 Halo 数据库和主题配置。
2. 上传新发行包并执行“重载主题配置”。重载只更新设置结构，不等于重置已有设置。
3. 检查新增设置的默认值、静态资源来源和浏览器缓存。
4. 逐页检查首页、文章、归档、分类、标签及已安装插件页面。

旧版本曾把 `post`、`archives`、`tags`、`categories`、`friends`、`links`、`bangumis` 作为顶层配置组；现在统一在 `page_hero` 下，旧 `card` 样式迁入 `style`。迁移支持部分已迁移的配置、保留已有新值，并兼容分组 JSON 与旧 `data.default`：

```bash
npm run migrate-page-hero -- theme-butterfly-configMap.backup.yaml -o migrated.yaml
```

原地修改备份文件：

```bash
npm run migrate-page-hero -- theme-butterfly-configMap.backup.yaml --in-place
```

先对备份执行并检查输出，再把迁移后的 ConfigMap 导入实际环境。

## 开发与构建

### 目录结构

```text
halo-theme-butterfly/
├─ src/html/                 Thymeleaf 模板源码
│  ├─ views/                布局、导航、侧边栏、页脚、组件
│  └─ error/                404/500 页面
├─ src/scss/                核心、组件和页面样式
├─ src/js/                  核心逻辑、模块和页面入口
├─ src/plugins/             Prism、Artalk、Font Awesome、Loading 等资源
│  └─ fontawesome/            子集化产物（webfonts/CSS），全量字体由 npm 依赖提供
├─ templates/               构建产物；被 Git 忽略
├─ theme.yaml               主题元信息与自定义模板
├─ settings.yaml            Console 主题设置表单
├─ annotation-setting.yaml  菜单/文章元数据扩展
├─ gulpfile.js              构建与打包任务
└─ scripts/                 Artalk 同步、配置迁移、Font Awesome 子集化脚本
```

### 常用命令

```bash
pnpm install --frozen-lockfile

# 监听 HTML/SCSS/JS 源码变化
npm run dev

# 生成 templates/
npm run build

# 清理、完整构建并生成 theme-butterfly-dist.zip
npm run build-zip
```

按类型单独构建：

```bash
npm run build-html
npm run build-css
npm run build-js
```

`npm run zip` 只打包现有 `templates/`，不会先构建。发布前优先使用 `npm run build-zip`。

### Font Awesome 图标子集化

主题使用 Font Awesome Free 6.6.0（npm 包 `@fortawesome/fontawesome-free`，字体 SIL OFL 1.1 / 图标 CC BY 4.0 / 代码 MIT），通过子集化只分发实际用到的图标：solid 字体从约 154KiB 压缩到 4KiB 左右，CSS 精简到约 11KiB。仓库只保留 Free 子集字体，不提交 FA 全量字体二进制（Pro 许可不允许再分发，Free 全量资源随 npm 安装）。`npm run build` / `build-zip` 会自动执行子集化，无需手动关注。

生效的图标 = 自动扫描（`src/html`、`src/js`、`settings.yaml` 中出现的图标类）+ 白名单（`scripts/fontawesome-whitelist.txt`）。新增图标分两种情况：

- **改模板或 JS**：直接写图标类即可，下次构建自动纳入子集。
- **后台“主题设置”里配置**（如社交图标）：图标类存在用户配置里，扫描不到。把图标名加进 `scripts/fontawesome-whitelist.txt`（一行一个，`fa-brands fa-qq` 指定字体族，裸 `fa-qq` 表示加入所有包含该图标的族），然后重新 `npm run build-zip`。

```bash
# 只重新生成子集字体和 CSS，不触发完整构建
npm run subset:fa
```

注意：白名单里写的图标必须存在于 Font Awesome Free（`fa-x-twitter` 在 6.4.2+ 可用；`fa-netease-cloud-music` 不在 FA 图标集内，写了会被脚本告警并忽略）。Pro 专属样式（light/thin/duotone/sharp）不可用，请统一按 `fa-solid` 使用。全量字体与完整 CSS 由 npm 依赖提供，升级 FA 版本前请先确认子集化脚本兼容新版的 CSS 格式。

### 依赖说明

自 `2.2.8` 起主题前端不再依赖 jQuery（原 `common.min.js` 传输体积约 100KiB，去 jQuery 后约 67KiB）。全部交互改用原生 DOM API：事件委托用 `addEventListener` + `closest`，显隐动画用 CSS transition / class 切换，Ajax 用 `fetch`。二次开发时请直接使用原生 API，不要重新引入 jQuery。

在 Halo 工作目录中以源码方式挂载时，主题文件夹必须命名为 `theme-butterfly`，与 `theme.yaml` 的 `metadata.name` 一致。仓库名可以保持 `halo-theme-butterfly`，但复制到 Halo themes 目录时需要改名。

## 常见问题

### 安装后页面空白或只有少量图标

- 确认安装的是 `theme-butterfly-dist.zip`，包内必须有 `templates/`。
- 把静态资源来源切回“本站”。
- 执行“重载主题配置”，再强制刷新浏览器。
- 若使用 CDN，检查 CSS/JS 请求是否 404、是否混入了其他版本资源。

### 侧边栏作者信息为空

“作者用户名”必须等于 Console → 用户中的用户名，不是昵称或显示名称；用户名大小写也要一致。

### 搜索按钮不显示

安装并启用搜索组件插件 `PluginSearchWidget`。模板检测不到插件时会主动隐藏入口。

### 评论不显示

- 检查 `comment.provider` 是否选择正确。
- Halo 评论需要启用 `PluginCommentWidget`。
- Artalk 需要正确的服务端、站点名和可访问的客户端资源。
- 文章或独立页面本身必须开启“允许评论”。
- 不要随意更改 Artalk pageKey 末尾 `/` 规则，否则旧评论会看似丢失。

### 插件页面 404、空数据或 500

确认对应插件已经安装并启用，并优先访问插件声明的固定路由。把插件模板选给普通独立页面但未安装插件时，模板中的 Finder 无法使用。

### 代码块样式重复或冲突

主题已内置 Prism。安装 Shiki、highlight.js、Prism 等其他代码高亮插件时，请关闭“启用代码块”，只保留一个渲染器。

### Umami 一直显示 Halo 访问量

确认 Umami 已开启 Share URL，地址没有尾部 `/`，分享 ID 正确，并检查浏览器控制台中的 CORS/HTTPS 错误。主题不会把 Umami 登录凭据发送到访客浏览器。

### Loading 长时间不消失

主题会在 DOM 就绪或 `loading.timeout` 到期后解除遮罩。先切换到关闭或把超时设为 3000 ms，再检查自定义/CDN 资源是否加载失败。

## 已知边界

- 当前界面文案和 `<html lang>` 固定为简体中文，仓库没有 i18n 资源。
- 首页随机文案对纯文本响应最稳定；JSON 响应需正确配置 `index.typewriter_api_value_format` 取值路径，取值失败时前端会显示提示文案。
- 普通页面、瞬间、图库和 Steam 没有独立首屏设置，当前复用首页配置。
- 原版 Hexo Butterfly 的标签外挂、数学、播放器、聊天、各类第三方评论等功能不会自动出现在本 Halo 移植版中。
- 主题未提供 `author.html`。测试已覆盖评论/主题同步、存储、目录、分页、脚注、配置迁移、高亮失败及图表；发布仍需完整构建与浏览器回归。

## 许可证与致谢

本主题遵循 [GPL-3.0](LICENSE) 开源协议。分发、修改和二次开发时请保留许可证与原作者署名。

- Butterfly 原作者：[Jerry](https://github.com/jerryc127)
- Halo 移植基础：[小红 / dhjddcn](https://github.com/dhjddcn)
- 当前定制维护：[shell](https://github.com/biliblihuorong)
- 原版使用与视觉参考：[Butterfly 文档](https://butterfly.js.org/)
