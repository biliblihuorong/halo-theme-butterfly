const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {load} = require('../test-support/load.cjs');

function fixture(site) {
  const links = ['aside.html', 'components.html'].flatMap((file) => {
    const html = fs.readFileSync(path.join(__dirname, '../src/html/views', file), 'utf8');
    const anchors = [...html.matchAll(/<a\b[^>]*\bdata-site-route="([^"]+)"[^>]*>/g)];
    assert.equal(anchors.length, 3, `${file} must expose all three sidebar routes`);
    return anchors.map(([tag, route]) => ({
      dataset: {siteRoute: route},
      href: /\bhref="([^"]+)"/.exec(tag)[1],
      setAttribute(name, value) {this[name] = value;},
    }));
  });
  const MainApp = {conf: {site}};
  const {Common} = load('src/js/core/common.js', ['Common'], {
    MainApp, window: {MainApp},
    document: {
      querySelector: () => null,
      querySelectorAll(selector) {
        assert.equal(selector, '[data-site-route]');
        return links;
      },
    },
    useLazyImages() {}, useProgressiveImages() {},
  });
  new Common();
  return links.map((link) => link.href);
}

const defaults = ['/archives', '/categories', '/tags'];

test('desktop and mobile sidebar links follow Halo custom routes', () => {
  const routes = {archivesUri: '/posts', categoriesUri: '/topics/', tagsUri: '/labels'};
  assert.deepEqual(fixture({routes}), ['/posts', '/topics/', '/labels', '/posts', '/topics/', '/labels']);
});

test('older Halo site models without routes keep the default sidebar links', () => {
  for (const site of [undefined, {title: 'Older Halo'}, {routes: null}]) {
    assert.deepEqual(fixture(site), [...defaults, ...defaults]);
  }
});

test('missing or invalid route values keep their existing sidebar destination', () => {
  const routes = {archivesUri: '/timeline', categoriesUri: '  ', tagsUri: 42};
  assert.deepEqual(fixture({routes}), ['/timeline', '/categories', '/tags', '/timeline', '/categories', '/tags']);
  assert.deepEqual(fixture({routes: {tagsUri: '/tag-list'}}), ['/archives', '/categories', '/tag-list', '/archives', '/categories', '/tag-list']);
});
