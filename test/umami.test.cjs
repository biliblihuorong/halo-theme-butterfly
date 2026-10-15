const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('../test-support/load.cjs');

function fixture({getItem = () => null, setItem, fetch: respond} = {}) {
  const visits = {textContent: '99人'};
  const requests = [], writes = [], warnings = [];
  const conf = {umami: {enable: true, url: 'https://umami.example.com', shareId: 'public-share', cacheMinutes: 30}};
  const {Common} = load('src/js/core/common.js', ['Common'], {
    MainApp: {conf}, window: {MainApp: {conf}},
    document: {querySelector: () => null, getElementById: (id) => id === 'umami-visits' ? visits : null},
    localStorage: {getItem, setItem(key, value) {writes.push({key, value}); setItem?.(key, value);}},
    fetch: async (url, options) => {
      requests.push({url, options});
      return respond ? respond(url, options) : {
        ok: true,
        json: async () => url.includes('/api/websites/') ? {pageviews: 1234} : {token: 'share-token', websiteId: 'website-id'},
      };
    },
    useLazyImages() {}, useProgressiveImages() {},
    console: {warn: (...args) => warnings.push(args)},
  });
  new Common();
  return {visits, requests, writes, warnings};
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('Umami displays successful API data even when cache writes are blocked', async () => {
  const f = fixture({setItem() {throw new Error('Storage blocked');}});
  await settle();
  assert.equal(f.visits.textContent, '1,234人');
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[1].options.headers['x-umami-share-token'], 'share-token');
  assert.equal(f.writes.length, 1);
  assert.equal(f.warnings.length, 0);
});

test('Umami fetches and displays visits when cache reads are blocked', async () => {
  const f = fixture({getItem() {throw new Error('Storage blocked');}});
  await settle();
  assert.equal(f.visits.textContent, '1,234人');
  assert.equal(f.requests.length, 2);
  assert.equal(JSON.parse(f.writes[0].value).pageviews, 1234);
});

test('Umami uses an unexpired cached count without requesting the API', async () => {
  const f = fixture({getItem: () => JSON.stringify({pageviews: 4321, time: Date.now()})});
  await settle();
  assert.equal(f.visits.textContent, '4,321人');
  assert.equal(f.requests.length, 0);
  assert.equal(f.writes.length, 0);
});

test('Umami falls back to v2 statistics when the v3 share endpoint fails', async () => {
  const f = fixture({fetch: async (url) => url.includes('/stats?')
    ? {ok: true, json: async () => ({pageviews: {value: 5678}})}
    : {ok: false}});
  await settle();
  assert.equal(f.visits.textContent, '5,678人');
  assert.equal(f.requests.length, 2);
  assert.match(f.requests[1].url, /\/api\/share\/public-share\/stats\?startAt=0&endAt=\d+$/);
  assert.equal(JSON.parse(f.writes[0].value).pageviews, 5678);
});

test('Umami preserves the Halo visit count when both API flows fail', async () => {
  const f = fixture({fetch() {throw new Error('Network unavailable');}});
  await settle();
  assert.equal(f.visits.textContent, '99人');
  assert.equal(f.requests.length, 2);
  assert.equal(f.writes.length, 0);
  assert.equal(f.warnings.length, 1);
});
