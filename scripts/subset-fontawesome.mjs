/**
 * Font Awesome 字体子集化
 *
 * 作用:按"实际使用的图标"把全量字体裁剪成极小的 woff2 子集,
 *      同时把 CSS 精简为仅保留用到的图标规则,并把 @font-face 改为 woff2 单一来源。
 *
 * 输入:
 *   node_modules/@fortawesome/fontawesome-free/  全量原始字体与完整 CSS(Font Awesome Free,勿直接提交二进制)
 *   scripts/fontawesome-whitelist.txt           人工白名单(供后台可配置图标/未来新增)
 *   src/html、src/js、settings.yaml             自动扫描模板与脚本中的图标
 *
 * 输出(覆盖写入,均为构建产物):
 *   src/plugins/fontawesome/webfonts/*.woff2    子集字体
 *   src/plugins/fontawesome/fontawesome.min.css 精简 CSS
 *
 * 用法:pnpm subset:fa(已接入 npm run build,日常无需单独执行)
 *
 * 注意:脚本依赖 all.min.css 的 `content:"\...` 码点格式(6.6.x 及更早),
 *      6.7.0+ 改为 --fa 自定义属性格式会导致解析为空,升级 FA 前请先验证。
 */
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const THEME_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FA_DIR = path.join(THEME_ROOT, 'src/plugins/fontawesome');
const FA_PKG = path.dirname(createRequire(import.meta.url).resolve('@fortawesome/fontawesome-free/package.json'));
const FONT_SOURCE = path.join(FA_PKG, 'webfonts');
const FULL_CSS = path.join(FA_PKG, 'css', 'all.min.css');
const FONT_OUT = path.join(FA_DIR, 'webfonts');

// 样式族 class → 字体文件名(woff2/ttf 同名)。Free 版仅含 solid/regular/brands 三族。
const FAMILY_FILES = {
  solid: 'fa-solid-900',
  regular: 'fa-regular-400',
  brands: 'fa-brands-400',
};
// Pro 专属样式(light/thin/duotone/sharp)统一按 solid 处理,
// 保证旧配置/文档里残留的这类写法仍能命中 solid 子集。
const FAMILY_ALIASES = {
  fas: 'solid', far: 'regular', fal: 'solid', fat: 'solid', fad: 'solid', fab: 'brands',
  'fa-solid': 'solid', 'fa-regular': 'regular', 'fa-light': 'solid',
  'fa-thin': 'solid', 'fa-duotone': 'solid', 'fa-brands': 'brands',
};

/** 递归收集目录下指定后缀的文件 */
async function collectFiles(dir, exts, acc = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectFiles(full, exts, acc);
    else if (exts.some((e) => entry.name.endsWith(e))) acc.push(full);
  }
  return acc;
}

/** 从模板/JS/settings 中提取 (族, 图标名) 用量 */
async function scanUsage() {
  const usage = new Set(); // "family:name"
  const sources = [
    ...(await collectFiles(path.join(THEME_ROOT, 'src/html'), ['.html'])),
    ...(await collectFiles(path.join(THEME_ROOT, 'src/js'), ['.js'])),
    path.join(THEME_ROOT, 'settings.yaml'),
  ];
  const pairRe = new RegExp(
    `(${Object.keys(FAMILY_ALIASES).join('|')})\\s+fa-([a-z0-9-]+)`,
    'g',
  );
  for (const file of sources) {
    if (!existsSync(file)) continue;
    const text = await readFile(file, 'utf8');
    for (const m of text.matchAll(pairRe)) {
      usage.add(`${FAMILY_ALIASES[m[1]]}:${m[2]}`);
    }
    // 裸 fa fa-xxx 默认视为 solid(FA 默认族)
    for (const m of text.matchAll(/\bfa\s+fa-([a-z0-9-]+)/g)) usage.add(`solid:${m[1]}`);
  }
  return usage;
}

