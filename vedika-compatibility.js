/**
 * Vedika Compatibility Widget — Standalone
 *
 * Zodiac compatibility checker using Ashtakoot (Guna Milan) matching.
 *
 * Usage:
 *   <div class="vedika-widget" data-type="compatibility" data-sign="aries" data-sign2="leo"></div>
 *   <script src="vedika-compatibility.js"></script>
 *
 * (c) Vedika Intelligence — https://vedika.io
 */

(function () {
  'use strict';

  var SANDBOX = 'https://api.vedika.io/sandbox';
  var PROD = 'https://api.vedika.io/v2/astrology';

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

  function footer() {
    var f = mk('div', 'vk-footer');
    var brand = mk('div', 'vk-footer__brand');
    brand.appendChild(document.createTextNode('Powered by '));
    var a = mk('a'); a.href = 'https://vedika.io'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Vedika AI';
    brand.appendChild(a);
    f.appendChild(brand);
    f.appendChild(mk('div', 'vk-footer__date', new Date().toISOString().split('T')[0]));
    return f;
  }

  function init(container) {
    var sign1 = (container.getAttribute('data-sign') || 'aries').toLowerCase();
    var sign2 = (container.getAttribute('data-sign2') || 'leo').toLowerCase();
    var apiKey = container.getAttribute('data-api-key') || '';
    var lang = container.getAttribute('data-lang') || 'en';
    var theme = container.getAttribute('data-theme') || 'light';
    container.setAttribute('data-theme', theme);
    var base = apiKey ? PROD : SANDBOX;

    var resultContainer;

    function buildUI() {
      clear(container);

      // Header
      var hdr = mk('div', 'vk-header');
      var ttl = mk('div', 'vk-header__title');
      ttl.appendChild(mk('span', 'vk-header__icon', '❤'));
      ttl.appendChild(document.createTextNode(' Zodiac Compatibility'));
      hdr.appendChild(ttl);
      hdr.appendChild(mk('span', 'vk-header__badge', 'Ashtakoot'));
      container.appendChild(hdr);

      // Select inputs
      var row = mk('div', 'vk-input-row');

      var sel1 = mk('select', 'vk-select');
      var sel2 = mk('select', 'vk-select');

      for (var i = 0; i < SIGNS.length; i++) {
        var opt1 = mk('option', null, SIGNS[i].symbol + ' ' + SIGNS[i].name);
        opt1.value = SIGNS[i].id;
        if (SIGNS[i].id === sign1) opt1.selected = true;
        sel1.appendChild(opt1);

        var opt2 = mk('option', null, SIGNS[i].symbol + ' ' + SIGNS[i].name);
        opt2.value = SIGNS[i].id;
        if (SIGNS[i].id === sign2) opt2.selected = true;
        sel2.appendChild(opt2);
      }

      var checkBtn = mk('button', 'vk-btn', 'Check');
      checkBtn.addEventListener('click', function () {
        sign1 = sel1.value;
        sign2 = sel2.value;
        loadResult();
      });

      row.appendChild(sel1);
      row.appendChild(sel2);
      row.appendChild(checkBtn);
      container.appendChild(row);

      resultContainer = mk('div');
      container.appendChild(resultContainer);
      container.appendChild(footer());
    }

    function loadResult() {
      clear(resultContainer);
      var ld = mk('div', 'vk-loading');
      ld.appendChild(mk('div', 'vk-loading__spinner'));
      ld.appendChild(mk('div', 'vk-loading__text', 'Calculating compatibility...'));
      resultContainer.appendChild(ld);

      var url = base + '/astrology/ashtakoota';
      if (lang && lang !== 'en') url += '?lang=' + encodeURIComponent(lang);
      var headers = { 'Accept': 'application/json' };
      if (apiKey) headers['X-API-Key'] = apiKey;

      fetch(url, { headers: headers })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { if (j.success === false) throw new Error(j.error); return j.data || j; })
        .then(renderResult)
        .catch(function (e) {
          clear(resultContainer);
          var err = mk('div', 'vk-error');
          err.appendChild(mk('div', 'vk-error__text', e.message));
          var retry = mk('button', 'vk-error__retry', 'Retry');
          retry.addEventListener('click', loadResult);
          err.appendChild(retry);
          resultContainer.appendChild(err);
        });
    }

    function renderResult(data) {
      clear(resultContainer);
      var info1 = getSign(sign1);
      var info2 = getSign(sign2);
      var totalPoints = data.total_points || 36;
      var scored = data.received_points || data.scored_points || 28;
      var pct = Math.round((scored / totalPoints) * 100);

      // Signs row
      var signsRow = mk('div', 'vk-compat-signs');
      var s1 = mk('div', 'vk-compat-sign');
      s1.appendChild(mk('span', 'vk-compat-sign__symbol', info1.symbol));
      s1.appendChild(mk('div', 'vk-compat-sign__name', info1.name));
      signsRow.appendChild(s1);
      signsRow.appendChild(mk('span', 'vk-compat-heart', '❤'));
      var s2 = mk('div', 'vk-compat-sign');
      s2.appendChild(mk('span', 'vk-compat-sign__symbol', info2.symbol));
      s2.appendChild(mk('div', 'vk-compat-sign__name', info2.name));
      signsRow.appendChild(s2);
      resultContainer.appendChild(signsRow);

      // Score
      var scoreDiv = mk('div', 'vk-compat-score');
      scoreDiv.appendChild(mk('div', 'vk-compat-score__value', scored + '/' + totalPoints));
      scoreDiv.appendChild(mk('div', 'vk-compat-score__label', pct + '% Compatible'));
      resultContainer.appendChild(scoreDiv);

      // Koot breakdown
      if (data.koots && data.koots.length) {
        var list = mk('ul', 'vk-compat-details');
        for (var i = 0; i < data.koots.length; i++) {
          var k = data.koots[i];
          var maxPts = k.max_points || k.maxPoints || 8;
          var gotPts = k.received_points || k.receivedPoints || k.points || 0;
          var barPct = Math.round((gotPts / maxPts) * 100);

          var li = mk('li');
          li.appendChild(mk('span', 'vk-compat-details__name', k.name || k.koot || ''));
          li.appendChild(mk('span', null, gotPts + '/' + maxPts));
          var bar = mk('span', 'vk-compat-details__bar');
          var fill = mk('span', 'vk-compat-details__fill');
          fill.style.width = barPct + '%';
          bar.appendChild(fill);
          li.appendChild(bar);
          list.appendChild(li);
        }
        resultContainer.appendChild(list);
      }

      // Recommendation
      if (data.recommendation) {
        resultContainer.appendChild(mk('div', 'vk-prediction', data.recommendation));
      }
    }

    buildUI();
  }

  function autoInit() {
    var els = document.querySelectorAll('.vedika-widget[data-type="compatibility"]');
    for (var i = 0; i < els.length; i++) init(els[i]);
  }

  if (typeof window !== 'undefined') {
    window.VedikaCompatibility = { init: init };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
