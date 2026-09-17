// The Velo backend is the only holder of the Vedika key for the Wix widgets.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

// The Velo backend files are plain .js ES modules (Wix's format); load via a data: URL so
// Node treats them as modules without a package.json.
const coreSource = readFileSync(new URL('../velo/backend/vedika-proxy-core.js', import.meta.url), 'utf8');
const { planVedikaRequest, resolveVedikaRoute, SIGNS } = await import(`data:text/javascript;base64,${Buffer.from(coreSource).toString('base64')}`);

const SITE = 'https://www.shop.example';
const live = { mode: 'live', apiKey: 'vk_live_server_only', allowedOrigins: [SITE] };

test('live mode adds the key server-side and forwards only the route and clean query', () => {
  const plan = planVedikaRequest({ path: ['horoscope', 'aries', 'weekly'], query: { lang: 'hi', apiKey: 'vk_live_browser', debug: '1' }, origin: SITE }, live);
  assert.equal(plan.reject, undefined);
  assert.equal(plan.url, 'https://api.vedika.io/v2/astrology/horoscope/aries/weekly?lang=hi');
  assert.deepEqual(plan.upstreamHeaders, { Accept: 'application/json', Authorization: 'Bearer vk_live_server_only' });
  assert.deepEqual(plan.headers, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': SITE, Vary: 'Origin' });
  assert.equal(JSON.stringify(plan.headers).includes('vk_live'), false);
});

test('every widget route maps to a live and a sandbox operation', () => {
  for (const [path, query, liveUrl, sandboxUrl] of [
    [['horoscope', 'leo'], {}, '/v2/astrology/horoscope/leo', '/sandbox/horoscope/leo'],
    [['horoscope', 'leo', 'monthly'], {}, '/v2/astrology/horoscope/leo/monthly', '/sandbox/horoscope/leo/monthly'],
    [['tarot', 'card-of-the-day'], { lang: 'ta' }, '/v2/tarot/card-of-the-day?lang=ta', '/sandbox/tarot/card-of-the-day?lang=ta'],
    [['panchang', 'today'], { include: 'sunrise,festivals', lang: 'hi' }, '/v2/astrology/panchang/today?lang=hi&include=sunrise%2Cfestivals', '/sandbox/panchang/today?lang=hi&include=sunrise%2Cfestivals'],
  ]) {
    assert.equal(planVedikaRequest({ path, query, origin: null }, live).url, `https://api.vedika.io${liveUrl}`);
    const sandbox = planVedikaRequest({ path, query, origin: null }, { mode: 'sandbox', apiKey: null, allowedOrigins: [] });
    assert.equal(sandbox.url, `https://api.vedika.io${sandboxUrl}`);
    assert.deepEqual(sandbox.upstreamHeaders, { Accept: 'application/json' });
  }
  assert.equal(SIGNS.length, 12);
});

test('refuses foreign origins, unknown routes and a missing secret', () => {
  const statuses = [
    planVedikaRequest({ path: ['tarot', 'card-of-the-day'], query: {}, origin: 'https://evil.example' }, live),
    planVedikaRequest({ path: ['astrology', 'ashtakoota'], query: {}, origin: SITE }, live),
    planVedikaRequest({ path: ['horoscope', 'notasign'], query: {}, origin: null }, live),
    planVedikaRequest({ path: ['horoscope', 'aries', 'daily'], query: {}, origin: null }, live),
    planVedikaRequest({ path: ['tarot', 'card-of-the-day', 'x'], query: {}, origin: null }, live),
    planVedikaRequest({ path: ['v2', 'astrology', 'kundli'], query: {}, origin: null }, live),
    planVedikaRequest({ path: undefined, query: {}, origin: null }, live),
    planVedikaRequest({ path: ['tarot', 'card-of-the-day'], query: {}, origin: null }, { mode: 'live', apiKey: '', allowedOrigins: [] }),
  ].map((plan) => [plan.reject && plan.reject.status, plan.url, plan.upstreamHeaders]);
  assert.deepEqual(statuses.map(([status]) => status), [403, 404, 404, 404, 404, 404, 404, 500]);
  for (const [, url, headers] of statuses) { assert.equal(url, undefined); assert.equal(headers, undefined); }
  const noOrigin = planVedikaRequest({ path: ['tarot', 'card-of-the-day'], query: {}, origin: null }, live);
  assert.equal(noOrigin.headers['Access-Control-Allow-Origin'], undefined);
});

test('malformed query values are dropped, not forwarded', () => {
  const plan = planVedikaRequest({ path: ['panchang', 'today'], query: { lang: 'en&x=1', include: 'sunrise;drop' }, origin: null }, live);
  assert.equal(plan.url, 'https://api.vedika.io/v2/astrology/panchang/today');
});

test('the Velo http function reads the key from Secrets Manager and returns only upstream bodies', () => {
  const source = readFileSync(new URL('../velo/backend/http-functions.js', import.meta.url), 'utf8');
  assert.match(source, /from 'wix-secrets-backend\.v2'/);
  assert.match(source, /elevate\(secrets\.getSecretValue\)/);
  assert.match(source, /'VEDIKA_API_KEY'/);
  assert.match(source, /export async function get_vedika\(request\)/);
  assert.match(source, /planVedikaRequest\(/);
  assert.doesNotMatch(source, /body:\s*apiKey|apiKey\s*\}\s*\)\s*;\s*$|vk_(?:live|test)_[A-Za-z0-9]/m);
});

const spec = new URL('../../../web/vedika-public/openapi.json', import.meta.url);
test('live routes are published GET operations (monorepo only)', { skip: !existsSync(spec) && 'openapi.json is not in this checkout' }, () => {
  const paths = JSON.parse(readFileSync(spec, 'utf8')).paths;
  for (const segments of [['horoscope', 'aries'], ['horoscope', 'aries', 'weekly'], ['horoscope', 'aries', 'monthly'], ['tarot', 'card-of-the-day'], ['panchang', 'today']]) {
    const live = resolveVedikaRoute(segments).live.replace('/aries', '/{sign}');
    assert.ok(paths[live]?.get, `${live} is a published GET operation`);
  }
});
