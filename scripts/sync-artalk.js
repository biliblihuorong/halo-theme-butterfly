#!/usr/bin/env node
/**
 * 从配置的 Artalk 服务端拉取最新的 Artalk.js / Artalk.css
 * 默认地址与 settings.yaml 中的默认值保持一致，可通过 --server 覆盖
 *
 * 用法:
 *   node scripts/sync-artalk.js
 *   node scripts/sync-artalk.js --server https://artalk.example.com
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

function parseArgs() {
  const args = { server: 'https://artalk.example.com' };
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--server' && process.argv[i + 1]) {
      args.server = process.argv[i + 1].replace(/\/$/, '');
      i++;
    }
  }
  return args;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        return download(new URL(res.headers.location, url).toString(), dest)
          .then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  const args = parseArgs();
  const srcDir = path.resolve(__dirname, '..', 'src', 'plugins', 'artalk');
  fs.mkdirSync(srcDir, { recursive: true });

  const targets = [
    { name: 'Artalk.js', url: `${args.server}/dist/Artalk.js` },
    { name: 'Artalk.css', url: `${args.server}/dist/Artalk.css` },
  ];

  for (const t of targets) {
    const dest = path.join(srcDir, t.name);
    process.stdout.write(`Downloading ${t.url} -> ${path.relative(process.cwd(), dest)} ... `);
    try {
      await download(t.url, dest);
      const size = fs.statSync(dest).size;
      console.log(`OK (${(size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      process.exitCode = 1;
    }
  }

  console.log('Done. Run `npm run build` to produce minified artifacts.');
}

main();
