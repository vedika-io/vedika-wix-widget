/**
 * Vedika Panchang Widget — Standalone
 *
 * Displays today's Vedic Panchang (tithi, nakshatra, yoga, karana, sunrise, festivals).
 *
 * Usage:
 *   <div class="vedika-widget" data-type="panchang" data-theme="light" data-lang="hi"></div>
 *   <script src="vedika-panchang.js"></script>
 *
 * (c) Vedika Intelligence — https://vedika.io
 */

(function () {
  'use strict';

  var SANDBOX = 'https://api.vedika.io/sandbox';
  // Retired 2026-09-17: the browser no longer calls the keyed API. The Velo backend maps routes to /v2 server-side.
  var PROD = 'https://api.vedika.io/v2/astrology';

  // No API key is ever read into a request (2026-09-17). A key in page markup
  // is readable by every visitor, who could then spend the account balance.
  // Set data-proxy-base to your Velo backend (velo/backend/http-functions.js,
  // e.g. https://www.your-site.com/_functions/vedika), which adds the key
  // server-side. Without it the widget uses Vedika's keyless sandbox, which
  // answers browsers only on Vedika's own sites and localhost. A leftover
  // data-api-key attribute is ignored with one console warning.
  var keyWarned = false;
  function proxyBase(container) {
    if (container.getAttribute('data-api-key') && !keyWarned) {
      keyWarned = true;
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[vedika] data-api-key is ignored and was not sent. Remove it: a key in page markup is readable by every visitor. Set data-proxy-base to your Velo backend instead.');
      }
    }
    var base = container.getAttribute('data-proxy-base');
    return base ? String(base).replace(/\/+$/, '') : SANDBOX;
  }

  function mk(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }

  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function loading(c) {
    clear(c);
    var w = mk('div', 'vk-loading');
    w.appendChild(mk('div', 'vk-loading__spinner'));
    w.appendChild(mk('div', 'vk-loading__text', 'Loading panchang...'));
    c.appendChild(w);
  }

  function errorState(c, msg, retry) {
    clear(c);
    var w = mk('div', 'vk-error');
    w.appendChild(mk('span', 'vk-error__icon', '⚠'));
    w.appendChild(mk('div', 'vk-error__text', msg));
    var b = mk('button', 'vk-error__retry', 'Retry');
    if (retry) b.addEventListener('click', retry);
    w.appendChild(b);
    c.appendChild(w);
  }

  function footer(date) {
    var f = mk('div', 'vk-footer');
    var brand = mk('div', 'vk-footer__brand');
    brand.appendChild(document.createTextNode('Powered by '));
    var a = mk('a'); a.href = 'https://vedika.io'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Vedika AI';
    brand.appendChild(a);
    f.appendChild(brand);
    f.appendChild(mk('div', 'vk-footer__date', date || new Date().toISOString().split('T')[0]));
    return f;
  }

  function extractName(field) {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field.name || '';
  }

  function panchangItem(label, value, detail) {
    var item = mk('div', 'vk-panchang-item');
    item.appendChild(mk('div', 'vk-panchang-item__label', label));
    item.appendChild(mk('div', 'vk-panchang-item__value', value));
    if (detail) item.appendChild(mk('div', 'vk-panchang-item__detail', detail));
    return item;
  }

  function init(container) {
    var lang = container.getAttribute('data-lang') || 'en';
    var theme = container.getAttribute('data-theme') || 'light';
    container.setAttribute('data-theme', theme);
    var base = proxyBase(container);

    function load() {
      loading(container);
      var url = base + '/panchang/today?include=sunrise,festivals';
      if (lang && lang !== 'en') url += '&lang=' + encodeURIComponent(lang);
      var headers = { 'Accept': 'application/json' };

      fetch(url, { headers: headers })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { if (j.success === false) throw new Error(j.error); return j.data || j; })
        .then(render)
        .catch(function (e) { errorState(container, e.message, load); });
    }

    function render(data) {
      clear(container);

      // Header
      var hdr = mk('div', 'vk-header');
      var ttl = mk('div', 'vk-header__title');
      ttl.appendChild(mk('span', 'vk-header__icon', '🕉'));
      ttl.appendChild(document.createTextNode(' Today\'s Panchang'));
      hdr.appendChild(ttl);
      hdr.appendChild(mk('span', 'vk-header__badge', 'Vedic'));
      container.appendChild(hdr);

      // Grid
      var grid = mk('div', 'vk-panchang-grid');

      if (data.tithi) {
        var tithiName = extractName(data.tithi);
        var tithiDetail = data.tithi && data.tithi.paksha ? data.tithi.paksha.name || '' : '';
        grid.appendChild(panchangItem('Tithi', tithiName, tithiDetail));
      }

      if (data.nakshatra) {
        var nakName = extractName(data.nakshatra);
        var nakLord = data.nakshatra && data.nakshatra.lord ? 'Lord: ' + data.nakshatra.lord : '';
        grid.appendChild(panchangItem('Nakshatra', nakName, nakLord));
      }

      if (data.yoga) {
        var yogaName = extractName(data.yoga);
        var yogaQuality = data.yoga && data.yoga.quality ? data.yoga.quality : '';
        grid.appendChild(panchangItem('Yoga', yogaName, yogaQuality));
      }

      if (data.karana) {
        var karName = extractName(data.karana);
        var karType = data.karana && data.karana.type ? data.karana.type : '';
        grid.appendChild(panchangItem('Karana', karName, karType));
      }

      if (data.vara) grid.appendChild(panchangItem('Vara', extractName(data.vara)));

      if (data.sunrise) {
        var sr = data.sunrise;
        if (sr.sunrise || sr.time || typeof sr === 'string') {
          grid.appendChild(panchangItem('Sunrise', sr.sunrise || sr.time || String(sr)));
        }
        if (sr.sunset) {
          grid.appendChild(panchangItem('Sunset', sr.sunset));
        }
        if (sr.moonrise) {
          grid.appendChild(panchangItem('Moonrise', sr.moonrise));
        }
      }

      container.appendChild(grid);

      // Interpretation
      if (data.tithi && data.tithi.interpretation) {
        var interp = data.tithi.interpretation;
        if (interp.meaning || interp.energy) {
          var predDiv = mk('div', 'vk-prediction', interp.meaning || interp.energy || '');
          container.appendChild(predDiv);
        }
      }

      // Festivals
      if (data.upcoming_festivals && data.upcoming_festivals.length) {
        var festWrap = mk('div', 'vk-panchang-item vk-panchang-item--full');
        festWrap.style.marginBottom = '12px';
        festWrap.appendChild(mk('div', 'vk-panchang-item__label', 'Upcoming Festivals'));
        var count = Math.min(data.upcoming_festivals.length, 5);
        for (var i = 0; i < count; i++) {
          var f = data.upcoming_festivals[i];
          var fName = typeof f === 'string' ? f : (f.name || '');
          var fDate = (f && f.date) ? ' (' + f.date + ')' : '';
          var fEl = mk('div', 'vk-panchang-item__detail', fName + fDate);
          fEl.style.marginTop = '4px';
          festWrap.appendChild(fEl);
        }
        container.appendChild(festWrap);
      }

      // Coordinates
      if (data.coordinates) {
        var coords = mk('div', 'vk-panchang-item__detail',
          'Location: ' + data.coordinates.latitude + ', ' + data.coordinates.longitude);
        coords.style.marginBottom = '8px';
        coords.style.textAlign = 'center';
        container.appendChild(coords);
      }

      container.appendChild(footer(data.datetime ? data.datetime.split('T')[0] : null));
    }

    load();
  }

  function autoInit() {
    var els = document.querySelectorAll('.vedika-widget[data-type="panchang"]');
    for (var i = 0; i < els.length; i++) init(els[i]);
  }

  if (typeof window !== 'undefined') {
    window.VedikaPanchang = { init: init };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
