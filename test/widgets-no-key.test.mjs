// The Wix widgets must never send a Vedika key from the browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

class FakeNode {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase(); this.childNodes = []; this.attributes = {}; this.style = {};
    this.className = ''; this.textContent = ''; this.value = ''; this.listeners = {};
  }
  get firstChild() { return this.childNodes[0] || null; }
  get children() { return this.childNodes; }
  appendChild(child) { this.childNodes.push(child); return child; }
  insertBefore(child) { this.childNodes.unshift(child); return child; }
  removeChild(child) { this.childNodes = this.childNodes.filter((c) => c !== child); return child; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null; }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  get classList() { return { add() {}, remove() {}, toggle() {}, contains: () => false }; }
}

function page(file, widgets) {
  const fetches = [];
  const warnings = [];
  const document = {
    readyState: 'complete',
    currentScript: null,
    head: new FakeNode('head'),
    createElement: (tag) => new FakeNode(tag),
    createTextNode: (text) => ({ textContent: text }),
    querySelector: () => null,
    querySelectorAll: () => widgets,
    addEventListener() {},
  };
  const console = { warn: (msg) => warnings.push(msg), log() {}, error() {} };
  const context = vm.createContext({
    window: {}, document, console, encodeURIComponent, Date, Math, String, Array, Object, JSON, Number, parseInt, isNaN,
    fetch: (url, options) => { fetches.push({ url, options }); return new Promise(() => {}); },
  });
  vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context, { filename: file });
  // The compatibility widgets fetch only when the visitor presses Check: press every click handler once.
  const walk = (node) => { if (!node || !node.childNodes) return; if (node.listeners.click) node.listeners.click({}); node.childNodes.forEach(walk); };
  if (!fetches.length) widgets.forEach(walk);
  return { fetches, warnings };
}

function widget(attrs) {
  const el = new FakeNode('div');
  el.className = 'vedika-widget';
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

const PROXY = 'https://www.shop.example/_functions/vedika/';

for (const [file, type, attrs, path] of [
  ['vedika-widget.js', 'horoscope', { 'data-sign': 'leo', 'data-period': 'weekly' }, '/horoscope/leo/weekly'],
  ['vedika-widget.js', 'tarot', { 'data-lang': 'hi' }, '/tarot/card-of-the-day?lang=hi'],
  ['vedika-widget.js', 'panchang', {}, '/panchang/today?include=sunrise,festivals'],
  ['vedika-horoscope.js', 'horoscope', { 'data-sign': 'virgo' }, '/horoscope/virgo'],
  ['vedika-tarot.js', 'tarot', {}, '/tarot/card-of-the-day'],
  ['vedika-panchang.js', 'panchang', { 'data-lang': 'ta' }, '/panchang/today?include=sunrise,festivals&lang=ta'],
  ['vedika-widget.js', 'compatibility', {}, '/astrology/ashtakoota'],
  ['vedika-compatibility.js', 'compatibility', {}, '/astrology/ashtakoota'],
]) {
  test(`${file} ${type}: a data-api-key is ignored and the request goes to data-proxy-base with no credentials`, () => {
    const withProxy = page(file, [widget({ 'data-type': type, 'data-api-key': 'vk_live_in_markup', 'data-proxy-base': PROXY, ...attrs })]);
    assert.deepEqual(withProxy.fetches.map((f) => f.url), [`${PROXY.replace(/\/$/, '')}${path}`]);
    assert.deepEqual(JSON.parse(JSON.stringify(withProxy.fetches[0].options)), { headers: { Accept: 'application/json' } });
    assert.equal(JSON.stringify(withProxy.fetches).includes('vk_live'), false);
    assert.equal(withProxy.warnings.length, 1);
    assert.match(withProxy.warnings[0], /ignored and was not sent/);

    const sandbox = page(file, [widget({ 'data-type': type, ...attrs })]);
    assert.deepEqual(sandbox.fetches.map((f) => f.url), [`https://api.vedika.io/sandbox${path}`]);
    assert.equal(sandbox.warnings.length, 0);
  });
}

test('no widget source sends a key header or calls the keyed API directly', () => {
  for (const file of ['vedika-widget.js', 'vedika-horoscope.js', 'vedika-tarot.js', 'vedika-panchang.js', 'vedika-compatibility.js']) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /X-API-Key|Authorization|apiKey/, file);
    assert.doesNotMatch(source, /fetch\([^)]*PROD/, file);
  }
});
