# Butterfly 主题复查（2026-09-10）

> 历史检查记录：下文描述的是当时的 2.2.8 工作区，修复状态以 [v2.2.9 发布说明](releases/v2.2.9.md) 为准。

范围：仅 `theme/halo-theme-butterfly` 当前工作区，包含已有未提交改动。审查所有页面模板、共享布局、页面 JS、核心模块、相关 SCSS、主题设置与构建链；没有审查插件实现。此轮新增本报告，没有修改主题业务源码。

结论：构建成功不等于功能正常。已确认本地 Artalk 打包、移动端目录、标签图表、代码高亮失败降级等问题，应先修功能，再处理资源开销。

## 验证情况

- `node --test` 通过：1 个测试文件，仅验证局部导航的普通点击、Ctrl 点击和跨域点击，不覆盖模板渲染、图表、评论或目录。
- 执行现有 Gulp 默认构建成功，耗时约 35 秒；生成 HTML/CSS/JS、loading、Artalk 及静态资源。没有执行 clean、字体子集重写、发布或 ZIP 上传。
- 对源文件和构建后的 Artalk 文件分别进行 Node VM 执行，确认全局导出差异。
- 使用 Node VM 和最小 DOM 替身复现数字别名分页、单页分页、独立页面滚动空引用、移动端目录切换、Prism 加载失败及浏览器存储异常。
- 使用本机缓存的 Spring Expression 6.2.15、Thymeleaf 3.1.3 验证侧栏空数据表达式；分页对象使用空 items 模拟。
- 抽查 config、post、page、archives、layout 的构建产物，Thymeleaf JavaScript 内联表达式数量保持一致。
- 未连接运行中的 Halo 站点，未测真实 HTTP 状态、LCP/INP/CLS、服务端查询耗时，也未执行浏览器视觉回归。插件页面的实际模型以安装版本为准。

## 功能问题

### 1. [P1] 本地 Artalk 打包后丢失全局导出

位置：[gulpfile.js:204](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/gulpfile.js:204)、[ArtalkComment.js:12](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/js/modules/ArtalkComment.js:12)。

原始文件为 UMD，直接加载会创建 `window.Artalk`；Webpack 将其识别为模块，但输出未配置 library，结果仅保留内部 exports。实测原文件 `Artalk.init` 为 function，构建产物 `Artalk` 为 undefined。

选择 Artalk 的“主题内置”资源时，初始化每 200ms 重试，约 12 秒后退出，评论区保持空白。需要保持浏览器全局导出，或直接压缩 UMD 文件而不重新封装为私有模块。验证必须加载最终产物，不能只检查源文件。

### 2. [P1] 移动端目录按钮无法展开目录

位置：[Render.js:103](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/js/modules/Render.js:103)、[render.scss:379](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/scss/modules/render.scss:379)。

1100px 以下 CSS 将目录设为 `display:none`。按钮只在 inline display 的 `none` 和空字符串之间切换：首次点击写 none，再次点击清空后仍受 CSS 的 none 控制。两种状态都不可见。

需要使用明确的展开 class 或可见 display 值，并同步按钮展开状态。最小复现已确认两次点击的状态序列。

### 3. [P1] 标签统计使用柱状图，却注册折线图和仪表盘

位置：[tags.js:50](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/js/page/tags.js:50)。

实际 option 使用 `type:'bar'`、dataset、sort transform、markPoint、markLine，但仅注册 LineChart、GaugeChart 和部分通用组件。BarChart、DatasetComponent、TransformComponent、MarkPointComponent、MarkLineComponent 均未注册，标签图表无法按配置完整渲染。

