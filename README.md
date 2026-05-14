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

## Quick Start

Add this to any HTML page:

```html
<link rel="stylesheet" href="https://cdn.vedika.io/widget/styles.css">
<div class="vedika-widget" data-type="horoscope" data-sign="aries" data-theme="light"></div>
<script src="https://cdn.vedika.io/widget/vedika-widget.js"></script>
```

## Wix Integration

1. In the Wix Editor, add an **HTML iframe** element
2. Click "Enter Code" and paste:

```html
<link rel="stylesheet" href="https://cdn.vedika.io/widget/styles.css">
<div class="vedika-widget" data-type="horoscope" data-sign="aries"></div>
<script src="https://cdn.vedika.io/widget/vedika-widget.js"></script>
```

3. Resize the iframe to fit the widget (recommended: 480x600)

## Attributes

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `data-type` | `horoscope`, `tarot`, `panchang`, `compatibility` | `horoscope` | Widget type |
| `data-sign` | Any zodiac sign (lowercase) | `aries` | Zodiac sign |
| `data-sign2` | Any zodiac sign | `leo` | Second sign (compatibility only) |
| `data-period` | `daily`, `weekly`, `monthly` | `daily` | Horoscope period |
| `data-theme` | `light`, `dark` | `light` | Color theme |
| `data-lang` | `en`, `hi`, `ta`, `te`, `kn`, `ml`, `mr`, `bn`, `gu`, `pa`, `or`, `as`, `ur`, `ne` | `en` | Language |
| `data-api-key` | Your Vedika API key | (none) | Omit for free sandbox |

## Sandbox vs Production

- **Without API key**: Uses the free sandbox (`api.vedika.io/sandbox/`) — returns mock data, no billing.
- **With API key**: Uses production API — returns real astrological data, charges your account.

```html
<!-- Sandbox (free, mock data) -->
<div class="vedika-widget" data-type="horoscope" data-sign="aries"></div>

<!-- Production (real data, requires API key) -->
<div class="vedika-widget" data-type="horoscope" data-sign="aries" data-api-key="vk_live_your_key_here"></div>
```

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

Place as many widgets as needed on a single page:

```html
<div class="vedika-widget" data-type="horoscope" data-sign="aries"></div>
<div class="vedika-widget" data-type="tarot" data-theme="dark"></div>
<div class="vedika-widget" data-type="panchang" data-lang="hi"></div>
<div class="vedika-widget" data-type="compatibility" data-sign="aries" data-sign2="leo"></div>
<script src="https://cdn.vedika.io/widget/vedika-widget.js"></script>
```

## Demo

Open `embed.html` in a browser to see all widgets with light/dark theme toggle.

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
  README.md                 This file
```

## License

Proprietary. Contact sales@vedika.io for commercial licensing.
