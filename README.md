# Vedika Wix Widget

Embeddable astrology widgets powered by [Vedika Intelligence API](https://vedika.io).
Works with Wix (Velo HTML embed), Shopify, WordPress, Squarespace, or any HTML page.

## Widgets

| Widget | File | Description |
|--------|------|-------------|
| **All-in-one** | `vedika-widget.js` | Auto-detects type from `data-type` attribute |
| **Horoscope** | `vedika-horoscope.js` | Daily/weekly/monthly horoscope with sign selector |
| **Tarot** | `vedika-tarot.js` | Card of the Day with keywords and affirmation |
| **Panchang** | `vedika-panchang.js` | Today's Vedic panchang (tithi, nakshatra, yoga, karana) |
| **Compatibility** | `vedika-compatibility.js` | Ashtakoot (Guna Milan) zodiac compatibility checker |

## Keep the API key off the page

Earlier versions read a `data-api-key` attribute and sent it from the browser. Anything in page markup reaches every visitor, so anyone could copy the key and spend the account balance. The widgets now ignore `data-api-key` (one console warning, nothing sent). If you used it, rotate that key in the Vedika dashboard: it has already been public.

Live data goes through a small Velo backend on your own Wix site. It reads the key from the Wix Secrets Manager, forwards only the widget routes, and adds the key server-side:

```
browser widget ──GET──> https://www.your-site.com/_functions/vedika/horoscope/aries
                         (Velo backend, key from Secrets Manager)
                           ──GET + Authorization──> https://api.vedika.io/v2/astrology/horoscope/aries
```

`api.vedika.io` also does not answer browser calls from other sites' origins, so a widget on your domain cannot call it directly, with or without a key.

## Wix Setup (live data)

1. **Store the key.** In your site dashboard, open **Developer Tools > Secrets Manager** and add a secret named `VEDIKA_API_KEY` with your `vk_live_...` key.
2. **Add the backend.** Turn on Dev Mode (Wix Editor) or open the Code panel (Wix Studio). Under **Backend**, create `http-functions.js` and `vedika-proxy-core.js` with the contents of `velo/backend/`. If you already have `http-functions.js`, add the `get_vedika` function and its imports to it.
3. **Set the allowed origins.** In `http-functions.js`, set `ALLOWED_ORIGINS` to your site's origin (for example `https://www.your-site.com`). If you place the widget in an **Embed HTML** element, that iframe runs on a different origin: open the published page, find the `/_functions/vedika/...` request in your browser's network panel, and add its `Origin` request header value. Requests from any other browser origin get 403.
4. **Publish the site.** HTTP functions run at `https://www.your-site.com/_functions/vedika/...` (free sites: `https://<user>.wixsite.com/<site>/_functions/vedika/...`).
5. **Add the widget** with `data-proxy-base` pointing at that function:

```html
<link rel="stylesheet" href="https://cdn.vedika.io/widget/styles.css">
<div class="vedika-widget" data-type="horoscope" data-sign="aries"
     data-proxy-base="https://www.your-site.com/_functions/vedika"></div>
<script src="https://cdn.vedika.io/widget/vedika-widget.js"></script>
```

Set `VEDIKA_MODE = 'sandbox'` in `http-functions.js` to serve Vedika's keyless mock data instead; no secret is read and nothing is billed.

**Limits you should know.** The origin check stops other websites from using your function through their visitors' browsers. It does not stop anyone from calling the URL directly, and Velo HTTP functions have no built-in per-client rate limit. Every live call is billed to your Vedika account, so use a key dedicated to this site, watch its usage in the Vedika dashboard, and revoke it if usage looks wrong.

## Routes the backend forwards

Only these GET routes are forwarded; everything else gets 404 and never reaches Vedika. Only `lang` (two lowercase letters) and, for panchang, `include` are passed through.

| Widget | Path under `/_functions/vedika` | `live` (keyed) | `sandbox` (keyless mock) |
|--------|---------------------------------|----------------|--------------------------|
| Horoscope, daily | `/horoscope/:sign` | `GET /v2/astrology/horoscope/:sign` | `GET /sandbox/horoscope/:sign` |
| Horoscope, weekly or monthly | `/horoscope/:sign/weekly`, `/horoscope/:sign/monthly` | `GET /v2/astrology/horoscope/:sign/:period` | `GET /sandbox/horoscope/:sign/:period` |
| Tarot | `/tarot/card-of-the-day` | `GET /v2/tarot/card-of-the-day` | `GET /sandbox/tarot/card-of-the-day` |
| Panchang | `/panchang/today` | `GET /v2/astrology/panchang/today` | `GET /sandbox/panchang/today` |

Known gap, unchanged by the key fix: the **compatibility** widget requests `/astrology/ashtakoota`. No public GET operation matches a sign pair (the published Ashtakoot operation, `POST /v2/astrology/ashtakoot-match`, compares two birth charts), so the backend returns 404 and the widget shows an error. The keyless sandbox path also returned 404 when checked on 2026-09-17.

## Local demo (keyless sandbox)

Without `data-proxy-base`, the widgets call Vedika's keyless sandbox directly. The sandbox returns mock data and accepts browser calls only from Vedika's own sites and `localhost`, so this works for local testing, not on a live site:

```html
<link rel="stylesheet" href="styles.css">
<div class="vedika-widget" data-type="horoscope" data-sign="aries" data-theme="light"></div>
<script src="vedika-widget.js"></script>
```

Serve the folder from `localhost` (for example `python3 -m http.server`) and open `embed.html`.

## Attributes

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `data-type` | `horoscope`, `tarot`, `panchang`, `compatibility` | `horoscope` | Widget type |
| `data-sign` | Any zodiac sign (lowercase) | `aries` | Zodiac sign |
| `data-sign2` | Any zodiac sign | `leo` | Second sign (compatibility only) |
| `data-period` | `daily`, `weekly`, `monthly` | `daily` | Horoscope period |
| `data-theme` | `light`, `dark` | `light` | Color theme |
| `data-lang` | `en`, `hi`, `ta`, `te`, `kn`, `ml`, `mr`, `bn`, `gu`, `pa`, `or`, `as`, `ur`, `ne` | `en` | Language |
| `data-proxy-base` | URL of your Velo backend function | (none: keyless sandbox) | Where the widget sends requests. The backend holds the key. |
| `data-api-key` | — | — | **Ignored.** Never put a key in page markup. |

## JavaScript API

```javascript
// Initialize a specific element
VedikaWidget.init(document.getElementById('my-widget'));

// Re-initialize all widgets on the page
VedikaWidget.initAll();

// Available signs
console.log(VedikaWidget.SIGNS);
// [{id:'aries', symbol:'♈', name:'Aries'}, ...]
```

## Multiple Widgets

Place as many widgets as needed on a single page. Give each one the same `data-proxy-base`:

```html
<div class="vedika-widget" data-type="horoscope" data-sign="aries" data-proxy-base="https://www.your-site.com/_functions/vedika"></div>
<div class="vedika-widget" data-type="tarot" data-theme="dark" data-proxy-base="https://www.your-site.com/_functions/vedika"></div>
<div class="vedika-widget" data-type="panchang" data-lang="hi" data-proxy-base="https://www.your-site.com/_functions/vedika"></div>
<script src="https://cdn.vedika.io/widget/vedika-widget.js"></script>
```

## Demo

Serve this folder from `localhost` and open `embed.html` to see all widgets with light/dark theme toggle. It uses the keyless sandbox (mock data).

## File Structure

```
vedika-wix-widget/
  vedika-widget.js          Main entry (loads correct widget by data-type)
  vedika-horoscope.js       Standalone horoscope widget
  vedika-tarot.js           Standalone tarot widget
  vedika-panchang.js        Standalone panchang widget
  vedika-compatibility.js   Standalone compatibility widget
  styles.css                Shared styles (light + dark theme)
  embed.html                Demo page
  velo/backend/
    http-functions.js       Velo HTTP function get_vedika (key from Secrets Manager)
    vedika-proxy-core.js    Route allowlist, origin check, key injection (no Wix imports)
  test/
    proxy-core.test.mjs     Backend routing and credential tests
    widgets-no-key.test.mjs Widgets never send a key
  README.md                 This file
```

Run the tests with Node 18 or later, no install needed: `node --test test/*.test.mjs`.

## License

Proprietary. Contact sales@vedika.io for commercial licensing.
