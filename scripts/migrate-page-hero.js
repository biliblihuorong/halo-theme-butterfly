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

const OLD_KEYS = ['archives', 'tags', 'categories', 'friends', 'links', 'bangumis', 'post'];

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

function fillMissing(current, legacy) {
  const result = {...legacy, ...current};
  for (const key of Object.keys(legacy)) {
    if (isPlainObject(current[key]) && isPlainObject(legacy[key])) {
      result[key] = fillMissing(current[key], legacy[key]);
    }
  }
  return result;
}

function migrateConfig(defaultObj) {
  if (!isPlainObject(defaultObj)) {
    return { config: defaultObj, movedKeys: [], skipped: true };
  }

  const config = {...defaultObj};
  const movedKeys = [];
  if (config.page_hero != null && !isPlainObject(config.page_hero)) {
    throw new Error('page_hero 必须是对象，未覆盖原配置。');
  }
  const pageHero = {...config.page_hero};

  for (const key of OLD_KEYS) {
    if (isPlainObject(defaultObj[key])) {
      if (pageHero[key] != null && !isPlainObject(pageHero[key])) {
        throw new Error(`page_hero.${key} 必须是对象，未覆盖原配置。`);
      }
      pageHero[key] = fillMissing(pageHero[key] || {}, defaultObj[key]);
      delete config[key];
      movedKeys.push(key);
    }
  }

  if (movedKeys.length > 0) {
    config.page_hero = pageHero;
  }

  if (isPlainObject(config.card)) {
    if (config.style != null && !isPlainObject(config.style)) {
      throw new Error('style 必须是对象，未覆盖原配置。');
    }
    config.style = fillMissing(config.style || {}, config.card);
    delete config.card;
    movedKeys.push('card');
  }
  return {config, movedKeys, skipped: movedKeys.length === 0};
}

function migrateDocument(doc) {
  if (!doc || doc.kind !== 'ConfigMap' || !isPlainObject(doc.data)) {
    throw new Error('输入必须是包含 data 的主题 ConfigMap。');
  }
  const data = {...doc.data};
  if (typeof data.default === 'string') {
    const result = migrateConfig(JSON.parse(data.default));
    data.default = JSON.stringify(result.config);
    return {doc: {...doc, data}, movedKeys: result.movedKeys};
  }
  // Halo 按配置组保存 JSON；同时兼容旧版 data.default 的单 JSON 结构。
  const affected = [...OLD_KEYS, 'page_hero', 'card', 'style'];
  const groups = {};
  for (const key of affected) {
    if (Object.hasOwn(data, key)) groups[key] = JSON.parse(data[key]);
  }
  const result = migrateConfig(groups);
  for (const key of affected) {
    if (Object.hasOwn(result.config, key)) data[key] = JSON.stringify(result.config[key]);
    else delete data[key];
  }
  return {doc: {...doc, data}, movedKeys: result.movedKeys};
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
  const {doc, movedKeys} = migrateDocument(yaml.parse(raw));
  const out = yaml.dump(doc, 4, 2);

  if (args.inPlace) {
    fs.writeFileSync(inputPath, out, 'utf8');
    console.error(`已就地更新 ${inputPath}`);
  } else if (args.output) {
    const outPath = path.resolve(args.output);
    fs.writeFileSync(outPath, out, 'utf8');
    console.error(`已写入 ${outPath}`);
  } else {
    process.stdout.write(out);
  }

  console.error(movedKeys.length ? `已迁移分组:${movedKeys.join(', ')}` : '无需迁移，输出仍为完整 ConfigMap。');
}

module.exports = {migrateConfig, migrateDocument};
if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
