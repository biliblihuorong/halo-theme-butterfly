# 主题配置与使用

本文介绍 Butterfly-shell 的安装与配置，配置项与当前 `2.3.2` 版本的设置结构对应。

[项目介绍](../README.md) · [开发与构建](development.md) · [更新记录](releases/)

## 环境要求

| 项目 | 要求 |
| --- | --- |
| Halo | [主题元信息](../theme.yaml) 声明 `>= 2.0.0`；插件另有兼容要求 |
| 浏览器 | 支持 `IntersectionObserver`、`ResizeObserver`、CSS 自定义变量的现代浏览器 |
| 本地开发 | Node.js >=22.13、pnpm 11.20.0，详见[开发与构建](development.md) |
| 插件页面 | 安装与当前 Halo 版本兼容的对应插件；以插件自身要求为准 |

所有插件均为可选项；未安装插件时，不要在菜单中添加相应插件路由。搜索和 Halo 评论入口会在插件不可用时自动隐藏。

## 安装与首次配置

### 使用发行包安装

1. 从[发行版页面](https://github.com/biliblihuorong/halo-theme-butterfly/releases)下载 `theme-butterfly-dist.zip`。
2. 进入 Halo Console → 外观 → 主题 → 主题管理 → 安装主题。
3. 上传压缩包，选中 `Butterfly-shell` 并点击启用。
4. 升级主题或发现设置项缺失时，在主题详情页右上角 `···` 中执行“重载主题配置”。

不要直接把源码目录压缩后上传。Halo 运行时需要 `templates/`，而该目录是构建产物，不提交到 Git；请使用 Release 包或按[开发文档](development.md)执行 `pnpm build-zip` 自行生成。

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
| 独立页面 | `src/html/page.html` | 页面固定链接 | 正文、代码块、图片灯箱、评论与通用侧栏；不提供文章目录 |
| 归档 | `src/html/archives.html` | `/archives` | 年月归档、文章趋势图、分页 |
| 分类集合 | `src/html/categories.html` | `/categories` | 分类列表和分类统计图 |
| 分类归档 | `src/html/category.html` | 分类固定链接 | 分类文章列表和分页 |
| 标签集合 | `src/html/tags.html` | `/tags` | 标签云和 Top 10 图表 |
| 标签归档 | `src/html/tag.html` | 标签固定链接 | 标签文章列表和分页 |
| 错误页 | `src/html/error/*.html` | `404`、`500` | 自定义错误提示 |

表中归档、分类和标签路径是默认值，可在 Halo 系统设置中修改。在支持公开路由数据的 Halo 版本（2.22+）中，主题脚本初始化后，桌面与移动侧栏的文章、分类和标签入口会跟随系统路由设置；旧版 Halo 保留 `/archives`、`/categories` 和 `/tags` 默认入口。主菜单中手动填写的链接需要自行同步。

### 插件页面

| 页面 | 路由 | 数据提供者 | 主题能力 |
| --- | --- | --- | --- |
| 友链 | `/links` | `plugin-links` | 分组卡片、本站信息复制、Markdown/HTML 底部内容、评论 |
| 瞬间 | `/moments` | `plugin-moments` | 图文时间流、图片灯箱与视频控件 |
| 图库 | `/photos` | `plugin-photos` | 分组筛选、图片网格、灯箱 |
| 朋友圈 | `/friends`、`/friends/page/{n}` | `plugin-friends` | 单栏/双栏、分页、Artalk |
| Steam | `/steam`、`/steam/page/{n}` | `halo-plugin-steam` | 个人资料、统计、最近游玩、游戏库、成就进度 |
| 追番 | `/bangumis`、`/bangumis/page/{n}` | `plugin-bilibili-bangumi` | 追番/追剧、想看/在看/已看筛选、分页 |

[`theme.yaml`](../theme.yaml) 还把友链、瞬间、图库、归档、分类列表和标签列表注册成了 Halo 独立页面模板。插件数据页应优先使用插件提供的固定路由，以取得完整的数据模型。普通独立页面选择插件模板并不保证能取得同样的数据：友链模板依赖插件路由注入的 `groups`，没有自动查询全部友链的后备逻辑；瞬间和图库模板的后备查询固定为第 1 页、最多 999 条。未安装对应插件时，也可能因 Finder 不存在而渲染失败。

瞬间和图库模板目前都没有后续分页入口，多页浏览尚未完善。瞬间中的音频没有原生 `controls`，主题也未提供音频播放器；视频有原生播放控件。两页均复用首页首屏配置，未放置主题评论区域。

## 访客阅读工具

向下滚动页面后，右下角浮动工具栏提供以下入口，无需额外配置：

| 工具 | 行为 |
| --- | --- |
| 简繁切换 | 点击“繁”将主题界面和正文转换为台湾正体，按钮变为“简”；再次点击恢复原文。首次使用时按需加载本地词库，不依赖外部翻译接口 |
| 宽屏阅读 | 在宽度大于 1100px 的文章页和普通独立页面中隐藏侧栏，让正文占满原有主容器；再次点击恢复。手机端保持原有布局；未显示侧栏的页面不提供此按钮 |
| 前往评论 | 当前页面有可用评论区时才显示；点击后定位评论区并立即启动 Artalk 加载，同时保留滚动到附近自动加载。也支持 Halo 评论组件 |

简繁转换与宽屏偏好会保存在访客当前浏览器中，不改变主题后台配置和文章数据。浏览器禁止本地存储时仍可切换当前页，但不会记住偏好。

简繁转换跳过代码块、行内代码、表单输入、第三方评论区域，以及标记为 `translate="no"` 或非中文 `lang` 的内容。它是文字显示转换，不提供外语翻译。宽屏模式下桌面文章目录随侧栏一起隐藏，退出宽屏后恢复；手机目录行为不变。普通独立页面仍不新增目录。

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
| `style.font_family` | 浏览器默认、旧版内置字体，或 Noto Sans SC、Manrope + Noto Sans SC、Resource Han Rounded CN、GenSen Rounded TW；新增字体来源见 [字体来源与许可](../src/font/THIRD_PARTY_NOTICES.md) |
| `style.body_background` | 浅色模式页面背景，填写合法 CSS 颜色 |
| `style.radius` | 卡片圆角，例如 `15px` |
| `style.shadow` | 卡片阴影，填写完整 `box-shadow` 值 |

主题色目前固定为浅色 `#1c69ed`、深色 `#3aa675`。导航栏颜色可以单独设置，主题设置中暂时没有主色选择器。

### 加载与资源 `loading`

页面 Loading 支持关闭、转圈、沙漏、交叉线和小圆点，默认关闭。遮罩只在页面 300 ms 内未就绪时才出现，DOM 就绪后关闭，异常时由 `loading.timeout` 强制解除遮罩。

| 配置 | 说明 |
| --- | --- |
| `loading.type` | Loading 类型，`null` 表示关闭 |
| `loading.timeout` | 最长显示时间，范围 1000–10000 ms |
| `loading.source.type` | 静态资源来源：本站、npm 或自定义 |
| `loading.source.site` | 本站资源根路径，默认 `/themes/theme-butterfly/assets/`，由主题预设 |
| `loading.source.custom` | 自定义静态资源根地址；目录内容必须与主题 `assets/` 完全一致 |
| `loading.source.npm` | unpkg/jsDelivr 等 npm CDN 根地址 |
| `loading.img.preload` | 图片真实地址加载前的占位图 |
| `loading.img.err` | 图片加载失败时的替代图 |
| `loading.img.random_enable` | 没有文章封面时是否调用随机图 API |
| `loading.img.random_link` | 随机图 API 地址；主题会附加查询参数避免复用同一张图 |

默认使用“本站”。内置 npm CDN 地址指向公共的 `halo-theme-butterfly` 包，且没有锁定版本，不能保证提供本 fork 的对应资源；请求中的 `?v=主题版本` 也不会改变实际取得的 npm 包版本。

需要 CDN 时，建议把当前发行包的 `templates/assets/` 完整上传到自有静态资源服务，在“自定义”中填写该目录的访问根地址并保留末尾 `/`。资源必须与安装的主题版本一致，包含异步脚本、字体和 Prism 语言文件；仅替换主 CSS/JS 不够。

### 导航栏 `nav`

以下每项分别设置浅色和深色模式。颜色字段可填写十六进制、`rgb()`、`rgba()` 或 CSS 变量；阴影字段填写完整 CSS 阴影值。

| 浅色配置 / 深色配置 | 说明 |
| --- | --- |
| `nav.font_color.light` / `nav.font_color.dark` | 首屏顶部的默认文字颜色 |
| `nav.active_font_color.light` / `nav.active_font_color.dark` | 页面滚动后的文字颜色 |
| `nav.active_hover_font_color.light` / `nav.active_hover_font_color.dark` | 滚动状态下的悬停文字颜色 |
| `nav.active_background_color.light` / `nav.active_background_color.dark` | 滚动状态下的导航背景 |
| `nav.active_shadow.light` / `nav.active_shadow.dark` | 滚动状态下的导航阴影 |
| `nav.dropdown_background_color.light` / `nav.dropdown_background_color.dark` | 二级菜单背景 |
| `nav.dropdown_font_color.light` / `nav.dropdown_font_color.dark` | 二级菜单文字 |
| `nav.dropdown_hover_font_color.light` / `nav.dropdown_hover_font_color.dark` | 二级菜单悬停颜色 |

### 侧边栏 `aside`

| 配置 | 说明 |
| --- | --- |
| `aside.enable` | 通用侧边栏和文章目录侧栏开关；普通独立页面使用通用侧栏，不显示目录 |
| `aside.position` | `aside-left` 或 `aside-right` |
| `aside.button.name` | 作者卡片按钮名称，支持 HTML |
| `aside.button.link` | 作者卡片按钮链接 |
| `aside.social[].name` | 社交账号名称；`[]` 表示列表中的每一项 |
| `aside.social[].icon` | 社交图标 HTML，例如 `<i class="fa-brands fa-github"></i>`；可用图标受内置子集限制 |
| `aside.social[].link` | 社交账号链接 |
| `aside.notice` | 公告内容，支持 HTML |
| `aside.enable_category` | 展示最多 5 个一级分类 |
| `aside.enable_tags` | 展示最多 25 个有文章的标签 |
| `aside.enable_webInfo` | 显示文章数、运行时间和总访问量 |

菜单和社交图标均使用内置 Font Awesome 子集，新增图标的方法见[图标子集化](development.md#font-awesome-图标子集化)。

按钮、社交图标和公告通过非转义 HTML 输出，只粘贴可信内容。外部脚本请优先使用 Halo 的代码注入功能，不要放进这些字段。

### 首页 `index`

| 配置 | 说明 |
| --- | --- |
| `index.enable_above` | 首页首屏开关 |
| `index.above_background` | 首页首屏背景图 |
| `index.typewriter_custom_text` | 打字机文案，多条使用 `\|&\|` 分隔 |
| `index.enable_typewriter_random_text` | 改用远程随机文案 API |
| `index.typewriter_random_api` | 随机文案 API 地址，支持纯文本或 JSON 响应 |
| `index.typewriter_api_value_format` | JSON 响应中的字符串取值路径，以 `.` 分隔，例如 `data.text` |
| `index.post_layout` | `list` 列表或 `tile` 平铺，仅首页生效 |

例如 API 返回 `{"data":{"text":"今天也要开心"}}` 时，取值路径填写 `data.text`。纯文本响应不需要路径；JSON 路径为空、取值不是非空字符串或请求失败时，页面会显示相应提示。远程 API 还需要允许浏览器跨域访问。

### 页面首屏 `page_hero`

| 配置 | 说明 |
| --- | --- |
| `page_hero.archives.enable_above` | 归档页首屏开关 |
| `page_hero.archives.above_background` | 归档页首屏背景 |
| `page_hero.tags.enable_above` | 标签集合与标签归档页首屏开关 |
| `page_hero.tags.above_background` | 标签集合与标签归档页首屏背景 |
| `page_hero.categories.enable_above` | 分类集合与分类归档页首屏开关 |
| `page_hero.categories.above_background` | 分类集合与分类归档页首屏背景 |
| `page_hero.friends.enable_above` | 朋友圈首屏开关 |
| `page_hero.friends.above_background` | 朋友圈首屏背景 |
| `page_hero.friends.layout` | 朋友圈 `single` 单栏 / `double` 双栏布局 |
| `page_hero.links.enable_above` | 友链首屏开关 |
| `page_hero.links.above_background` | 友链首屏背景 |
| `page_hero.links.enable_site_info` | 展示本站信息卡片，便于复制站点信息交换友链 |
| `page_hero.links.footer_content_type` | 申请说明格式：`markdown` 或 `html` |
| `page_hero.links.footer_content` | 友链申请说明，可填写规则、本站信息及移出记录 |
| `page_hero.bangumis.enable_above` | 追番页首屏开关 |
| `page_hero.bangumis.above_background` | 追番页首屏背景 |
| `page_hero.post.enable_above` | 文章首屏开关，背景使用文章封面 |

瞬间、图库、Steam 和普通独立页面目前复用首页首屏配置。

友链交换规则、本站信息和移出记录的编辑入口为 **主题设置 → 页面设置 → 友链页 → 友链申请说明**，格式由上方“申请说明格式”选择。原入口名为“友链底部内容”，保存字段仍是 `page_hero.links.footer_content`，已有内容会继续使用。这个入口属于主题，链接管理插件负责维护友链条目；页面标题会跟随插件设置中的“页面标题”，插件未提供标题时使用“友情链接”。升级后若看不到这些设置，请在主题详情页的 `···` 菜单执行“重载主题配置”。

### 正文与代码块 `render`

| 配置 | 说明 |
| --- | --- |
| `render.enable_h_icon` | 为正文 `h1`–`h6` 添加标题图标 |
| `render.enable_code` | 启用主题内置 Prism；会跳过 `shiki-code` 容器中的代码块，全部代码块都在该容器内时不加载 Prism |
| `render.enable_code_title` | 显示代码语言/标题 |
| `render.enable_code_hr` | 显示标题与代码之间的分割线 |
| `render.enable_code_line` | 显示行号 |
| `render.enable_code_copy` | 显示复制按钮 |
| `render.enable_code_expander` | 显示折叠/展开按钮 |
| `render.code_theme_light` | 浅色模式 Prism 主题 |
| `render.code_theme_dark` | 深色模式 Prism 主题 |

主题对 Shiki 的自动跳过依据是 `shiki-code` 容器，不会自动识别所有第三方高亮插件。其他插件或不同输出结构出现样式冲突时，请关闭主题“启用代码块”，交给所用插件负责高亮。

Prism 核心与常用插件约 18KB（gzip），其他语言在文章用到时才从 `plugins/prism/components-<Prism 版本>/` 加载；Prism 不支持的语言按纯文本显示，不会产生请求。代码主题下拉框已列出仓库内全部 Prism 主题。单篇文章还可以通过文章元数据“启用代码复制”覆盖全局复制按钮设置。

### Umami 统计 `umami`

主题不再接收 Umami 用户名或密码，只使用公开分享接口：

1. 在 Umami 网站设置中开启 Share URL。
2. 将 Umami 实例地址填入 `umami.url`，末尾不带 `/`。
3. 把分享链接 `/share/` 后面的字符串填入 `umami.share_id`。
4. 设置 `umami.cache_minutes`，默认 30 分钟。
5. 开启 `umami.enable`。侧边栏还需启用 `aside.enable` 和 `aside.enable_webInfo` 才会展示总访问量。

前端兼容 Umami v3 的 share token 流程，并在失败时回退 v2 `/api/share/{id}/stats`。取得统计后更新侧边栏；缓存读写不可用时仍会显示成功取得的统计。请求失败时保留 Halo 自带的访问量，请检查分享链接是否公开、HTTPS 和跨域配置。

### 评论 `comment`

`comment.provider` 可选 `none`（关闭，默认）、`artalk`（Artalk）或 `halo`（Halo 评论插件）。

#### Halo 评论插件

安装并启用 `PluginCommentWidget`，选择“Halo 评论插件”，同时确保文章/页面自身开启“允许评论”。搜索按钮同理由 `PluginSearchWidget` 提供。

#### Artalk

| 配置 | 说明 |
| --- | --- |
| `comment.artalk_server` | Artalk 服务端 HTTPS 地址，末尾不带 `/` |
| `comment.artalk_site` | 与 Artalk 控制中心完全一致的站点名 |
| `comment.artalk_asset_source` | 主题内置、Artalk 服务端或自定义客户端资源 |
| `comment.artalk_custom_js` | 选择自定义资源时使用的客户端 JS 地址 |
| `comment.artalk_custom_css` | 选择自定义资源时使用的客户端 CSS 地址 |
| `comment.artalk_locale` | 简中、繁中、自动、英语、日语、韩语、法语或俄语 |
| `comment.prefer_remote_conf` | 是否优先使用 Artalk 控制中心的界面配置 |
| `comment.artalk_css` | 在基础样式之后加载的额外 CSS |
| `comment.pagekey_trailing_slash` | 是否给 pageKey 追加 `/`；需与旧评论数据保持一致 |
| `comment.artalk_enable_post` | 文章页 Artalk 开关，还需文章自身开启“允许评论” |
| `comment.artalk_enable_page` | 普通独立页面 Artalk 开关，还需页面自身开启“允许评论” |
| `comment.artalk_enable_links` | 友链页 Artalk 开关；取得对应独立页面时，还需该页面开启“允许评论” |
| `comment.artalk_enable_friends` | 朋友圈评论开关 |
| `comment.artalk_friends_page_key` | 朋友圈在 Artalk 中的唯一页面标识，修改后旧评论不会自动迁移 |
| `comment.artalk_friends_page_title` | 朋友圈在 Artalk 控制中心与通知中显示的页面标题 |

评论区接近视口（或通过 `#atk-` 评论锚点进入页面）时才加载 Artalk 资源，不与正文争抢带宽。本地 Artalk 客户端资源最稳定。需要同步新版客户端源码时，见[开发文档中的 Artalk 资源同步](development.md#artalk-客户端资源同步)，完成后重新构建主题。

### 性能优化 `performance`

- `performance.preconnect`：每行一个完整 URL，提前建立 DNS/TCP/TLS，建议只放 2–4 个必用来源。
- `performance.dns_prefetch`：每行一个域名或 URL，仅做 DNS 预解析，适合可能使用的第三方来源。

首屏背景图在解析 `<head>` 时就以高优先级预加载（随机图 API 除外），首屏配置脚本带 `data-cfasync="false"`，在 Cloudflare Rocket Loader 下也会立即执行。访客在系统中开启“减少动态效果”时，主题关闭过渡、动画、平滑滚动和打字机效果。

#### 图片预览图

图床能按规则生成缩略图时开启 `performance.preview_enable`：

| 位置 | 行为 |
| --- | --- |
| 文章列表与归档封面 | 只加载预览图，失败时回退原图 |
| 首屏背景、正文图片 | 先显示预览图，原图加载完成后替换；预览图失败时直接加载原图 |
| 图片灯箱 | 始终打开原图 |

| 配置 | 说明 |
| --- | --- |
| `performance.preview_mode` | `query` 追加查询参数、`path` 替换路径前缀、`suffix` 在扩展名前插入后缀 |
| `performance.preview_query` | 例如 `w=400`；原图已有参数时用 `&` 连接 |
| `performance.preview_path_from` | 原图路径前缀，例如 `/i/`，只处理以此前缀开头的路径 |
| `performance.preview_path_to` | 替换后的预览图路径前缀，例如 `/thumbnails/` |
| `performance.preview_suffix` | 例如 `_thumb`：`a.webp` → `a_thumb.webp` |
| `performance.preview_hosts` | 每行一个图床域名；留空时只处理本站域名下的图片 |

Halo 附件库中的本地图片已由 Halo 输出 `srcset` 缩略图，主题不会再改写带 `srcset` 的图片。

## 菜单与文章元数据

### 菜单图标

`annotation-setting.yaml` 为 Halo 菜单项增加了“图标”字段。编辑菜单项时填写 Font Awesome class，例如：

```text
fa-solid fa-house
fa-brands fa-github
fa-solid fa-book
```

上述示例已包含在主题图标子集中。菜单和社交图标的可选范围相同：Font Awesome Free 中存在的图标，也需要被当前主题子集收录才会显示；未收录的图标请按[开发文档](development.md#font-awesome-图标子集化)加入带字体族的白名单并重新构建。

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

各版本变化见[更新记录](releases/)，其中 [v2.3.0](releases/v2.3.0.md) 介绍图片预览与按需资源加载，[v2.2.9](releases/v2.2.9.md) 记录该版本的修复与升级步骤。发行包附带 ZIP SHA-256 和逐文件 manifest，校验方式见[开发文档](development.md#发行包与校验)。

## 升级与配置迁移

1. 升级前备份 Halo 数据库和主题配置。
2. 上传新发行包并执行“重载主题配置”。重载只更新设置结构，不等于重置已有设置。
3. 检查新增设置的默认值、静态资源来源和浏览器缓存。
4. 逐页检查首页、文章、归档、分类、标签及已安装插件页面。

旧版本曾把 `post`、`archives`、`tags`、`categories`、`friends`、`links`、`bangumis` 作为顶层配置组；现在统一在 `page_hero` 下，旧 `card` 样式迁入 `style`。迁移支持部分已迁移的配置、保留已有新值，并兼容分组 JSON 与旧 `data.default`：

```bash
node scripts/migrate-page-hero.js theme-butterfly-configMap.backup.yaml -o migrated.yaml
```

原地修改备份文件：

```bash
node scripts/migrate-page-hero.js theme-butterfly-configMap.backup.yaml --in-place
```

以上命令在已安装依赖的主题源码目录中执行。先对备份操作并检查输出，再把迁移后的 ConfigMap 导入实际环境。

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

确认对应插件已经安装并启用，并优先访问插件声明的固定路由。普通独立页面选择插件模板可能缺少路由数据；友链模板尤其依赖插件路由注入的分组。未安装插件时，模板中的 Finder 也无法使用。

### 代码块样式重复或冲突

主题内置 Prism，并跳过 `shiki-code` 容器中的代码块。若使用其他高亮插件，或 Shiki 的输出不使用这个容器，请关闭主题“启用代码块”，避免重复处理。

### Umami 一直显示 Halo 访问量

确认 Umami 已开启 Share URL，地址没有尾部 `/`，分享 ID 正确，并检查浏览器控制台中的 CORS/HTTPS 错误。主题不会把 Umami 登录凭据发送到访客浏览器。

### Loading 长时间不消失

主题会在 DOM 就绪或 `loading.timeout` 到期后解除遮罩。先切换到关闭或把超时设为 3000 ms，再检查自定义/CDN 资源是否加载失败。

## 当前功能范围

- 主题默认简体中文，提供访客端简繁显示切换；仓库没有其他语言的 i18n 资源。
- 普通独立页面、瞬间、图库和 Steam 复用首页首屏配置；普通独立页面不提供文章目录。
- 主题未提供 `author.html` 作者归档模板。
- 原版 Hexo Butterfly 的命令、`_config.yml`、Front-matter、标签外挂、数学与播放器等功能不能直接套用；需要相应的 Halo 插件或另行适配。
- 文章目录侧栏受 `aside.enable` 控制；菜单最多展示两级，图标使用内置 Free 子集。

功能与配置以本仓库源码和对应版本的发布说明为准。升级与发布前的验证要求见[开发与构建](development.md)。
