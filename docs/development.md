# 开发与构建

[项目介绍](../README.md) · [主题配置与使用](configuration.md) · [更新记录](releases/)

## 开发环境

- Node.js `>=22.13.0`。
- pnpm `11.20.0`，版本由 [`package.json`](../package.json) 的 `packageManager` 声明。
- Gulp 4、Webpack 5、Sass；依赖版本以 `pnpm-lock.yaml` 为准。

在主题源码目录安装依赖：

```bash
pnpm install --frozen-lockfile
```

## 目录结构

```text
halo-theme-butterfly/
├─ src/html/                 Thymeleaf 模板源码
│  ├─ views/                布局、导航、侧边栏、页脚和组件
│  └─ error/                404/500 页面
├─ src/scss/                核心、组件和页面样式
├─ src/js/                  核心逻辑、模块和页面入口
├─ src/font/                字体与来源声明
├─ src/plugins/             Prism 样式、Artalk、Font Awesome 和 Loading 等资源
│  └─ fontawesome/          提交到仓库的子集字体与 CSS
├─ templates/               构建产物；被 Git 忽略
├─ docs/                    使用文档与版本发布说明
├─ theme.yaml               主题元信息与自定义模板
├─ settings.yaml            Console 主题设置表单
├─ annotation-setting.yaml  菜单/文章元数据扩展
├─ gulpfile.js              构建与打包任务
├─ test/                    Node.js 回归测试
└─ scripts/                 资源生成、同步、配置迁移与发行包校验
```

Prism 脚本由 `scripts/build-prism.cjs` 从 `prismjs` 依赖生成；Font Awesome 全量输入来自 npm 依赖，不需要手动复制到源码目录。

## 本地迭代

首次开发先构建，再启动监听：

```bash
pnpm build
pnpm dev
```

`dev` 只监听变化，不会进行首次构建。监听覆盖 HTML、SCSS、JS，以及 Artalk 客户端源码；图片、字体、其他静态资源和图标白名单变化需要主动重新构建。

按改动范围也可单独执行：

| 命令 | 作用 |
| --- | --- |
| `pnpm build-html` | 编译并压缩 HTML 模板 |
| `pnpm build-css` | 编译页面 SCSS |
| `pnpm build-js` | 构建页面 JS、共享代码与异步资源 |
| `pnpm copy-folder` | 复制字体、图片与插件静态资源 |
| `pnpm build-artalk-js` | 构建 Artalk 客户端脚本 |
| `pnpm build-artalk-css` | 构建 Artalk 客户端样式 |
| `pnpm subset:fa` | 更新源码目录中的 Font Awesome 子集字体与 CSS |
| `pnpm clean` | 删除现有 `templates/` 和主题 ZIP |

`build` 会先清理，再生成图标子集并构建全部模板与资源。对图标白名单或静态资源的更改，最终应通过完整构建确认能进入发行包。

前端交互使用原生 DOM API，已经移除 jQuery 依赖。二次开发请沿用 `addEventListener`、`closest`、`fetch` 和现有模块约定。

在 Halo 工作目录中以源码挂载时，主题文件夹应命名为 `theme-butterfly-shell`，与 [`theme.yaml`](../theme.yaml) 的 `metadata.name` 一致。仓库目录仍可使用 `halo-theme-butterfly`；放入 Halo 的 themes 目录时需要改名。v2.3.4 起，本分支使用独立的 Theme、Setting、ConfigMap 和 AnnotationSetting 名称，与上游主题隔离。

本站资源根路径根据 `theme.metadata.name` 生成，Prism 回退和旧默认首屏背景使用同一个本站根路径，cursor CSS 使用相对路径。旧 `loading.source.site` 默认值会映射到当前主题路径；自定义 CDN、npm 来源、非默认本站地址及外部图片保持原值。修改主题标识时须同时检查资源与配置迁移，不能只修改 `theme.yaml` 的一个字段。

