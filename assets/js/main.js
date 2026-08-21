/* =========================================================================
   Solvera Sales – allgemeines Verhalten
   Header, Navigation, Scroll-Animationen, Zaehler, FAQ, Kleinigkeiten.
   ========================================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header: Hintergrund ab dem ersten Scrollen ---------- */
  var header = $('#header');
  var toTop  = $('#to-top');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-stuck', y > 12);
    if (toTop)  toTop.classList.toggle('is-visible', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Mobile Navigation ---------- */
  var burger = $('#burger');
  var mnav   = $('#mobile-nav');

  function closeNav() {
    if (!mnav) return;
    mnav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Menü öffnen');
    document.body.classList.remove('nav-open');
  }

  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var open = mnav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
      document.body.classList.toggle('nav-open', open);
    });
    $$('a', mnav).forEach(function (a) { a.addEventListener('click', closeNav); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 880) closeNav(); });
  }

  /* ---------- Aktiven Navigationspunkt markieren ---------- */
  var sections = $$('main section[id]');
  var navLinks = $$('.nav a[href^="#"], .subnav a[href^="#"]');

  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { navObserver.observe(s); });
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  var reveals = $$('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Zahlen hochzaehlen ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    if (reducedMotion) { el.textContent = formatNumber(target); return; }

    var duration = 1400;
    var start = null;

    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);          // easeOutCubic
      el.textContent = formatNumber(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function formatNumber(n) {
    return n.toLocaleString('de-DE');
  }

  var counters = $$('[data-count]');
  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(countUp);
    } else {
      var countObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          countUp(entry.target);
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { countObserver.observe(el); });
    }
  }

  /* ---------- FAQ-Akkordeon ---------- */
  $$('.faq-item').forEach(function (item) {
    var btn = $('.faq-q', item);
    if (!btn) return;
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () {
      var open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Jahreszahl im Footer ---------- */
  $$('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Sanftes Scrollen zu Ankern ----------
     Beruecksichtigt die feste Kopfzeile und, falls vorhanden, die
     Sprungmarken-Leiste darunter. Ohne diesen Versatz landet das Ziel
     hinter den fixierten Leisten. */
  function ankerVersatz() {
    var h = document.querySelector('.header');
    var sub = document.querySelector('.subnav');
    var hoehe = h ? h.getBoundingClientRect().height : 0;
    if (sub) hoehe += sub.getBoundingClientRect().height;
    return hoehe + 14;
  }

  function springeZu(el, weich) {
    if (!el) return;
    var ziel = el.getBoundingClientRect().top + window.scrollY - ankerVersatz();
    window.scrollTo({ top: Math.max(0, ziel), behavior: weich && !reducedMotion ? 'smooth' : 'auto' });
  }

  /* Wird von der eingebetteten Fassung genutzt, damit Anker auch dort
     unterhalb der festen Leisten landen. */
  window.solveraSpringeZu = function (el) { springeZu(el, false); };

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute('href');
    if (!id || id === '#') return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeNav();
    springeZu(target, true);
    history.replaceState(null, '', id);
  });

  /* Anker aus einem seiteninternen Verweis (z. B. bewerben.html#verguetung)
     nach dem vollstaendigen Laden noch einmal korrekt anfahren. */
  if (window.location.hash.length > 1) {
    window.addEventListener('load', function () {
      var ziel = null;
      try { ziel = document.querySelector(window.location.hash); } catch (err) { ziel = null; }
      if (ziel) window.setTimeout(function () { springeZu(ziel, false); }, 60);
    });
  }

})();

/* =========================================================================
   Social-Media-Symbole
   Erscheinen nur fuer Profile, die in config.js hinterlegt sind – leere
   Eintraege werden uebersprungen, damit keine toten Links entstehen.
   ========================================================================= */
(function () {
  'use strict';

  var LINKS = (window.SOLVERA && window.SOLVERA.social) || {};
  var ziele = document.querySelectorAll('[data-social]');
  if (!ziele.length) return;

  var DIENSTE = {
    instagram: { name: 'Instagram', pfad: '<rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" stroke="none"/>' },
    tiktok:    { name: 'TikTok',    pfad: '<path d="M15.5 3v9.9a3.6 3.6 0 1 1-3-3.55"/><path d="M15.5 3c.3 2.2 1.9 3.9 4.1 4.2"/>' },
    linkedin:  { name: 'LinkedIn',  pfad: '<rect x="2.5" y="2.5" width="19" height="19" rx="3"/><path d="M7 10.5V17M7 7.2v.1M11 17v-4a2.2 2.2 0 0 1 4.4 0v4"/>' },
    facebook:  { name: 'Facebook',  pfad: '<path d="M14.5 8.5h2.3M14.5 21V9.8c0-1.6.9-2.8 2.6-2.8h1.6"/><circle cx="12" cy="12" r="9.3"/>' },
    youtube:   { name: 'YouTube',   pfad: '<rect x="2" y="5.5" width="20" height="13" rx="4"/><path d="m10.3 9.4 4.6 2.6-4.6 2.6z"/>' }
  };

  var vorhanden = Object.keys(DIENSTE).filter(function (k) {
    return typeof LINKS[k] === 'string' && LINKS[k].trim();
  });

  Array.prototype.forEach.call(ziele, function (ziel) {
    if (!vorhanden.length) { ziel.remove(); return; }

    vorhanden.forEach(function (k) {
      var d = DIENSTE[k];
      var a = document.createElement('a');
      a.className = 'social-link';
      a.href = LINKS[k].trim();
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', d.name);
      a.title = d.name;
      a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
                    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d.pfad + '</svg>';
      ziel.appendChild(a);
    });
  });
})();
