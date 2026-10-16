#!/usr/bin/env node
/**
 * 离线迁移主题配置身份，不连接 Halo，也不修改输入文件。
 * node scripts/migrate-theme-identity.cjs old-config.json [-o new-config.json]
 * JSON 配置可直接使用 Node；完整 ConfigMap 的 YAML 输入需要已有 js-yaml 依赖。
 */
const fs = require('node:fs');
const path = require('node:path');

const OLD_THEME = 'theme-butterfly';
const NEW_THEME = 'theme-butterfly-shell';
const OLD_CONFIG_MAP = 'theme-butterfly-configMap';
const NEW_CONFIG_MAP = 'theme-butterfly-shell-configmap';
const OLD_ASSETS = `/themes/${OLD_THEME}/assets/`;
const NEW_ASSETS = `/themes/${NEW_THEME}/assets/`;
const OWNER_LABEL = 'theme.halo.run/theme-name';

function isObject(value) {
  if(value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function rewriteAssets(value, ancestors = new WeakSet(), depth = 0) {
  if(typeof value === 'string') return value.startsWith(OLD_ASSETS)
    ? NEW_ASSETS + value.slice(OLD_ASSETS.length) : value;
  if(value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value;
  if(depth > 200 || (!Array.isArray(value) && !isObject(value)) || ancestors.has(value)) {
    throw new Error('配置必须是有限深度、无循环的 JSON 数据。');
  }
  ancestors.add(value);
  const rewritten = Array.isArray(value)
    ? value.map((item) => rewriteAssets(item, ancestors, depth + 1))
    : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteAssets(item, ancestors, depth + 1)]));
  ancestors.delete(value);
  return rewritten;
}

function migrateDocument(document) {
  if(!isObject(document)) throw new Error('输入必须是 JSON 配置对象或完整的主题 ConfigMap。');
  if(!Object.hasOwn(document, 'kind') && !Object.hasOwn(document, 'apiVersion')) {
    return rewriteAssets(document);
  }
  if(document.kind !== 'ConfigMap' || document.apiVersion !== 'v1alpha1'
    || !isObject(document.metadata)
    || ![OLD_CONFIG_MAP, NEW_CONFIG_MAP].includes(document.metadata.name)
    || !isObject(document.data)) {
    throw new Error('ConfigMap 类型、版本、主题名称或 data 结构不符合迁移要求。');
  }
  const data = Object.fromEntries(Object.entries(document.data).map(([group, raw]) => {
    if(typeof raw !== 'string') throw new Error('ConfigMap.data 的每个值都必须是有效的 JSON 字符串。');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('ConfigMap.data 的每个值都必须是有效的 JSON 字符串。');
    }
    if(group === 'default' && !isObject(parsed)) throw new Error('旧版 data.default 必须包含 JSON 配置对象。');
    return [group, JSON.stringify(rewriteAssets(parsed))];
  }));
  return {
    apiVersion: 'v1alpha1',
    kind: 'ConfigMap',
    metadata: {name: NEW_CONFIG_MAP, labels: {[OWNER_LABEL]: NEW_THEME}},
    data,
  };
}

function loadYaml() {
  try {
    return require('js-yaml');
  } catch {
    throw new Error('YAML 输入需要 js-yaml；请执行 pnpm install，或改用 JSON 导出文件。');
  }
}

function parseInput(raw) {
  try {
    return {document: JSON.parse(raw), format: 'json'};
  } catch { /* 只有 YAML ConfigMap 才需要额外依赖。 */ }
  const yaml = loadYaml();
  let document;
  try {
    document = yaml.load(raw, {schema: yaml.JSON_SCHEMA});
  } catch {
    throw new Error('无法解析输入；请提供有效的 JSON 配置或单个 ConfigMap YAML。');
  }
  if(!isObject(document) || document.kind !== 'ConfigMap') {
    throw new Error('普通配置必须使用 JSON；YAML 输入仅支持完整 ConfigMap。');
  }
  return {document, format: 'yaml'};
}

function parseArgs(argv) {
  const args = {input: null, output: null, help: false};
  for(let i = 0; i < argv.length; i++) {
    const value = argv[i];
    if(value === '-h' || value === '--help') args.help = true;
    else if(value === '-o' || value === '--output') {
      if(args.output || !argv[i + 1] || argv[i + 1].startsWith('-')) throw new Error('请为 -o 指定一个新的输出文件。');
      args.output = argv[++i];
    } else if(value.startsWith('-') || args.input) throw new Error('参数无效；请使用 --help 查看用法。');
    else args.input = value;
  }
  if(!args.help && !args.input) throw new Error('缺少输入文件；请使用 --help 查看用法。');
  return args;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if(args.help) {
    process.stdout.write('用法：node scripts/migrate-theme-identity.cjs <input.json|configmap.yaml> [-o new-file]\n仅离线改写主题身份与内部资源路径；默认输出到 stdout，不修改输入，不连接 Halo。\n');
    return;
  }
  const input = path.resolve(args.input);
  const output = args.output ? path.resolve(args.output) : null;
  if(output === input) throw new Error('输出不能与输入文件相同。');
  let raw;
  try {
    raw = fs.readFileSync(input, 'utf8');
  } catch {
    throw new Error('无法读取输入文件。');
  }
  const parsed = parseInput(raw);
  const migrated = migrateDocument(parsed.document);
  const serialized = parsed.format === 'json'
    ? JSON.stringify(migrated, null, 2) + '\n'
    : loadYaml().dump(migrated, {noRefs: true, lineWidth: -1});
  if(!output) {
    process.stdout.write(serialized);
    return;
  }
  let fd;
  try {
    fd = fs.openSync(output, 'wx', 0o600);
  } catch {
    throw new Error('无法创建输出文件；目标必须不存在，且不能是输入文件或其链接。');
  }
  try {
    fs.fchmodSync(fd, 0o600);
    fs.writeFileSync(fd, serialized, 'utf8');
  } catch {
    throw new Error('无法写入输出文件。');
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = {migrateDocument, parseInput, rewriteAssets, OLD_THEME, NEW_THEME, OLD_CONFIG_MAP, NEW_CONFIG_MAP};
if(require.main === module) {
  try {
    main();
  } catch(error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
