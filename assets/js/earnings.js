/* =========================================================================
   Solvera Sales – Provisions-Rechner (Karriereseite)
   Einfache, ehrliche Rechnung: Leads x Einsatztage x Provision, dazu der
   Abschlussbonus mit der aktuellen Abschlussquote.
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
  var QUOTE    = typeof P.abschlussquote === 'number' ? P.abschlussquote : 0.15;
  var SCHNITT  = PRO_LEAD + BONUS * QUOTE;   // durchschnittlich je Lead

  var out = {
    leads:  document.getElementById('e-leads'),
    days:   document.getElementById('e-days'),
    month:  document.getElementById('e-month'),
    day:    document.getElementById('e-day'),
    year:   document.getElementById('e-year'),
    count:  document.getElementById('e-leadcount'),
    base:   document.getElementById('e-base'),
    bonus:  document.getElementById('e-bonus')
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
    if (out.month) out.month.textContent = eur(count * SCHNITT);
    if (out.day)   out.day.textContent   = eur(leads * SCHNITT);
    if (out.year)  out.year.textContent  = eur(count * SCHNITT * 12);
  }

  leadsEl.addEventListener('input', update);
  daysEl.addEventListener('input', update);
  update();
})();
