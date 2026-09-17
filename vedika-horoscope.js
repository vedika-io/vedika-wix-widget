/**
 * Vedika Horoscope Widget — Standalone
 *
 * Displays daily/weekly/monthly horoscope for a zodiac sign.
 * Works standalone or via the main vedika-widget.js loader.
 *
 * Usage:
 *   <div class="vedika-widget" data-type="horoscope" data-sign="aries" data-period="daily"></div>
 *   <script src="vedika-horoscope.js"></script>
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

  var SIGNS = [
    { id: 'aries',       symbol: '♈', name: 'Aries' },
    { id: 'taurus',      symbol: '♉', name: 'Taurus' },
    { id: 'gemini',      symbol: '♊', name: 'Gemini' },
    { id: 'cancer',      symbol: '♋', name: 'Cancer' },
    { id: 'leo',         symbol: '♌', name: 'Leo' },
    { id: 'virgo',       symbol: '♍', name: 'Virgo' },
    { id: 'libra',       symbol: '♎', name: 'Libra' },
    { id: 'scorpio',     symbol: '♏', name: 'Scorpio' },
    { id: 'sagittarius', symbol: '♐', name: 'Sagittarius' },
    { id: 'capricorn',   symbol: '♑', name: 'Capricorn' },
    { id: 'aquarius',    symbol: '♒', name: 'Aquarius' },
    { id: 'pisces',      symbol: '♓', name: 'Pisces' }
  ];

  function getSign(id) {
    for (var i = 0; i < SIGNS.length; i++) { if (SIGNS[i].id === id) return SIGNS[i]; }
    return SIGNS[0];
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
    w.appendChild(mk('div', 'vk-loading__text', 'Loading horoscope...'));
    c.appendChild(w);
  }

  function error(c, msg, retry) {
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

  function init(container) {
    var sign = (container.getAttribute('data-sign') || 'aries').toLowerCase();
    var period = (container.getAttribute('data-period') || 'daily').toLowerCase();
    var lang = container.getAttribute('data-lang') || 'en';
    var theme = container.getAttribute('data-theme') || 'light';
    container.setAttribute('data-theme', theme);
    var base = proxyBase(container);

    function load(s) {
      sign = s;
      loading(container);
      var path = period === 'daily' ? '/horoscope/' + sign : '/horoscope/' + sign + '/' + period;
      var url = base + path;
      if (lang && lang !== 'en') url += '?lang=' + encodeURIComponent(lang);
      var headers = { 'Accept': 'application/json' };

      fetch(url, { headers: headers })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { if (j.success === false) throw new Error(j.error); return j.data || j; })
        .then(render)
        .catch(function (e) { error(container, e.message, function () { load(sign); }); });
    }

    function render(data) {
      clear(container);
      var info = getSign(sign);

      var hdr = mk('div', 'vk-header');
      var ttl = mk('div', 'vk-header__title');
      ttl.appendChild(mk('span', 'vk-header__icon', info.symbol));
      ttl.appendChild(document.createTextNode(' ' + info.name + ' Horoscope'));
      hdr.appendChild(ttl);
      hdr.appendChild(mk('span', 'vk-header__badge', data.period || period));
      container.appendChild(hdr);

      // Sign selector
      var sel = mk('div', 'vk-sign-selector');
      for (var i = 0; i < SIGNS.length; i++) {
        (function (s) {
          var btn = mk('button', 'vk-sign-btn' + (s.id === sign ? ' active' : ''));
          btn.appendChild(mk('span', 'vk-sign-btn__symbol', s.symbol));
          btn.appendChild(document.createTextNode(s.name));
          btn.addEventListener('click', function () { load(s.id); });
          sel.appendChild(btn);
        })(SIGNS[i]);
      }
      container.appendChild(sel);

      container.appendChild(mk('div', 'vk-prediction', data.prediction || ''));

      if (data.categories) {
        var grid = mk('div', 'vk-categories');
        var labels = { love: '❤ love', career: '💼 career', health: '🌿 health', finance: '💰 finance' };
        ['love', 'career', 'health', 'finance'].forEach(function (k) {
          var c = data.categories[k];
          if (!c) return;
          var card = mk('div', 'vk-category');
          card.appendChild(mk('div', 'vk-category__label', labels[k]));
          card.appendChild(mk('div', 'vk-category__text', c.text || ''));
          if (c.score) card.appendChild(mk('span', 'vk-category__score', c.score + '/100'));
          grid.appendChild(card);
        });
        container.appendChild(grid);
      }

      var lucky = mk('div', 'vk-lucky-row');
      [{ l: 'Lucky #', v: data.lucky_number }, { l: 'Color', v: data.lucky_color },
       { l: 'Mood', v: data.mood }, { l: 'Match', v: data.compatibility }].forEach(function (x) {
        if (x.v == null) return;
        var sp = mk('span', 'vk-lucky-item');
        sp.appendChild(mk('span', 'vk-lucky-item__label', x.l));
        sp.appendChild(document.createTextNode(' ' + x.v));
        lucky.appendChild(sp);
      });
      container.appendChild(lucky);
      container.appendChild(footer(data.date));
    }

    load(sign);
  }

  function autoInit() {
    var els = document.querySelectorAll('.vedika-widget[data-type="horoscope"]');
    for (var i = 0; i < els.length; i++) init(els[i]);
  }

  if (typeof window !== 'undefined') {
    window.VedikaHoroscope = { init: init };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