应按实际 option 注册组件，删除未使用的图表类型。[ECharts 官方按需导入说明](https://echarts.apache.org/handbook/en/basics/import/)明确要求注册使用的图表和组件。此项为源码与官方契约核对，尚未在真实浏览器渲染。

### 4. [P1] Prism 加载失败会让代码持续不可见

位置：[CodeBlock.js:20](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/js/modules/CodeBlock.js:20)、[CodeBlock.js:55](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/js/modules/CodeBlock.js:55)。

模块先注入代码 `opacity:0`，脚本 onerror 却调用 resolve，随后仍运行 `Prism.highlightAll()`。资源 404 或网络失败时会抛出 `Prism is not defined`，没有进入恢复可见状态的逻辑。VM 已复现异常和残留隐藏样式。

加载失败应保留可阅读的原始代码；恢复可见性不能依赖高亮成功。

### 5. [P2] 公共分页会截断数字别名，并生成错误的单页链接

位置：[Pagination.js:33](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/js/modules/Pagination.js:33)。

匹配的是路径中第一个 `/数字`，不是结尾的 `/page/页码`。输入 `/categories/2024/page/2` 时，页码 2 被生成成 `/categories/2`，丢失分类别名及分页前缀。归档年月路径同样有此风险。

只有一页、上下页 URL 都为 `/` 时，仍输出 `/1`。生成数字页码还会丢弃查询参数。应针对明确的分页段构造 URL，只有一页则不输出分页。前两个场景已复现。

### 6. [P2] 独立页面复用正文模块，但缺少所需配置和目录容器

位置：[page.html:15](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/page.html:15)、[single.js:15](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/js/page/single.js:15)、[Render.js:68](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/js/modules/Render.js:68)。

- `single.js` 注册 CodeBlock，但 page 模板未输出 enable_code、代码主题等配置，构造函数直接返回，独立页面的代码高亮和工具栏不起作用。
- page 使用普通侧栏，没有 `.aside .is-sticky`；Render 仍注册滚动回调，桌面滚动超过 56px 时访问 null.style。已通过最小 DOM 复现。
- 仍创建移动端目录按钮，但对应目录元素不存在，按钮无作用。
- 单独补 enable_code 还不完整：复制按钮另依赖 `MainApp.attrs.enable_code_copy`，独立页面也未提供。

需要对齐独立页面实际支持的功能、配置与 DOM；共享模块必须允许页面缺少目录。

### 7. [P2] 独立页面设置的封面从未被使用

位置：[page.html:15](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/page.html:15)。

封面为空时使用首页背景；封面非空时却走“随机图或空字符串”，没有任何分支返回 `singlePage.spec.cover`。因此设置封面后可能显示随机图，关闭随机图时没有背景。

应优先使用独立页面封面，再执行明确的回退逻辑。

### 8. [P2] 浏览器存储异常会中断整个主题初始化

位置：[theme.js:19](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/js/core/theme.js:19)、[App.js:20](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/js/core/App.js:20)、[config.html:20](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/views/config.html:20)。

Theme 构造与 setMode 直接读写 localStorage，没有异常保护。浏览器禁止存储时，构造函数抛错；它位于 run_* 的 try/catch 之外，Common、Scroll、页面模块都无法完成初始化。已模拟 SecurityError 复现。

存储应作为可失败的偏好持久化；失败时仍用内存/默认主题继续初始化。

### 9. [P2] 多个不同页面都声明首页为 canonical

位置：[layout.html:42](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/views/layout.html:42) 及 archives、categories、tags、links、friends、photos、moments、steam、bangumis 模板第 8 行。

这些页面传 canonical=null，布局统一回退 site.url。最终归档、分类列表、友链等不同内容页面都会声明首页 URL；同样影响 og:url。应根据当前页面实际 URL 生成，错误页则避免声明无关首页 canonical。此项已由模板数据流确认，未测搜索引擎实际收录结果。

### 10. [P2] 关闭首屏会同时移除正文标题；文章侧栏开关也未统一

位置：[post.html:80](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/post.html:80)、[page.html:35](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/page.html:35)、[aside.html:120](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/views/aside.html:120)。

文章和独立页面的标题只放在条件渲染的 above 中；关闭首屏后，正文区域没有标题回退。文章目录侧栏又始终输出，不受 aside.enable 控制，而 main 的侧栏布局 class 受该开关控制，关闭侧栏后仍保留目录并出现宽度逻辑不一致。

应将是否显示封面与是否显示标题区分；文章目录和正文宽度应遵循同一套布局条件。

### 11. [P2] 侧栏用分页对象判断列表是否为空

位置：[aside.html:56](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/views/aside.html:56)、[aside.html:75](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/views/aside.html:75)。

categoryFinder.list/tagFinder.list 返回分页对象，应检查 items。当前将整个对象传入 #lists.isEmpty。最小 SpEL 验证中，空分页对象被转换为单元素集合，`not #lists.isEmpty(categories)` 返回 true，检查 categories.items 才返回 false。因此空分类/空标签不会显示“暂无数据”。

这不是已证实的整页 500，不能将类型用错直接等同于模板崩溃。[Halo 分类 Finder 文档](https://docs.halo.run/developer-guide/theme/finder-apis/category)和 [Thymeleaf Lists 实现](https://raw.githubusercontent.com/thymeleaf/thymeleaf/3.1-master/lib/thymeleaf/src/main/java/org/thymeleaf/expression/Lists.java)支持该类型核对。

### 12. [P2] 图库、瞬间缺少翻页入口，瞬间音频没有播放控件

位置：[photos.html:42](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/photos.html:42)、[moments.html:41](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/moments.html:41)。

两个模板只输出 items，没有上一页/下一页链接，也没有注册 Pagination。插件返回分页数据且存在后续页时，用户无法通过主题访问后面的内容；自定义页面的回退查询又固定为前 999 条，超过后也无入口。

瞬间的 audio 既没有 controls，也没有主题自定义播放器，音频条目无法手动播放。分页影响需结合实际插件配置复测，音频缺控件可由模板直接确认。

### 13. [P2] 自定义分类模板的数据回退只覆盖正文，不覆盖图表

位置：[categories.html:21](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/categories.html:21)、[categories.html:48](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/categories.html:48)、[categories.js:20](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/js/page/categories.js:20)。

theme.yaml 允许独立页面选择分类模板。此时正文使用 categoryFinder.listAll() 回退，但 head 仍将原始 categories 写入 MainApp.data，缺少该模型时为 null。JS 读取 .length 抛错，列表和图表使用了不同数据源。空分类时也没有 chart DOM 的保护。

应让图表和列表复用同一份有效数据，并在没有图表容器时结束初始化。

### 14. [P2] 部分交互无法用键盘完成

位置：[nav.html:42](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/views/nav.html:42)、[nav.scss:158](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/scss/core/nav.scss:158)、[CodeBlock.js:140](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/js/modules/CodeBlock.js:140)。

桌面子菜单只在 hover 时展开，父级 a 没有 href；代码复制和折叠绑定在不可聚焦的 i 元素上。键盘用户无法可靠触发这些功能。应使用原生 button，并为导航增加焦点展开行为和状态。

## 性能与构建

### A. [P2] 公共 JS 带入页面专用依赖

位置：[gulpfile.js:103](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/gulpfile.js:103)、[layout.html:77](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/views/layout.html:77)。

所有页面加载 common.min.js。本次产物 239,316 bytes（233.7 KiB），gzip 文件 70,459 bytes（68.8 KiB）。其中包含 Fancybox、Clipboard 和代码高亮模块相关实现，首页和纯列表也承担其下载、解析成本。

应按页面使用边界拆出正文/灯箱依赖，或在实际使用时动态加载，不需要引入新的构建框架。

### B. [P2] 图表虽延迟加载，但异步包仍约 1 MiB

echarts.chunk.min.js 为 1,063,174 bytes（1.01 MiB），gzip 文件 344,437 bytes（336.4 KiB）。已存在 IntersectionObserver 延迟加载，这是有效优化；但动态导入整个 charts/components 命名空间并共用 chunk，产物仍偏大。

先修复图表注册，再检查 Webpack 实际保留的模块，按需要收窄导入。没有真实设备数据，不将文件体积直接换算为卡顿时长。

### C. [P2] 非首页重复加载完整基础 CSS

布局先加载 index.min.css（33,022 bytes），再加载具体页面 CSS。每个页面 SCSS 又 @use ../core，重复输出 reset、导航、布局等基础样式；例如 post.min.css 为 37,893 bytes，总加载约 69.3 KiB 原始 CSS。

应将公共样式与页面样式只输出一次。改造需检查级联顺序，不能只删除某条 link 后假定样式等价。

### D. [P2] 首屏大图发现过晚；部分字体一次加载数 MiB

多数页面通过 Common 构造时 new Image().src 才开始请求首屏背景，没有对应的 head 图片 preload。图片请求依赖 JS 下载执行，可能延后 LCP；设置 fetchPriority=high 不会提前发现 URL。分类页已有 CSS 背景声明，应分别看待。

字体实测：GenSenRoundedTW 单文件 7,553,864 bytes（7.20 MiB），ResourceHanRoundedCN 4,961,296 bytes（4.73 MiB），NotoSansSC 1,142,552 bytes（1.09 MiB）。仅在选择相应字体时影响客户端加载，不是每页下载全部字体。默认 CircularBody 已分片，不能混为一谈。

默认背景图为 54,851 bytes，Font Awesome CSS 为 11,291 bytes；当前它们不是最大的体积问题。

### E. [P2] 归档图表仍可能触发全量文章查询

位置：[archives.html:17](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/src/html/archives.html:17)。

不能复用当前 archives 时，模板请求 postFinder.archives(1, archives.total)。即使随后只内联月份计数，服务端仍要获取和整理对应文章。对年份/月份归档，回退查询也没有传递当前筛选范围，需要确认图表究竟应展示全站还是当前范围。

目前没有实际数据量和服务端性能数据，故这是明确的查询规模风险，不是已测得的慢请求。优化优先复用已有结果或限制图表统计范围，避免仅为小图表加载全站文章对象。

### F. [P3] 构建重复执行插件任务；ZIP 提前报告完成

位置：[package.json:19](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/package.json:19)、[gulpfile.js:275](C:/Users/shell/Desktop/halo/theme/halo-theme-butterfly/gulpfile.js:275)。

gulp default 已包含 loading 和 Artalk 三个任务，npm run build 又依次执行一次，形成重复构建。zip task 启动 stream 后立即 done()，没有返回 stream；任务完成信号早于文件真正写完，也不便可靠传递流错误。

删除重复构建步骤，让 zip 返回写入流即可。此次构建还出现 Sass @import/global-builtin 弃用警告，目前未导致失败。

## 建议修复顺序与回归范围

1. 修复 Artalk 最终产物全局导出、移动目录、Prism 失败降级、标签图表组件注册。
2. 修复公共分页和独立页面的配置/目录/封面逻辑；回归数字别名、单页、空数据、关闭首屏和侧栏。
3. 修复 canonical、模板分页及键盘操作。
4. 调整公共资源边界、首屏图片发现和大字体加载，再用真实 Halo 站点测 LCP/INP/CLS 与 TTFB。

需要运行环境确认的项目：Halo 具体版本下的模板模型、各插件是否分页及路由前缀、无主菜单/错误作者用户名时的回退、服务端缓存与静态压缩响应、评论明暗模式跟随。报告未将这些未验证项目冒充已确认故障。
