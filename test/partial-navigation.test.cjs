const assert = require('node:assert/strict');
const {shouldHandle} = require('../src/js/modules/PartialNavigation');

const event = {button: 0, defaultPrevented: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false};
const link = {origin: 'https://example.com', target: '', hasAttribute: () => false};

assert.equal(shouldHandle(event, link, 'https://example.com'), true);
assert.equal(shouldHandle({...event, ctrlKey: true}, link, 'https://example.com'), false);
assert.equal(shouldHandle(event, {...link, origin: 'https://other.example'}, 'https://example.com'), false);
