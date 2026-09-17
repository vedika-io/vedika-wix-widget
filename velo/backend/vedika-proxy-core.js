/**
 * Vedika widget proxy — pure routing and credential logic for the Wix Velo
 * backend. No Wix imports, so it can be tested with plain Node.
 *
 * The widget in the page calls `https://<your-site>/_functions/vedika/<route>`.
 * `http-functions.js` (same folder) reads the Vedika key from the Wix Secrets
 * Manager and uses `planVedikaRequest` to decide whether and where to forward.
 * The browser never receives the key.
 *
 * (c) Vedika Intelligence — https://vedika.io
 */

export const VEDIKA_API = 'https://api.vedika.io';
export const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

/**
 * Exact widget routes only. `live` is the keyed path, `sandbox` the keyless
 * mock-data path. Returns null for anything else.
 */
export function resolveVedikaRoute(segments) {
  const [a, b, c, ...rest] = Array.isArray(segments) ? segments : [];
  if (rest.length) return null;
  if (a === 'horoscope' && SIGNS.includes(b) && c === undefined) {
    return { live: `/v2/astrology/horoscope/${b}`, sandbox: `/sandbox/horoscope/${b}`, query: ['lang'] };
  }
  if (a === 'horoscope' && SIGNS.includes(b) && (c === 'weekly' || c === 'monthly')) {
    return { live: `/v2/astrology/horoscope/${b}/${c}`, sandbox: `/sandbox/horoscope/${b}/${c}`, query: ['lang'] };
  }
  if (a === 'tarot' && b === 'card-of-the-day' && c === undefined) {
    return { live: '/v2/tarot/card-of-the-day', sandbox: '/sandbox/tarot/card-of-the-day', query: ['lang'] };
  }
  if (a === 'panchang' && b === 'today' && c === undefined) {
    return { live: '/v2/astrology/panchang/today', sandbox: '/sandbox/panchang/today', query: ['lang', 'include'] };
  }
  return null;
}

function cleanQuery(name, value) {
  if (typeof value !== 'string') return null;
  if (name === 'lang') return /^[a-z]{2}$/.test(value) ? value : null;
  if (name === 'include') return /^[a-z]+(?:,[a-z]+){0,4}$/.test(value) ? value : null;
  return null;
}

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

/**
 * input:  { path: string[], query: object, origin: string|null }  (from the Velo request)
 * config: { mode: 'live'|'sandbox', apiKey: string|null, allowedOrigins: string[] }
 * Returns { headers, reject: { status, body } } or { headers, url, upstreamHeaders }.
 * `headers` are the response headers for the browser (CORS only for an allowed Origin).
 */
export function planVedikaRequest(input, config) {
  const origin = input.origin || null;
  const allowed = Array.isArray(config.allowedOrigins) ? config.allowedOrigins : [];
  const headers = { ...JSON_HEADERS };
  if (origin !== null) {
    if (!allowed.includes(origin)) {
      return { headers, reject: { status: 403, body: JSON.stringify({ error: 'origin not allowed' }) } };
    }
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  const route = resolveVedikaRoute(input.path);
  if (!route) return { headers, reject: { status: 404, body: JSON.stringify({ error: 'not found' }) } };
  const live = config.mode === 'live';
  if (live && !config.apiKey) {
    return { headers, reject: { status: 500, body: JSON.stringify({ error: 'VEDIKA_API_KEY secret is not set' }) } };
  }
  const params = [];
  for (const name of route.query) {
    const clean = cleanQuery(name, input.query ? input.query[name] : undefined);
    if (clean !== null) params.push(`${name}=${encodeURIComponent(clean)}`);
  }
  const url = VEDIKA_API + (live ? route.live : route.sandbox) + (params.length ? `?${params.join('&')}` : '');
  // Built fresh: nothing from the visitor's request is forwarded.
  const upstreamHeaders = { Accept: 'application/json' };
  if (live) upstreamHeaders.Authorization = `Bearer ${config.apiKey}`;
  return { headers, url, upstreamHeaders };
}