/** 解析白名单:一行一个图标,"fa-solid fa-xxx" 指定族,裸 "fa-xxx" 视为全族 */
async function parseWhitelist() {
  const file = path.join(THEME_ROOT, 'scripts/fontawesome-whitelist.txt');
  const usage = new Set();
  const allFamilies = new Set();
  if (!existsSync(file)) return { usage, allFamilies };
  for (let line of (await readFile(file, 'utf8')).split(/\r?\n/)) {
    line = line.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^(fa-[a-z]+)?\s*(fa-[a-z0-9-]+)$/);
    if (!m) {
      console.warn(`  白名单行无法解析,已跳过: ${line}`);
      continue;
    }
    const family = m[1] ? FAMILY_ALIASES[m[1]] : null;
    const name = m[2].slice(3); // 去掉 fa- 前缀
    if (family) usage.add(`${family}:${name}`);
    else allFamilies.add(name); // 裸名 → 加入存在的所有族
  }
  return { usage, allFamilies };
}

/**
 * 解析原始 CSS,产出精简 CSS 与 图标名→码点 映射。
 * - @keyframes/@media 嵌套块整体保留(扁平化拆分会破坏嵌套结构)
 * - 图标规则(content 为 hex 码点,\f640/\e5b0/\30 均识别)按白名单过滤,组选择器任一命中即保留
 * - 结构性规则(族声明、尺寸、动画等)全保留
 */