侧栏自定义路由读取 Halo 2.22+ 公开站点模型中的 `routes`。配置模板序列化整个公开 `site` 对象，前端初始化后更新桌面和移动侧栏；这样旧版 Halo 缺少 `routes` 时也能保留默认链接，不必提高主题最低版本。请避免在服务端模板中直接访问旧版可能不存在的 Bean 属性。

## 性能约定

对照 [Halo 性能最佳实践](https://docs.halo.run/developer-guide/theme/performance)，维护时保留以下行为：

- Gulp/Webpack/Sass 构建并压缩发布资源；公共与页面脚本按顺序使用 `defer`，同步执行的短脚本用于配色、首屏和页面配置。
- 主题静态资源带版本参数，异步包带内容哈希。Prism 按文章代码需要加载，Artalk 在接近评论区或点击按钮时加载，ECharts 在图表接近视口时加载，OpenCC 在选择繁体时加载，Fancybox 仅在主内容区存在图片时加载。
- 菜单和标签总数在 `layout` 的 `body th:with` 中各查询一次，桌面与移动侧栏共享；文章列表使用 Halo 提供的分页模型，循环内不额外查询作者、分类或统计。侧栏分类最多 5 条、标签最多 25 条。
- 封面按实际布局提供 `sizes`，尊重 Halo 生成的 `srcset`；图床预览与原图回退见[图片配置](configuration.md#halo-附件响应式图片)。

生产环境的 Thymeleaf 缓存、HTTP 压缩、缓存响应头和 CDN 由 Halo 与部署配置控制；主题无法替代这些设置。验证时保持模板缓存开启，检查真实页面的图片 `currentSrc` 与 Network 请求，确认响应式图片没有额外无条件加载原图，也没有下载未用到的大包。构建产物大小只能用于比较包体积，不等同于线上加载时间或 Lighthouse 分数。

仍可继续优化的地方：当前部分正文模块仍进入公共包，页面 CSS 也包含重复的基础样式；归档图表为展示全站统计需要读取全部归档数据。瞬间、图库自定义模板的历史大分页回退尚待独立优化，不应将上述常见页面检查视为所有插件路径已经优化完毕。

## Font Awesome 图标子集化

主题使用 Font Awesome Free `6.6.0`（`@fortawesome/fontawesome-free`）。构建会扫描 `src/html`、`src/js`、`settings.yaml` 中出现的图标类，再合并 [`scripts/fontawesome-whitelist.txt`](../scripts/fontawesome-whitelist.txt)，生成：

```text
src/plugins/fontawesome/fontawesome.min.css
src/plugins/fontawesome/webfonts/*.woff2
```

这些文件是生成产物，请通过脚本更新，不要手工修改。全量字体来自 npm 依赖；主题只分发实际使用及白名单预留的子集。

新增图标有两种情况：

1. 模板或 JS 中写入连续的字体族和图标类，例如 `fa-solid fa-camera`，构建扫描会将其纳入。
2. 在 Halo 后台配置菜单或社交图标时，类名存储在用户配置中，构建无法扫描。先在白名单中加入图标，再重新构建安装主题。

白名单每行写一个带字体族的图标，例如：

```text
fa-solid fa-camera
fa-brands fa-x-twitter
```

后台菜单字段填写类名，如 `fa-solid fa-camera`；社交图标字段填写 HTML，如 `<i class="fa-brands fa-x-twitter"></i>`。两者都必须使用已经纳入主题子集的图标。

```bash
# 仅更新源码目录中的图标子集
pnpm subset:fa

# 重新生成完整安装包
pnpm build-zip
```

可用字体族为 Free 的 `fa-solid`、`fa-regular` 和 `fa-brands`。Pro 专属的 light、thin、duotone、sharp 样式不可用；某些 Free 图标也仅存在于特定字体族。不存在的图标不会因加入白名单而生成，例如 `fa-netease-cloud-music` 不属于此图标集。升级 Font Awesome 前需检查子集化脚本是否兼容新版 CSS 格式。

图标、字体和代码分别遵循 CC BY 4.0、SIL OFL 1.1 和 MIT，见 [Font Awesome 说明](../src/plugins/fontawesome/README.md)与[许可文件](../src/plugins/fontawesome/LICENSE.txt)。其他字体来源见[字体许可声明](../src/font/THIRD_PARTY_NOTICES.md)。

## 简繁转换资源

简繁切换使用精确锁定的 `opencc-js`，采用简体到台湾正体的 `s2tw` 配置。转换词库单独构建为带内容哈希的异步 JS；默认简体浏览时不加载，首次切换或恢复已保存的繁体偏好时才请求主题本地资源。

转换仅作用于页面显示层，原始文本保存在当前页面内存中，切回时精确恢复。新增可编辑组件、代码渲染组件或第三方插件区域时，请检查其是否需要 `translate="no"` 标记，避免处理用户输入或插件维护的 DOM。

OpenCC 的 MIT、Apache-2.0 与第三方许可声明位于 [`src/plugins/opencc/`](../src/plugins/opencc/)，完整构建会将这些文件一并复制到安装包中。更新依赖后需同步核对这些声明，并回归动态内容、目录生成与简繁来回切换。

## Artalk 客户端资源同步

主题自带 Artalk 客户端。需要从指定 Artalk 服务端同步新版源码时，在已安装依赖的源码目录执行：

```bash
node scripts/sync-artalk.js --server https://artalk.example.com
```

请替换示例地址。脚本覆盖 `src/plugins/artalk/Artalk.js` 和 `Artalk.css`；同步后检查变更，重新测试并构建主题。使用自定义或服务端资源的配置方式见[评论设置](configuration.md#评论-comment)。

## 发行包与校验

交付前执行测试与完整构建：

```bash
pnpm test
pnpm build-zip
```

`test` 使用 Node.js 内置测试运行器。`build-zip` 依次执行清理与构建、ZIP 打包、`verify-release`，不会自动执行测试。生成文件为：

| 文件 | 用途 |
| --- | --- |
| `theme-butterfly-dist.zip` | 上传到 Halo 安装 |
| `theme-butterfly-dist.zip.sha256` | ZIP 的 SHA-256 校验值 |
| `theme-butterfly-dist.zip.manifest.json` | 版本、源码提交、生成时间与构建文件的大小及摘要 |

ZIP 包含 `templates/`、`theme.yaml`、`settings.yaml`、`annotation-setting.yaml` 和 `LICENSE`。`pnpm zip` 只打包当前已有的 `templates/`，不会预先构建，正式交付请使用 `pnpm build-zip`。

下载发行包与校验文件后，可以在同一目录执行：

```bash
sha256sum -c theme-butterfly-dist.zip.sha256
```

`verify-release` 检查包版本与主题版本、标签版本、异步资源文件名、关键模板和 Artalk 的浏览器导出，并生成摘要文件。它不能代替真实 Halo 环境与浏览器验证。发布前还需检查首页、文章、普通独立页面、归档、分类、标签、分页、错误页及已安装的插件页面，并覆盖移动端、深浅色和评论行为。

修改 `th:inline="javascript"` 配置模板后，还要检查 Halo 实际渲染出的脚本，确认对象序列化与内联表达式有效；自然模板的默认值可执行，并不等于服务端渲染已通过。路由相关验证需覆盖桌面与移动侧栏、自定义路径，以及没有 `routes` 的旧版站点模型。

GitHub Actions 对 PR 执行锁定依赖安装、回归测试、构建与 ZIP 校验。推送 `v版本号` 标签时，发布流程复用通过验证的产物，并读取 `docs/releases/v版本号.md` 作为发布说明。发布说明需要与版本同步维护；工作流也支持手动触发验证。

`pnpm release` 是交互式版本更新命令，仅更新 `package.json` 与 `theme.yaml` 中的版本，不会自动完成测试、创建标签或发布。版本变更后应检查锁文件及发布说明，再执行上述验证流程。

主题配置迁移命令与备份要求见[升级与配置迁移](configuration.md#升级与配置迁移)。
