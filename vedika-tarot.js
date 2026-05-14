/**
 * Vedika Tarot Widget — Standalone
 *
 * Displays the tarot Card of the Day with keywords and affirmation.
 *
 * Usage:
 *   <div class="vedika-widget" data-type="tarot" data-theme="dark"></div>
 *   <script src="vedika-tarot.js"></script>
 *
 * (c) Vedika Intelligence — https://vedika.io
 */

(function () {
  'use strict';

  var SANDBOX = 'https://api.vedika.io/sandbox';
  var PROD = 'https://api.vedika.io/v2/astrology';

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
    w.appendChild(mk('div', 'vk-loading__text', 'Drawing your card...'));
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

  function init(container) {
    var apiKey = container.getAttribute('data-api-key') || '';
    var lang = container.getAttribute('data-lang') || 'en';
    var theme = container.getAttribute('data-theme') || 'light';
    container.setAttribute('data-theme', theme);
    var base = apiKey ? PROD : SANDBOX;

    function load() {
      loading(container);
      var url = base + '/tarot/card-of-the-day';
      if (lang && lang !== 'en') url += '?lang=' + encodeURIComponent(lang);
      var headers = { 'Accept': 'application/json' };
      if (apiKey) headers['X-API-Key'] = apiKey;

      fetch(url, { headers: headers })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { if (j.success === false) throw new Error(j.error); return j.data || j; })
        .then(render)
        .catch(function (e) { errorState(container, e.message, load); });
    }

    function render(data) {
      clear(container);
      var card = data.card || {};
      var arcana = card.arcana === 'major' ? 'Major Arcana' : (card.suit ? card.suit + ' — Minor Arcana' : 'Minor Arcana');
      var orient = card.upright ? 'Upright' : 'Reversed';

      // Header
      var hdr = mk('div', 'vk-header');
      var ttl = mk('div', 'vk-header__title');
      ttl.appendChild(mk('span', 'vk-header__icon', '🃏'));
      ttl.appendChild(document.createTextNode(' Card of the Day'));
      hdr.appendChild(ttl);
      hdr.appendChild(mk('span', 'vk-header__badge', orient));
      container.appendChild(hdr);

      // Card visual
      var cardDiv = mk('div', 'vk-tarot-card');
      cardDiv.appendChild(mk('span', 'vk-tarot-card__symbol', '🃏'));
      cardDiv.appendChild(mk('div', 'vk-tarot-card__name', card.name || 'Unknown'));
      cardDiv.appendChild(mk('div', 'vk-tarot-card__arcana', arcana));
      cardDiv.appendChild(mk('div', 'vk-tarot-card__meaning', card.meaning || ''));

      // Keywords
      if (card.keywords && card.keywords.length) {
        var kw = mk('div', 'vk-tarot-keywords');
        for (var i = 0; i < card.keywords.length; i++) {
          kw.appendChild(mk('span', 'vk-tarot-keyword', card.keywords[i]));
        }
        cardDiv.appendChild(kw);
      }
      container.appendChild(cardDiv);

      // Additional info
      if (card.element || card.planet || card.zodiac_association) {
        var lucky = mk('div', 'vk-lucky-row');
        if (card.element) {
          var e1 = mk('span', 'vk-lucky-item');
          e1.appendChild(mk('span', 'vk-lucky-item__label', 'Element'));
          e1.appendChild(document.createTextNode(' ' + card.element));
          lucky.appendChild(e1);
        }
        if (card.planet) {
          var e2 = mk('span', 'vk-lucky-item');
          e2.appendChild(mk('span', 'vk-lucky-item__label', 'Planet'));
          e2.appendChild(document.createTextNode(' ' + card.planet));
          lucky.appendChild(e2);
        }
        if (card.zodiac_association) {
          var e3 = mk('span', 'vk-lucky-item');
          e3.appendChild(mk('span', 'vk-lucky-item__label', 'Zodiac'));
          e3.appendChild(document.createTextNode(' ' + card.zodiac_association));
          lucky.appendChild(e3);
        }
        container.appendChild(lucky);
      }

      // Affirmation
      if (data.affirmation) {
        container.appendChild(mk('div', 'vk-tarot-affirmation', '"' + data.affirmation + '"'));
      }

      container.appendChild(footer(data.date));
    }

    load();
  }

  function autoInit() {
    var els = document.querySelectorAll('.vedika-widget[data-type="tarot"]');
    for (var i = 0; i < els.length; i++) init(els[i]);
  }

  if (typeof window !== 'undefined') {
    window.VedikaTarot = { init: init };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
