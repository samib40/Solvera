/* =========================================================================
   Solvera Sales – Photovoltaik-Rechner
   Mehrstufiger Assistent mit Wirtschaftlichkeits-Schaetzung.
   Alle Rechenwerte stehen in assets/js/config.js (SOLVERA.calc).
   ========================================================================= */
(function () {
  'use strict';

  var form = document.getElementById('calc');
  if (!form) return;

  var C  = (window.SOLVERA && window.SOLVERA.calc) || {};
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var steps    = $$('.calc-step', form);
  var progress = document.getElementById('calc-progress');
  var stepNow  = document.getElementById('calc-step-now');
  var stepMax  = document.getElementById('calc-step-max');
  var current  = 1;
  var total    = steps.length;
  var resultsShown = false;

  /* Zustand des Assistenten */
  var state = {
    haus:      { value: '', label: '', faktor: 1 },
    dach:      { value: '', label: '', faktor: 1 },
    kosten:    180,
    extras:    []
  };

  /* Maximale Anlagengroesse je Gebaeudetyp (Dachflaechen-Reserve) */
  var MAX_KWP_BASIS = 15;

  /* ---------- Fortschrittsanzeige ---------- */
  if (progress) {
    for (var i = 0; i < total; i++) progress.appendChild(document.createElement('i'));
  }
  if (stepMax) stepMax.textContent = String(total);

  function paintProgress() {
    if (!progress) return;
    $$('i', progress).forEach(function (bar, idx) {
      bar.classList.toggle('done', idx < current);
    });
    if (stepNow) stepNow.textContent = String(current);
  }

  function goTo(n) {
    current = Math.max(1, Math.min(total, n));
    steps.forEach(function (s) {
      s.classList.toggle('is-active', Number(s.getAttribute('data-step')) === current);
    });
    paintProgress();

    if (current === 5 && !resultsShown) { renderResult(); resultsShown = true; }

    // Auf Mobilgeraeten den Rechner im Blick behalten
    var card = document.getElementById('calc-card');
    if (card && window.innerWidth <= 1040) {
      var top = card.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: top, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }

  /* ---------- Auswahlfelder (Schritt 1 und 2) ---------- */
  $$('.opt', form).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key   = btn.getAttribute('data-key');
      var group = $$('.opt[data-key="' + key + '"]', form);
      group.forEach(function (b) { b.classList.remove('is-selected'); });
      btn.classList.add('is-selected');

      state[key] = {
        value:  btn.getAttribute('data-value'),
        label:  btn.textContent.trim().split('\n')[0].trim(),
        faktor: parseFloat(btn.getAttribute('data-factor')) || 1
      };
      resultsShown = false;   // Ergebnis muss neu berechnet werden

      // "Weiter" im selben Schritt freischalten
      var step = btn.closest('.calc-step');
      var next = $('[data-calc-next]', step);
      if (next) next.disabled = false;

      // Auswahl fuehrt direkt weiter – spart einen Klick
      if (!reducedMotion) {
        window.setTimeout(function () {
          if (step.classList.contains('is-active')) goTo(current + 1);
        }, 260);
      }
    });
  });

  /* ---------- Schieberegler (Schritt 3) ---------- */
  var slider  = document.getElementById('cost');
  var costOut = document.getElementById('cost-out');
  var kwhOut  = document.getElementById('kwh-out');

  function paintSlider() {
    if (!slider) return;
    var min = Number(slider.min), max = Number(slider.max), val = Number(slider.value);
    slider.style.setProperty('--fill', ((val - min) / (max - min) * 100) + '%');
    state.kosten = val;
    if (costOut) costOut.textContent = val;
    if (kwhOut)  kwhOut.textContent  = Math.round(val * 12 / (C.strompreis || 0.35)).toLocaleString('de-DE');
    resultsShown = false;   // Ergebnis muss neu berechnet werden
  }
  if (slider) {
    slider.addEventListener('input', paintSlider);
    paintSlider();
  }

  /* ---------- Mehrfachauswahl (Schritt 4) ---------- */
  $$('.toggle', form).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-extra');
      var on  = btn.classList.toggle('is-selected');
      btn.setAttribute('aria-pressed', String(on));
      var pos = state.extras.indexOf(key);
      if (on && pos === -1) state.extras.push(key);
      if (!on && pos > -1)  state.extras.splice(pos, 1);
      resultsShown = false;
    });
    btn.setAttribute('aria-pressed', 'false');
  });

  /* ---------- Navigation ---------- */
  $$('[data-calc-next]', form).forEach(function (b) {
    b.addEventListener('click', function () { goTo(current + 1); });
  });
  $$('[data-calc-prev]', form).forEach(function (b) {
    b.addEventListener('click', function () { goTo(current - 1); });
  });

  /* ---------- Berechnung ---------- */
  function compute() {
    var strompreis = C.strompreis || 0.35;
    var ertragKwp  = C.ertragProKwp || 950;

    var hatSpeicher = state.extras.indexOf('speicher') > -1;
    var hatWallbox  = state.extras.indexOf('wallbox') > -1;
    var hatWp       = state.extras.indexOf('waermepumpe') > -1;

    // 1. Jahresverbrauch aus der Stromrechnung ableiten
    var verbrauch = (state.kosten * 12) / strompreis;
    if (hatWallbox) verbrauch += (C.mehrbedarfWallbox || 2500);
    if (hatWp)      verbrauch += (C.mehrbedarfWaermepumpe || 3500);

    // 2. Anlagengroesse: Verbrauch mit 10 % Reserve abdecken
    var dachFaktor = state.dach.faktor || 0.92;
    var maxKwp     = MAX_KWP_BASIS * (state.haus.faktor || 1);
    var kwp        = (verbrauch * 1.1) / (ertragKwp * dachFaktor);
    kwp = Math.max(C.kwpMin || 3, Math.min(kwp, maxKwp, C.kwpMax || 100));
    kwp = Math.round(kwp * 2) / 2;                       // auf halbe kWp runden

    // 3. Ertrag und Eigenverbrauch
    var ertrag = kwp * ertragKwp * dachFaktor;
    var quote  = hatSpeicher ? (C.eigenverbrauchMitSpeicher || 0.65)
                             : (C.eigenverbrauchOhneSpeicher || 0.30);
    var eigen  = Math.min(ertrag * quote, verbrauch * 0.95);
    var einsp  = Math.max(0, ertrag - eigen);

    // 4. Speichergroesse (Faustformel: 1 kWh je 1.000 kWh Jahresverbrauch)
    var speicher = hatSpeicher
      ? Math.max(5, Math.min(20, Math.round(verbrauch / 1000)))
      : 0;

    // 5. Wirtschaftlichkeit
    var ersparnis = eigen * strompreis + einsp * (C.einspeiseverguetung || 0.0786);
    var invest    = kwp * (C.kostenProKwp || 1500)
                  + speicher * (C.kostenProKwhSpeicher || 700)
                  + (hatWallbox ? (C.kostenWallbox || 1400) : 0);
    var amort     = ersparnis > 0 ? invest / ersparnis : 0;

    // Strompreissteigerung ueber den Betrachtungszeitraum beruecksichtigen
    var jahre = C.betrachtungszeitraum || 25;
    var g     = C.strompreisSteigung || 0.02;
    var faktor = (Math.pow(1 + g, jahre) - 1) / (g * jahre);
    var ersparnis25 = ersparnis * jahre * faktor;

    return {
      kwp:        kwp,
      ertrag:     Math.round(ertrag),
      verbrauch:  Math.round(verbrauch),
      speicher:   speicher,
      ersparnis:  Math.round(ersparnis),
      ersparnis25: Math.round(ersparnis25 / 100) * 100,
      autarkie:   Math.min(95, Math.round(eigen / verbrauch * 100)),
      amort:      Math.round(amort * 10) / 10,
      co2:        Math.round(ertrag * (C.co2ProKwh || 0.38)),
      invest:     Math.round(invest)
    };
  }

  /* ---------- Ergebnis anzeigen ---------- */
  function animateTo(el, target, decimals) {
    if (!el) return;
    var fmt = function (n) {
      return n.toLocaleString('de-DE', {
        minimumFractionDigits: decimals || 0,
        maximumFractionDigits: decimals || 0
      });
    };
    if (reducedMotion) { el.textContent = fmt(target); return; }

    var dur = 900, start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderResult() {
    var r = compute();

    animateTo(document.getElementById('r-save'),  r.ersparnis);
    animateTo(document.getElementById('r-kwp'),   r.kwp, r.kwp % 1 ? 1 : 0);
    animateTo(document.getElementById('r-yield'), r.ertrag);
    animateTo(document.getElementById('r-auto'),  r.autarkie);
    animateTo(document.getElementById('r-amort'), r.amort, 1);
    animateTo(document.getElementById('r-co2'),   r.co2);

    // Speicher-Zelle: bei "kein Speicher" nicht animieren, sondern Strich zeigen
    var battCell  = document.getElementById('r-batt');
    var battBox   = battCell && battCell.closest('.result-cell');
    var battLabel = battBox && $('.k', battBox);
    var battUnit  = battBox && $('.u', battBox);
    if (r.speicher > 0) {
      if (battLabel) battLabel.textContent = 'Empfohlener Speicher';
      if (battUnit)  battUnit.style.display = '';
      animateTo(battCell, r.speicher);
    } else {
      if (battLabel) battLabel.textContent = 'Speicher';
      if (battUnit)  battUnit.style.display = 'none';
      if (battCell)  battCell.textContent = 'nicht gewählt';
    }

    var save25 = document.getElementById('r-save25');
    if (save25) save25.textContent = r.ersparnis25.toLocaleString('de-DE') + ' €';

    // Ergebnisse an das Formular haengen, damit sie mitgesendet werden
    var extraLabels = { speicher: 'Stromspeicher', wallbox: 'Wallbox / E-Auto', waermepumpe: 'Wärmepumpe' };
    form.extraData = {
      haus:           state.haus.label || '–',
      dach:           state.dach.label || '–',
      stromkosten:    state.kosten + ' €',
      extras:         state.extras.length
                        ? state.extras.map(function (k) { return extraLabels[k] || k; }).join(', ')
                        : 'keine',
      anlage_kwp:     r.kwp,
      speicher_kwh:   r.speicher || 'kein Speicher',
      ertrag_kwh:     r.ertrag,
      ersparnis_jahr: r.ersparnis,
      autarkie:       r.autarkie,
      amortisation:   r.amort
    };
  }

  /* Nach erfolgreichem Versand den Kopfbereich aufraeumen */
  form.addEventListener('solvera:success', function () {
    if (progress) progress.style.display = 'none';
    var head = $('.calc-head p');
    if (head) head.textContent = 'Anfrage übermittelt – vielen Dank!';
  });

  paintProgress();
})();
