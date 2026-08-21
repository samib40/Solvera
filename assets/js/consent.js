/* =========================================================================
   Solvera Sales – Cookie-Einwilligung (Consent Management)
   -------------------------------------------------------------------------
   Tracking-Dienste werden AUSSCHLIESSLICH nach ausdruecklicher Einwilligung
   geladen (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Vorher wird kein
   einziges Skript eines Drittanbieters eingebunden und kein Cookie gesetzt.

   Ist in config.js keine Tracking-ID hinterlegt, erscheint der Banner nicht –
   die Seite bleibt dann komplett trackingfrei.
   ========================================================================= */
(function () {
  'use strict';

  var CFG   = (window.SOLVERA && window.SOLVERA.tracking) || {};
  var KEY   = 'solvera-consent';
  var TAGE  = CFG.speicherdauerTage || 182;

  var hatDienste = !!(CFG.ga4 || CFG.meta || CFG.tiktok);

  /* ---------- Entscheidung lesen / speichern ---------- */
  function lesen() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var val = JSON.parse(raw);
      var alter = (Date.now() - val.zeit) / 86400000;
      if (alter > TAGE) { window.localStorage.removeItem(KEY); return null; }
      return val;
    } catch (e) { return null; }
  }

  function speichern(erlaubt) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ analyse: erlaubt, zeit: Date.now() }));
    } catch (e) { /* privater Modus: Entscheidung gilt nur fuer diese Sitzung */ }
  }

  /* ---------- Dienste laden (erst nach Einwilligung) ---------- */
  var geladen = false;

  function ladeDienste() {
    if (geladen) return;
    geladen = true;

    if (CFG.ga4) {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CFG.ga4);
      document.head.appendChild(s);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', CFG.ga4, { anonymize_ip: true });
    }

    if (CFG.meta) {
      /* eslint-disable */
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
      (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq('init', CFG.meta);
      window.fbq('track', 'PageView');
    }

    if (CFG.tiktok) {
      var t = document.createElement('script');
      t.async = true;
      t.src = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + encodeURIComponent(CFG.tiktok) + '&lib=ttq';
      document.head.appendChild(t);
    }
  }

  /* ---------- Banner ---------- */
  function banner() {
    var el = document.createElement('div');
    el.className = 'consent-bar';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', 'Hinweis zu Cookies');
    el.innerHTML =
      '<div class="consent-bar-inner">' +
        '<div class="consent-bar-txt">' +
          '<strong>Wir verwenden Cookies</strong>' +
          '<p>Wir nutzen Analyse-Cookies, um zu verstehen, wie unsere Website genutzt wird, ' +
          'und unser Angebot zu verbessern. Diese werden nur mit Ihrer Einwilligung gesetzt. ' +
          'Technisch notwendige Funktionen laufen auch ohne. Mehr dazu in der ' +
          '<a href="datenschutz.html">Datenschutzerklärung</a>.</p>' +
        '</div>' +
        '<div class="consent-bar-btns">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-consent="nein">Nur notwendige</button>' +
          '<button type="button" class="btn btn-primary btn-sm" data-consent="ja">Alle akzeptieren</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-visible'); });

    el.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-consent]');
      if (!btn) return;
      var ja = btn.getAttribute('data-consent') === 'ja';
      speichern(ja);
      if (ja) ladeDienste();
      el.classList.remove('is-visible');
      window.setTimeout(function () { el.remove(); }, 320);
    });
  }

  /* ---------- Start ---------- */
  if (!hatDienste) return;              // keine Tracking-ID hinterlegt -> kein Banner

  var stand = lesen();
  if (stand === null) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', banner);
    } else {
      banner();
    }
  } else if (stand.analyse) {
    ladeDienste();
  }

  /* Widerruf: Link mit data-consent-reset irgendwo auf der Seite */
  document.addEventListener('click', function (e) {
    var reset = e.target.closest && e.target.closest('[data-consent-reset]');
    if (!reset) return;
    e.preventDefault();
    try { window.localStorage.removeItem(KEY); } catch (err) {}
    window.location.reload();
  });
})();
