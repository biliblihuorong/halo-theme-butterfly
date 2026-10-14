const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(file, names, globals = {}) {
  const filename = path.join(__dirname, '..', file);
  const source = fs.readFileSync(filename, 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^@App\([^\n]*\)\r?\n/gm, '')
    .replace(/^export default /gm, '')
    .replace(/^export /gm, '')
    .replace(/import\(\/\* webpackChunkName: "echarts" \*\/ '([^']+)'\)/g, "loadChartModule('$1')");
  return vm.runInNewContext(`${source}\n({${names.join(',')}})`, {
    URL, setTimeout, clearTimeout, console, ...globals,
  }, {filename});
}

module.exports = {load};
