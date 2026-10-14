# Font Awesome Free（子集化产物说明）

本目录的 `webfonts/*.woff2` 与 `fontawesome.min.css` 由 `scripts/subset-fontawesome.mjs`
根据主题实际使用的图标，从 npm 包 `@fortawesome/fontawesome-free`（版本见根目录 package.json）
自动裁剪生成，属于构建产物，请勿手工修改；新增/更换图标后重新运行 `pnpm subset:fa` 即可。

上游许可（详见本目录 LICENSE.txt 与上游 css 文件头声明）：

- 图标：CC BY 4.0
- 字体：SIL OFL 1.1
- 代码（CSS/JS）：MIT

本仓库不提交 Font Awesome 的任何未裁剪字体二进制；全量资源随 npm 依赖安装。
历史上曾内置 Font Awesome Pro 6.1.0 字体，现已全部移除（Pro 许可不允许再分发）。