async function buildCss(keepPairs, allFamilyNames) {
  let css = await readFile(FULL_CSS, 'utf8');
  // npm 包内 @font-face 相对路径是 ../webfonts/,主题内 CSS 与字体同目录,统一改写
  css = css.replace(/\.\.\/webfonts\//g, 'webfonts/');
  const atBlocks = [];
  css = css.replace(/@(?:-webkit-)?(?:keyframes|media)[^{]*\{(?:[^{}]*\{[^}]*\})*[^{}]*\}/g, (m) => { atBlocks.push(m); return ''; });

  const rawRules = css.match(/\/\*![\s\S]*?\*\/|@font-face\{[^}]*\}|[^{}]+\{[^}]*\}/g) || [];
  const codepoints = new Map(); // name → '\uXXXX'
  const keepNames = new Set([...keepPairs].map((p) => p.split(':')[1]));
  for (const name of allFamilyNames) keepNames.add(name);

  const out = [];
  let droppedIcons = 0;
  for (const rule of rawRules) {
    if (rule.startsWith('/*!') || rule.startsWith('@font-face')) { out.push(rule); continue; }
    const selMatch = rule.match(/^([^{]+)\{/);
    const body = rule.match(/\{([\s\S]*)\}$/)?.[1] ?? '';
    if (!/content:"\\[0-9a-f]+/i.test(body)) { out.push(rule); continue; } // 结构性规则
    // 记录码点(取 content 的第一个码点;duotone :after 为同码点重复,无需单独处理)
    for (const m of body.matchAll(/content:"\\([0-9a-f]+)/gi)) {
      for (const n of (selMatch?.[1] ?? '').matchAll(/\.fa-([a-z0-9-]+)/g)) {
        if (FAMILY_ALIASES[`fa-${n[1]}`]) continue; // 跳过族 class 本身
        if (!codepoints.has(n[1])) codepoints.set(n[1], String.fromCodePoint(parseInt(m[1], 16)));
      }
      break; // 一个规则只记一次(组选择器共享同一码点)
    }
    // 组选择器(含别名)任一命中即保留该规则
    const sels = selMatch?.[1].split(',') ?? [];
    const hit = sels.some((s) => [...s.matchAll(/\.fa-([a-z0-9-]+)(?::|::)/g)].some((n) => keepNames.has(n[1])));
    if (hit) out.push(rule);
    else droppedIcons++;
  }
  const keptIcons = out.filter((r) => /content:"\\[0-9a-f]+/i.test(r)).length;
  console.log(`      图标规则: 保留 ${keptIcons} 条,丢弃 ${droppedIcons} 条;结构性规则 ${out.length - keptIcons} 条、@keyframes/@media ${atBlocks.length} 块`);
  return { css: out.join('') + atBlocks.join(''), codepoints };
}

async function main() {
  console.log('[1/4] 扫描模板/JS/settings 中的图标 ...');
  const scanned = await scanUsage();
  console.log(`      自动扫描到 ${scanned.size} 个 (族,图标) 组合`);
  console.log('[2/4] 读取白名单 ...');
  const { usage: whitelistUsage, allFamilies } = await parseWhitelist();
  const keepPairs = new Set([...scanned, ...whitelistUsage]);
  console.log(`      白名单指定族 ${whitelistUsage.size} 项、全族名 ${allFamilies.size} 项`);

  console.log('[3/4] 精简 CSS ...');
  const { css, codepoints } = await buildCss(keepPairs, allFamilies);

  // 报告扫描到但 CSS 中不存在的图标(帮助发现拼写错误/白名单遗漏)
  const known = new Set(codepoints.keys());
  const unknown = [...new Set([...keepPairs].map((p) => p.split(':')[1]))].filter((n) => !known.has(n));
  if (unknown.length) console.warn(`      ⚠ 未在 Font Awesome 中找到: ${unknown.join(', ')}(请检查拼写或从白名单移除)`);

  // @font-face 只保留 woff2 来源(woff2 在前、ttf 在后),且仅保留实际有图标的族
  const usedFamilies = new Set([...keepPairs].map((p) => p.split(':')[0]));
  let finalCss = css;
  for (const [family, file] of Object.entries(FAMILY_FILES)) {
    if (!usedFamilies.has(family)) {
      finalCss = finalCss.replace(new RegExp(`@font-face\\{[^}]*${file}[^}]*\\}`, 'g'), '');
      continue;
    }
    finalCss = finalCss.replace(
      new RegExp(`,?url\\(webfonts/${file}\\.ttf\\) format\\("truetype"\\)`, 'g'),
      '',
    );
  }
  // v4 兼容字体未使用,移除其 @font-face
  finalCss = finalCss.replace(/@font-face\{[^}]*fa-v4compatibility[^}]*\}/g, '');
  finalCss = finalCss.replace(/,font-display/g, 'font-display').replace(/\{,/g, '{');
  await writeFile(path.join(FA_DIR, 'fontawesome.min.css'), finalCss);
  console.log(`      fontawesome.min.css: 生成 ${(finalCss.length / 1024).toFixed(1)}KiB`);

  console.log('[4/4] 生成子集字体 ...');
  // 清理历史构建遗留、不属于当前字体族的产物(如迁移前生成的 Pro 族子集)
  for (const entry of await readdir(FONT_OUT)) {
    if (entry.endsWith('.woff2') && !Object.values(FAMILY_FILES).includes(entry.replace(/\.woff2$/, ''))) {
      await rm(path.join(FONT_OUT, entry));
      console.log(`      ${entry} 已移除(非当前字体族产物)`);
    }
  }
  for (const [family, file] of Object.entries(FAMILY_FILES)) {
    const familyNames = [...keepPairs].filter((p) => p.startsWith(`${family}:`)).map((p) => p.split(':')[1]);
    const src = path.join(FONT_SOURCE, `${file}.woff2`);
    if (!familyNames.length || !existsSync(src)) {
      console.log(`      ${file}.woff2 跳过(未使用)`);
      continue;
    }
    const chars = familyNames.map((n) => codepoints.get(n)).filter(Boolean);
    const buf = await readFile(src);
    const subset = await subsetFont(buf, chars.join(''), { targetFormat: 'woff2' });
    await writeFile(path.join(FONT_OUT, `${file}.woff2`), subset);
    console.log(
      `      ${file}.woff2: ${(buf.length / 1024).toFixed(0)}KiB → ${(subset.length / 1024).toFixed(1)}KiB (${familyNames.length} 字形)`,
    );
  }
  console.log('完成。');
}

main().catch((e) => { console.error(e); process.exit(1); });
