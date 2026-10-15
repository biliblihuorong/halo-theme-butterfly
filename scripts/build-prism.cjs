/**
 * 生成按需加载的 Prism：核心、常用语言和插件打进 prism.min.js，其余语言拆成独立文件由 autoloader 加载。
 * 语言目录带上 Prism 版本号，长期缓存下升级 Prism 不会混用旧语言文件。
 */
const fs = require('node:fs');
const path = require('node:path');

const prismRoot = path.dirname(require.resolve('prismjs/package.json'));
const {version} = require('prismjs/package.json');
const components = require('prismjs/components.json');

// 与此前完整包保持一致的插件；顺序按依赖排列（show-language 依赖 toolbar，previewers 依赖 css-extras）。
const BUNDLED_LANGUAGES = ['markup', 'css', 'clike', 'javascript', 'css-extras'];
const PLUGINS = ['line-numbers', 'custom-class', 'toolbar', 'show-language', 'previewers', 'match-braces', 'autoloader'];
const COMPONENTS_DIR = `components-${version}`;

function read(file) {
  return fs.readFileSync(path.join(prismRoot, file), 'utf8').trim();
}

// autoloader 能加载的全部语言名（含别名），用于把未知语言当作纯文本，避免请求不存在的文件。
function knownLanguages() {
  const names = new Set();
  for (const [id, meta] of Object.entries(components.languages)) {
    if (id === 'meta') continue;
    names.add(id);
    for (const alias of [].concat(meta.alias || [])) names.add(alias);
  }
  return [...names].sort();
}

function buildBundle() {
  const parts = [
    // manual：只高亮主题交给它的代码块，不自动扫描整页（会触及 Shiki 等插件接管的代码块）。
    'window.Prism=window.Prism||{};window.Prism.manual=true;',
    read('components/prism-core.min.js'),
    ...BUNDLED_LANGUAGES.map((lang) => read(`components/prism-${lang}.min.js`)),
    ...PLUGINS.map((plugin) => read(`plugins/${plugin}/prism-${plugin}.min.js`)),
    `(function(){var s=document.currentScript,a=Prism.plugins.autoloader;` +
      `if(s&&s.src)a.languages_path=s.src.replace(/[^/]*$/,'')+${JSON.stringify(COMPONENTS_DIR + '/')};` +
      `a.known=${JSON.stringify(knownLanguages())};})();`,
  ];
  return `/* PrismJS ${version} | MIT | https://prismjs.com */\n${parts.join('\n')}\n`;
}

function languageFiles() {
  return fs.readdirSync(path.join(prismRoot, 'components'))
    .filter((name) => name.endsWith('.min.js') && name !== 'prism-core.min.js')
    .map((name) => ({name, source: path.join(prismRoot, 'components', name)}));
}

function writePrism(outDir) {
  const componentsDir = path.join(outDir, COMPONENTS_DIR);
  fs.mkdirSync(componentsDir, {recursive: true});
  fs.writeFileSync(path.join(outDir, 'prism.min.js'), buildBundle());
  for (const {name, source} of languageFiles()) fs.copyFileSync(source, path.join(componentsDir, name));
}

module.exports = {buildBundle, knownLanguages, writePrism, COMPONENTS_DIR, version};
