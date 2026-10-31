/* =========================================================================
   Solvera Sales – Provisions-Rechner (Karriereseite)
   Einfache, ehrliche Rechnung: Leads x Einsatztage x Provision, dazu der
   Abschluss- und Waermepumpen-Bonus mit den aktuellen Quoten.
   Werte siehe assets/js/config.js (SOLVERA.provision).
   ========================================================================= */
(function () {
  'use strict';

  var leadsEl = document.getElementById('earn-leads');
  var daysEl  = document.getElementById('earn-days');
  if (!leadsEl || !daysEl) return;

  var P = (window.SOLVERA && window.SOLVERA.provision) || {};
  var PRO_LEAD = P.proLead || 70;
  var BONUS    = P.proAbschluss || 200;
  var QUOTE    = typeof P.abschlussquote === 'number' ? P.abschlussquote : 0.10;
  var WP       = P.proWaermepumpe || 200;
  var WP_QUOTE = typeof P.waermepumpenquote === 'number' ? P.waermepumpenquote : 0.05;
  var SCHNITT  = PRO_LEAD + BONUS * QUOTE + WP * WP_QUOTE;   // durchschnittlich je Lead

  var out = {
    leads:  document.getElementById('e-leads'),
    days:   document.getElementById('e-days'),
    month:  document.getElementById('e-month'),
    day:    document.getElementById('e-day'),
    year:   document.getElementById('e-year'),
    count:  document.getElementById('e-leadcount'),
    base:   document.getElementById('e-base'),
    bonus:  document.getElementById('e-bonus'),
    wp:     document.getElementById('e-wp')
  };

  function fill(el) {
    var min = Number(el.min), max = Number(el.max), val = Number(el.value);
    el.style.setProperty('--fill', ((val - min) / (max - min) * 100) + '%');
  }

  function eur(n) { return Math.round(n).toLocaleString('de-DE'); }

  function update() {
    var leads = Number(leadsEl.value);
    var days  = Number(daysEl.value);
    var count = leads * days;

    fill(leadsEl);
    fill(daysEl);

    if (out.leads) out.leads.textContent = leads;
    if (out.days)  out.days.textContent  = days;
    if (out.count) out.count.textContent = count;
    if (out.base)  out.base.textContent  = eur(count * PRO_LEAD);
    if (out.bonus) out.bonus.textContent = eur(count * BONUS * QUOTE);
    if (out.wp)    out.wp.textContent    = eur(count * WP * WP_QUOTE);
    if (out.month) out.month.textContent = eur(count * SCHNITT);
    if (out.day)   out.day.textContent   = eur(leads * SCHNITT);
    if (out.year)  out.year.textContent  = eur(count * SCHNITT * 12);
  }

  var gemessen = false;
  function genutzt() {
    if (gemessen || !window.solveraMessen) return;
    gemessen = true;
    window.solveraMessen('rechner_genutzt');
  }

  leadsEl.addEventListener('input', update);
  daysEl.addEventListener('input', update);
  leadsEl.addEventListener('change', genutzt);
  daysEl.addEventListener('change', genutzt);
  update();
})();
