#!/usr/bin/env node
/**
 * 将 halo-theme-butterfly 旧版 ConfigMap 中的页面首屏配置迁移到新的 page_hero 分组。
 *
 * 背景:settings.yaml 中原本有 5 个独立 group(archives / tags / categories / friends / links),
 * 合并为一个 page_hero group 后,ConfigMap.data.default JSON 里的字段路径需要重写:
 *
 *   archives.enable_above         -> page_hero.archives.enable_above
 *   archives.above_background     -> page_hero.archives.above_background
 *   tags.enable_above             -> page_hero.tags.enable_above
 *   tags.above_background         -> page_hero.tags.above_background
 *   categories.enable_above       -> page_hero.categories.enable_above
 *   categories.above_background   -> page_hero.categories.above_background
 *   friends.enable_above          -> page_hero.friends.enable_above
 *   friends.above_background      -> page_hero.friends.above_background
 *   friends.layout                -> page_hero.friends.layout
 *   links.enable_above            -> page_hero.links.enable_above
 *   links.above_background        -> page_hero.links.above_background
 *   links.footer_content          -> page_hero.links.footer_content
 *
 * 用法:
 *   node scripts/migrate-page-hero.js theme-butterfly-setting.backup.yaml > migrated.yaml
 *   node scripts/migrate-page-hero.js theme-butterfly-setting.backup.yaml -o migrated.yaml
 *   node scripts/migrate-page-hero.js theme-butterfly-setting.backup.yaml --in-place
 *
 * 脚本是幂等的:再次运行不会重复迁移。
 */
const fs = require('fs');
const path = require('path');

const OLD_KEYS = ['archives', 'tags', 'categories', 'friends', 'links'];

function parseArgs() {
  const args = {
    input: null,
    output: null,
    inPlace: false,
  };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '-o' || a === '--output') {
      args.output = process.argv[++i];
    } else if (a === '--in-place') {
      args.inPlace = true;
    } else if (!args.input) {
      args.input = a;
    }
  }
  return args;
}

function loadYamdok() {
  try {
    return require('yamljs');
  } catch (e) {
    throw new Error(
      '缺少 yamljs 依赖,请先在主题目录下执行 npm install yamljs\n' +
      '(它已经列在 devDependencies 中,只是没安装)。',
    );
  }
}

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function migrateConfig(defaultObj) {
  if (!isPlainObject(defaultObj)) {
    return { config: defaultObj, movedKeys: [], skipped: true };
  }

  // 已经在新结构:什么都不做
  if (isPlainObject(defaultObj.page_hero)) {
    return { config: defaultObj, movedKeys: [], skipped: true };
  }

  const movedKeys = [];
  const pageHero = {};

  for (const key of OLD_KEYS) {
    if (isPlainObject(defaultObj[key])) {
      pageHero[key] = defaultObj[key];
      delete defaultObj[key];
      movedKeys.push(key);
    }
  }

  if (movedKeys.length > 0) {
    defaultObj.page_hero = pageHero;
  }

  return { config: defaultObj, movedKeys, skipped: false };
}

function main() {
  const args = parseArgs();
  if (!args.input) {
    console.error('用法:node scripts/migrate-page-hero.js <input.yaml> [-o output.yaml] [--in-place]');
    process.exit(2);
  }
  if (args.inPlace && args.output) {
    console.error('--in-place 与 -o 互斥。');
    process.exit(2);
  }

  const inputPath = path.resolve(args.input);
  const raw = fs.readFileSync(inputPath, 'utf8');
  const yaml = loadYamdok();
  const doc = yaml.parse(raw);

  if (!doc || doc.kind !== 'ConfigMap') {
    console.error(`警告:输入文件 kind 是 ${doc?.kind ?? '?'} 而非 ConfigMap,继续尝试处理 data.default 字段。`);
  }

  const data = doc?.data;
  if (!data || typeof data.default !== 'string') {
    console.error('未找到 data.default JSON 字段,无需迁移。');
    process.exit(0);
  }

  let defaultObj;
  try {
    defaultObj = JSON.parse(data.default);
  } catch (e) {
    console.error(`data.default 解析失败:${e.message}`);
    process.exit(1);
  }

  const { config, movedKeys, skipped } = migrateConfig(defaultObj);

  if (skipped) {
    console.log('未发现旧字段(page_hero 已存在或无 archives/tags/categories/friends/links 顶层键),无需迁移。');
    process.exit(0);
  }
  if (movedKeys.length === 0) {
    console.log('未发现需要迁移的字段。');
    process.exit(0);
  }

  doc.data.default = JSON.stringify(config);

  const out = yaml.dump(doc, 4, 2);

  if (args.inPlace) {
    fs.writeFileSync(inputPath, out, 'utf8');
    console.log(`已就地更新 ${inputPath}`);
  } else if (args.output) {
    const outPath = path.resolve(args.output);
    fs.writeFileSync(outPath, out, 'utf8');
    console.log(`已写入 ${outPath}`);
  } else {
    process.stdout.write(out);
  }

  console.error(`已迁移分组:${movedKeys.join(', ')}`);
}

try {
  main();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
