const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('../test-support/load.cjs');

test('actual tag chart registers all components and renders bar data', async () => {
  const echarts = await import('echarts/core.js');
  const {SVGRenderer} = await import('echarts/renderers.js');
  echarts.use(SVGRenderer);
  let rendered;
  const {Tags} = load('src/js/page/tags.js', ['Tags'], {
    document: {querySelector: () => ({})}, MainApp: {},
    loadChartModule: (specifier) => import(`${specifier}.js`),
    useChart(_, register) {
      rendered = (async () => {
        const options = await register(echarts);
        const chart = echarts.init(null, null, {renderer: 'svg', ssr: true, width: 800, height: 400});
        try {
          chart.setOption(options);
          assert.equal(chart.getModel().getSeriesByIndex(0).getData().count(), 2);
          const svg = chart.renderToSVGString();
          assert.match(svg, /Linux/);
          assert.match(svg, /Halo/);
        } finally {chart.dispose();}
      })();
    },
  });
  new Tags().chart([['Halo', 2], ['Linux', 3]]);
  await rendered;
});
