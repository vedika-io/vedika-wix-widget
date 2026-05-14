/**
 * Vedika Widget — Main Entry Point
 *
 * Self-contained embeddable widget for Wix (Velo), Shopify, or any HTML page.
 * Loads the appropriate widget module based on data-type attribute.
 *
 * Usage:
 *   <div class="vedika-widget" data-type="horoscope" data-sign="aries" data-theme="light"></div>
 *   <script src="vedika-widget.js"></script>
 *
 * Attributes:
 *   data-type     — "horoscope" | "tarot" | "panchang" | "compatibility"
 *   data-sign     — zodiac sign (for horoscope/compatibility)
 *   data-theme    — "light" | "dark"
 *   data-lang     — language code ("en", "hi", "ta", etc.)
 *   data-api-key  — production API key (omit for sandbox)
 *   data-period   — "daily" | "weekly" | "monthly" (horoscope only)
 *
 * Security: All dynamic text is inserted via textContent or the escapeHtml
 * helper. No raw user input is placed into markup without sanitization.
 *
 * (c) Vedika Intelligence — https://vedika.io
 */

(function () {
  'use strict';

  // =========================================================================
  // CONSTANTS
  // =========================================================================

  var SANDBOX_BASE = 'https://api.vedika.io/sandbox';
  var PROD_BASE = 'https://api.vedika.io/v2/astrology';

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

  // =========================================================================
  // UTILITY — SAFE DOM BUILDERS
  // =========================================================================

  function getBaseUrl(apiKey) {
    return apiKey ? PROD_BASE : SANDBOX_BASE;
  }

  function buildHeaders(apiKey) {
    var h = { 'Accept': 'application/json' };
    if (apiKey) h['X-API-Key'] = apiKey;
    return h;
  }

  function getSignInfo(signId) {
    for (var i = 0; i < SIGNS.length; i++) {
      if (SIGNS[i].id === signId) return SIGNS[i];
    }
    return SIGNS[0];
  }

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  /** Create an element with optional className, set textContent safely */
  function el(tag, className, textContent) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent != null) node.textContent = String(textContent);
    return node;
  }

  /** Append multiple children to parent */
  function append(parent, children) {
    for (var i = 0; i < children.length; i++) {
      if (children[i]) parent.appendChild(children[i]);
    }
    return parent;
  }

  /** Clear all children from element */
  function clearEl(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function showLoading(container) {
    clearEl(container);
    var wrap = el('div', 'vk-loading');
    wrap.appendChild(el('div', 'vk-loading__spinner'));
    wrap.appendChild(el('div', 'vk-loading__text', 'Loading...'));
    container.appendChild(wrap);
  }

  function showError(container, message, retryFn) {
    clearEl(container);
    var wrap = el('div', 'vk-error');
    var icon = el('span', 'vk-error__icon', '⚠');
    var text = el('div', 'vk-error__text', message);
    var btn = el('button', 'vk-error__retry', 'Retry');
    if (retryFn) btn.addEventListener('click', retryFn);
    append(wrap, [icon, text, btn]);
    container.appendChild(wrap);
  }

  function makeFooter(dateStr) {
    var footer = el('div', 'vk-footer');
    var brand = el('div', 'vk-footer__brand');
    brand.appendChild(document.createTextNode('Powered by '));
    var link = el('a');
    link.href = 'https://vedika.io';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Vedika AI';
    brand.appendChild(link);
    var date = el('div', 'vk-footer__date', dateStr || todayStr());
    append(footer, [brand, date]);
    return footer;
  }

  function apiFetch(url, apiKey, lang) {
    var sep = url.indexOf('?') === -1 ? '?' : '&';
    if (lang && lang !== 'en') url += sep + 'lang=' + encodeURIComponent(lang);
    return fetch(url, { headers: buildHeaders(apiKey) })
      .then(function (r) {
        if (!r.ok) throw new Error('API returned ' + r.status);
        return r.json();
      })
      .then(function (json) {
        if (json.success === false) throw new Error(json.error || 'API error');
        return json.data || json;
      });
  }

  // =========================================================================
  // SIGN SELECTOR (shared by horoscope + compatibility)
  // =========================================================================

  function renderSignSelector(activeSign, onSelect) {
    var wrap = el('div', 'vk-sign-selector');
    for (var i = 0; i < SIGNS.length; i++) {
      (function (s) {
        var cls = 'vk-sign-btn' + (s.id === activeSign ? ' active' : '');
        var btn = el('button', cls);
        btn.setAttribute('data-sign', s.id);
        var sym = el('span', 'vk-sign-btn__symbol', s.symbol);
        btn.appendChild(sym);
        btn.appendChild(document.createTextNode(s.name));
        btn.addEventListener('click', function () { onSelect(s.id); });
        wrap.appendChild(btn);
      })(SIGNS[i]);
    }
    return wrap;
  }

  // =========================================================================
  // HOROSCOPE WIDGET
  // =========================================================================

  function renderHoroscope(container, opts) {
    var sign = opts.sign || 'aries';
    var period = opts.period || 'daily';
    var apiKey = opts.apiKey;
    var lang = opts.lang;
    var base = getBaseUrl(apiKey);

    function load(s) {
      sign = s;
      showLoading(container);

      var path = period === 'daily'
        ? '/horoscope/' + sign
        : '/horoscope/' + sign + '/' + period;

      apiFetch(base + path, apiKey, lang)
        .then(function (data) { render(data); })
        .catch(function (err) { showError(container, err.message, function () { load(sign); }); });
    }

    function render(data) {
      clearEl(container);
      var info = getSignInfo(sign);

      // Header
      var header = el('div', 'vk-header');
      var title = el('div', 'vk-header__title');
      title.appendChild(el('span', 'vk-header__icon', info.symbol));
      title.appendChild(document.createTextNode(' ' + info.name + ' Horoscope'));
      header.appendChild(title);
      header.appendChild(el('span', 'vk-header__badge', data.period || period));
      container.appendChild(header);

      // Sign selector
      container.appendChild(renderSignSelector(sign, load));

      // Prediction
      container.appendChild(el('div', 'vk-prediction', data.prediction || ''));

      // Categories
      if (data.categories) {
        var catGrid = el('div', 'vk-categories');
        var cats = ['love', 'career', 'health', 'finance'];
        var catLabels = { love: '❤ love', career: '💼 career', health: '🌿 health', finance: '💰 finance' };
        for (var i = 0; i < cats.length; i++) {
          var c = data.categories[cats[i]];
          if (!c) continue;
          var catEl = el('div', 'vk-category');
          catEl.appendChild(el('div', 'vk-category__label', catLabels[cats[i]]));
          catEl.appendChild(el('div', 'vk-category__text', c.text || ''));
          if (c.score) catEl.appendChild(el('span', 'vk-category__score', c.score + '/100'));
          catGrid.appendChild(catEl);
        }
        container.appendChild(catGrid);
      }

      // Lucky items
      var luckyRow = el('div', 'vk-lucky-row');
      var luckyItems = [
        { label: 'Lucky #', value: data.lucky_number },
        { label: 'Color', value: data.lucky_color },
        { label: 'Mood', value: data.mood },
        { label: 'Match', value: data.compatibility }
      ];
      for (var j = 0; j < luckyItems.length; j++) {
        if (luckyItems[j].value == null) continue;
        var item = el('span', 'vk-lucky-item');
        item.appendChild(el('span', 'vk-lucky-item__label', luckyItems[j].label));
        item.appendChild(document.createTextNode(' ' + luckyItems[j].value));
        luckyRow.appendChild(item);
      }
      container.appendChild(luckyRow);

      container.appendChild(makeFooter(data.date));
    }

    load(sign);
  }

  // =========================================================================
  // TAROT WIDGET
  // =========================================================================

  function renderTarot(container, opts) {
    var apiKey = opts.apiKey;
    var lang = opts.lang;
    var base = getBaseUrl(apiKey);

    function load() {
      showLoading(container);
      apiFetch(base + '/tarot/card-of-the-day', apiKey, lang)
        .then(function (data) { render(data); })
        .catch(function (err) { showError(container, err.message, load); });
    }

    function render(data) {
      clearEl(container);
      var card = data.card || {};
      var arcanaLabel = card.arcana === 'major' ? 'Major Arcana' : (card.suit ? card.suit + ' • Minor Arcana' : 'Minor Arcana');
      var orientLabel = card.upright ? 'Upright' : 'Reversed';

      // Header
      var header = el('div', 'vk-header');
      var title = el('div', 'vk-header__title');
      title.appendChild(el('span', 'vk-header__icon', '🃏'));
      title.appendChild(document.createTextNode(' Card of the Day'));
      header.appendChild(title);
      header.appendChild(el('span', 'vk-header__badge', orientLabel));
      container.appendChild(header);

      // Card display
      var cardDiv = el('div', 'vk-tarot-card');
      cardDiv.appendChild(el('span', 'vk-tarot-card__symbol', '🃏'));
      cardDiv.appendChild(el('div', 'vk-tarot-card__name', card.name || 'Unknown'));
      cardDiv.appendChild(el('div', 'vk-tarot-card__arcana', arcanaLabel));
      cardDiv.appendChild(el('div', 'vk-tarot-card__meaning', card.meaning || ''));

      if (card.keywords && card.keywords.length) {
        var kwDiv = el('div', 'vk-tarot-keywords');
        for (var i = 0; i < card.keywords.length; i++) {
          kwDiv.appendChild(el('span', 'vk-tarot-keyword', card.keywords[i]));
        }
        cardDiv.appendChild(kwDiv);
      }
      container.appendChild(cardDiv);

      if (data.affirmation) {
        container.appendChild(el('div', 'vk-tarot-affirmation', '"' + data.affirmation + '"'));
      }

      container.appendChild(makeFooter(data.date || todayStr()));
    }

    load();
  }

  // =========================================================================
  // PANCHANG WIDGET
  // =========================================================================

  function renderPanchang(container, opts) {
    var apiKey = opts.apiKey;
    var lang = opts.lang;
    var base = getBaseUrl(apiKey);

    function load() {
      showLoading(container);
      apiFetch(base + '/panchang/today?include=sunrise,festivals', apiKey, lang)
        .then(function (data) { render(data); })
        .catch(function (err) { showError(container, err.message, load); });
    }

    function panchangItem(label, value, detail) {
      var item = el('div', 'vk-panchang-item');
      item.appendChild(el('div', 'vk-panchang-item__label', label));
      item.appendChild(el('div', 'vk-panchang-item__value', value));
      if (detail) item.appendChild(el('div', 'vk-panchang-item__detail', detail));
      return item;
    }

    function extractName(field) {
      if (!field) return '';
      if (typeof field === 'string') return field;
      return field.name || '';
    }

    function render(data) {
      clearEl(container);

      // Header
      var header = el('div', 'vk-header');
      var title = el('div', 'vk-header__title');
      title.appendChild(el('span', 'vk-header__icon', '🕉'));
      title.appendChild(document.createTextNode(' Today\'s Panchang'));
      header.appendChild(title);
      header.appendChild(el('span', 'vk-header__badge', 'Vedic'));
      container.appendChild(header);

      var grid = el('div', 'vk-panchang-grid');

      if (data.tithi) grid.appendChild(panchangItem('Tithi', extractName(data.tithi)));
      if (data.nakshatra) grid.appendChild(panchangItem('Nakshatra', extractName(data.nakshatra)));
      if (data.yoga) grid.appendChild(panchangItem('Yoga', extractName(data.yoga)));
      if (data.karana) grid.appendChild(panchangItem('Karana', extractName(data.karana)));

      if (data.sunrise) {
        var sr = data.sunrise;
        if (sr.sunrise || sr.time || typeof sr === 'string') {
          grid.appendChild(panchangItem('Sunrise', sr.sunrise || sr.time || String(sr)));
        }
        if (sr.sunset) {
          grid.appendChild(panchangItem('Sunset', sr.sunset));
        }
      }

      if (data.vara) grid.appendChild(panchangItem('Vara', extractName(data.vara)));

      container.appendChild(grid);

      // Festivals
      if (data.upcoming_festivals && data.upcoming_festivals.length) {
        var festWrap = el('div', 'vk-panchang-item vk-panchang-item--full');
        festWrap.style.marginBottom = '12px';
        festWrap.appendChild(el('div', 'vk-panchang-item__label', 'Upcoming Festivals'));
        var count = Math.min(data.upcoming_festivals.length, 3);
        for (var i = 0; i < count; i++) {
          var f = data.upcoming_festivals[i];
          var fName = typeof f === 'string' ? f : (f.name || '');
          var fDate = (f && f.date) ? ' (' + f.date + ')' : '';
          var fDetail = el('div', 'vk-panchang-item__detail', fName + fDate);
          fDetail.style.marginTop = '4px';
          festWrap.appendChild(fDetail);
        }
        container.appendChild(festWrap);
      }

      container.appendChild(makeFooter(data.datetime ? data.datetime.split('T')[0] : todayStr()));
    }

    load();
  }

  // =========================================================================
  // COMPATIBILITY WIDGET
  // =========================================================================

  function renderCompatibility(container, opts) {
    var sign1 = opts.sign || 'aries';
    var sign2 = opts.sign2 || 'leo';
    var apiKey = opts.apiKey;
    var lang = opts.lang;
    var base = getBaseUrl(apiKey);

    function load() {
      var resultDiv = container.querySelector('#vk-compat-result');
      if (resultDiv) {
        clearEl(resultDiv);
        var ldiv = el('div', 'vk-loading');
        ldiv.appendChild(el('div', 'vk-loading__spinner'));
        resultDiv.appendChild(ldiv);
      }
      apiFetch(base + '/astrology/ashtakoota', apiKey, lang)
        .then(function (data) { renderResult(data); })
        .catch(function (err) {
          if (resultDiv) {
            clearEl(resultDiv);
            resultDiv.appendChild(el('div', 'vk-error__text', err.message));
          }
        });
    }

    function buildUI() {
      clearEl(container);

      // Header
      var header = el('div', 'vk-header');
      var title = el('div', 'vk-header__title');
      title.appendChild(el('span', 'vk-header__icon', '❤'));
      title.appendChild(document.createTextNode(' Compatibility'));
      header.appendChild(title);
      header.appendChild(el('span', 'vk-header__badge', 'Ashtakoot'));
      container.appendChild(header);

      // Input row
      var inputRow = el('div', 'vk-input-row');
      var sel1 = el('select', 'vk-select');
      sel1.id = 'vk-compat-sign1';
      var sel2 = el('select', 'vk-select');
      sel2.id = 'vk-compat-sign2';

      for (var i = 0; i < SIGNS.length; i++) {
        var opt1 = el('option', null, SIGNS[i].symbol + ' ' + SIGNS[i].name);
        opt1.value = SIGNS[i].id;
        if (SIGNS[i].id === sign1) opt1.selected = true;
        sel1.appendChild(opt1);
        var opt2 = el('option', null, SIGNS[i].symbol + ' ' + SIGNS[i].name);
        opt2.value = SIGNS[i].id;
        if (SIGNS[i].id === sign2) opt2.selected = true;
        sel2.appendChild(opt2);
      }

      var checkBtn = el('button', 'vk-btn', 'Check');
      checkBtn.id = 'vk-compat-check';
      checkBtn.addEventListener('click', function () {
        sign1 = sel1.value;
        sign2 = sel2.value;
        load();
      });

      append(inputRow, [sel1, sel2, checkBtn]);
      container.appendChild(inputRow);

      var resultDiv = el('div');
      resultDiv.id = 'vk-compat-result';
      container.appendChild(resultDiv);
      container.appendChild(makeFooter());
    }

    function renderResult(data) {
      var resultDiv = container.querySelector('#vk-compat-result');
      if (!resultDiv) return;
      clearEl(resultDiv);

      var info1 = getSignInfo(sign1);
      var info2 = getSignInfo(sign2);
      var totalPoints = data.total_points || 36;
      var scored = data.received_points || data.scored_points || 28;
      var pct = Math.round((scored / totalPoints) * 100);

      // Signs display
      var signsRow = el('div', 'vk-compat-signs');
      var s1div = el('div', 'vk-compat-sign');
      s1div.appendChild(el('span', 'vk-compat-sign__symbol', info1.symbol));
      s1div.appendChild(el('div', 'vk-compat-sign__name', info1.name));
      var heart = el('span', 'vk-compat-heart', '❤');
      var s2div = el('div', 'vk-compat-sign');
      s2div.appendChild(el('span', 'vk-compat-sign__symbol', info2.symbol));
      s2div.appendChild(el('div', 'vk-compat-sign__name', info2.name));
      append(signsRow, [s1div, heart, s2div]);
      resultDiv.appendChild(signsRow);

      // Score
      var scoreDiv = el('div', 'vk-compat-score');
      scoreDiv.appendChild(el('div', 'vk-compat-score__value', scored + '/' + totalPoints));
      scoreDiv.appendChild(el('div', 'vk-compat-score__label', pct + '% Compatible'));
      resultDiv.appendChild(scoreDiv);

      // Koot details
      if (data.koots && data.koots.length) {
        var list = el('ul', 'vk-compat-details');
        for (var i = 0; i < data.koots.length; i++) {
          var k = data.koots[i];
          var maxPts = k.max_points || k.maxPoints || 8;
          var gotPts = k.received_points || k.receivedPoints || k.points || 0;
          var barPct = Math.round((gotPts / maxPts) * 100);

          var li = el('li');
          li.appendChild(el('span', 'vk-compat-details__name', k.name || k.koot || ''));
          li.appendChild(el('span', null, gotPts + '/' + maxPts));
          var bar = el('span', 'vk-compat-details__bar');
          var fill = el('span', 'vk-compat-details__fill');
          fill.style.width = barPct + '%';
          bar.appendChild(fill);
          li.appendChild(bar);
          list.appendChild(li);
        }
        resultDiv.appendChild(list);
      }

      if (data.recommendation) {
        resultDiv.appendChild(el('div', 'vk-prediction', data.recommendation));
      }
    }

    buildUI();
  }

  // =========================================================================
  // ROUTER — picks widget by data-type
  // =========================================================================

  var WIDGET_MAP = {
    horoscope: renderHoroscope,
    tarot: renderTarot,
    panchang: renderPanchang,
    compatibility: renderCompatibility
  };

  function initWidget(elem) {
    var type = (elem.getAttribute('data-type') || 'horoscope').toLowerCase();
    var theme = elem.getAttribute('data-theme') || 'light';
    elem.setAttribute('data-theme', theme);

    var opts = {
      sign: (elem.getAttribute('data-sign') || 'aries').toLowerCase(),
      sign2: (elem.getAttribute('data-sign2') || 'leo').toLowerCase(),
      period: (elem.getAttribute('data-period') || 'daily').toLowerCase(),
      apiKey: elem.getAttribute('data-api-key') || '',
      lang: elem.getAttribute('data-lang') || 'en',
      theme: theme
    };

    var renderer = WIDGET_MAP[type];
    if (renderer) {
      renderer(elem, opts);
    } else {
      clearEl(elem);
      elem.appendChild(el('div', 'vk-error__text', 'Unknown widget type: ' + type + '. Supported: horoscope, tarot, panchang, compatibility'));
    }
  }

  // =========================================================================
  // AUTO-INIT: find all .vedika-widget on page load
  // =========================================================================

  function initAll() {
    var widgets = document.querySelectorAll('.vedika-widget');
    for (var i = 0; i < widgets.length; i++) {
      initWidget(widgets[i]);
    }
  }

  // Inject CSS if not already present
  function injectCSS() {
    if (document.querySelector('link[data-vedika-styles]')) return;
    var currentScript = document.currentScript;
    if (!currentScript) return;
    var basePath = currentScript.src.replace(/\/[^/]*$/, '/');
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = basePath + 'styles.css';
    link.setAttribute('data-vedika-styles', '1');
    document.head.appendChild(link);
  }

  // Public API
  if (typeof window !== 'undefined') {
    window.VedikaWidget = {
      init: initWidget,
      initAll: initAll,
      SIGNS: SIGNS
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { injectCSS(); initAll(); });
  } else {
    injectCSS();
    initAll();
  }

})();
