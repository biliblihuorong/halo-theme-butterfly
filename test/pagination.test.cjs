const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('../test-support/load.cjs');

function render(conf, href = 'https://example.com/') {
  let html = '';
  const {Pagination} = load('src/js/modules/Pagination.js', ['Pagination'], {
    MainApp: {conf}, window: {location: {href}},
    document: {querySelector: () => ({insertAdjacentHTML: (_, value) => {html = value;}})},
  });
  new Pagination();
  return Array.from(html.matchAll(/href="([^"]+)"[^>]*>\d+<\/a>/g), (match) => match[1]);
}

const conf = {total: 30, page: 1, totalPages: 3, hasNext: true, hasPrevious: false, prevUrl: '/'};
for (const [nextUrl, expected] of [
  ['/page/2', ['/', '/page/2', '/page/3']],
  ['/categories/2024/page/2', ['/categories/2024', '/categories/2024/page/2', '/categories/2024/page/3']],
  ['/archives/2026/10/page/2', ['/archives/2026/10', '/archives/2026/10/page/2', '/archives/2026/10/page/3']],
  ['/friends/page/2?sort=desc', ['/friends?sort=desc', '/friends/page/2?sort=desc', '/friends/page/3?sort=desc']],
]) {
  test(`numeric pages preserve the route: ${nextUrl}`, () => {
    assert.deepEqual(render({...conf, nextUrl}), expected);
  });
}

test('single-page and empty results have no pagination', () => {
  assert.deepEqual(render({...conf, totalPages: 1, hasNext: false}), []);
  assert.deepEqual(render({...conf, total: 0}), []);
});

test('last page uses the previous URL and preserves query parameters', () => {
  assert.deepEqual(render({...conf, page: 3, hasNext: false, hasPrevious: true, prevUrl: '/tags/123/page/2?q=a', nextUrl: '/'}), ['/tags/123?q=a', '/tags/123/page/2?q=a', '/tags/123/page/3?q=a']);
});

test('out-of-range page still links back to valid pages', () => {
  assert.deepEqual(render({...conf, page: 8, totalPages: 7, total: 63, hasNext: false, hasPrevious: true, prevUrl: '/page/7', nextUrl: '/page/7'}),
    ['/page/3', '/page/4', '/page/5', '/page/6', '/page/7']);
});
