/* =========================================================================
   Solvera Sales – Formular-Verarbeitung

   Die Website läuft auf einem rein statischen Hoster (GitHub Pages). Dort
   gibt es kein Skript, das ein Formular entgegennehmen könnte. Deshalb
   arbeitet dieses Modul zweistufig:

   1. Ist in assets/js/config.js unter "endpoints" eine Adresse hinterlegt
      (Formulardienst, eigene Schnittstelle, Automatisierung), gehen die
      Angaben per POST dorthin. Danach wird auf die Dankeseite geleitet.

   2. Ist dort nichts hinterlegt – oder ist die Adresse nicht erreichbar –
      übernimmt der Besucher den Versand selbst: Er bekommt seine Angaben
      sauber aufbereitet und kann sie mit einem Klick per E-Mail oder
      WhatsApp schicken oder in die Zwischenablage kopieren.

   Stufe 2 kommt ohne jede fremde Einbindung aus und ist damit
   datenschutzrechtlich unproblematisch. Stufe 1 ist bequemer, setzt aber
   einen Dienstleister und einen Vertrag zur Auftragsverarbeitung voraus.
   ========================================================================= */
(function () {
  'use strict';

  var CFG = window.SOLVERA || {};
  var $   = function (s, c) { return (c || document).querySelector(s); };
  var $$  = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var MAIL = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

  /* Lesbare Beschriftungen für die zusammengestellte Nachricht */
  var LABELS = {
    vorname: 'Vorname', nachname: 'Nachname', name: 'Name', email: 'E-Mail',
    telefon: 'Telefon', plz: 'PLZ', standort: 'Standort', start: 'Gewünschter Start',
    erfahrung: 'Vertriebserfahrung', nachricht: 'Nachricht', firma: 'Unternehmen',
    ansprechpartner: 'Ansprechpartner', position: 'Position', region: 'Region',
    menge: 'Lead-Bedarf pro Monat',
    haus: 'Gebäudetyp', dach: 'Dachausrichtung', stromkosten: 'Stromkosten pro Monat',
    extras: 'Zusätzlich geplant', anlage_kwp: 'Empfohlene Anlagengröße (kWp)',
    speicher_kwh: 'Empfohlener Speicher (kWh)', ersparnis_jahr: 'Ersparnis pro Jahr (€)',
    ertrag_kwh: 'Stromertrag pro Jahr (kWh)', autarkie: 'Autarkiegrad (%)',
    amortisation: 'Amortisation (Jahre)', einwilligung: 'Datenschutzerklärung akzeptiert'
  };

  /* Felder, die nur der Technik dienen */
  var INTERN = ['website', 'art', 'formular', 'seite', '_subject'];

  var BETREFF = {
    lead:      'Anfrage über den Photovoltaik-Rechner',
    bewerbung: 'Bewerbung als Vertriebspartner',
    firmen:    'Anfrage als Photovoltaik-Fachbetrieb'
  };

  var DANKE = {
    lead:      'danke-beratung.html',
    bewerbung: 'danke.html',
    firmen:    'danke-firmen.html'
  };

  var EINLEITUNG = {
    lead:      'Guten Tag, ich interessiere mich für ein unverbindliches Beratungsgespräch zur Photovoltaik.',
    bewerbung: 'Guten Tag, ich bewerbe mich als Vertriebspartner.',
    firmen:    'Guten Tag, wir interessieren uns für Photovoltaik-Leads.'
  };

  function empfaenger() { return (CFG.kontakt && CFG.kontakt.email) || 'info@solvera-sales.de'; }
  function whatsapp()   { return (CFG.kontakt && CFG.kontakt.whatsapp) || ''; }
  function dankeseite(art) { return (CFG.danke && CFG.danke[art]) || DANKE[art] || 'danke.html'; }

  /* ---------- Rückmeldungen ---------- */

  function feldVon(el) { return el.closest('.field') || el.closest('.consent'); }

  function markiere(el, an) {
    var f = feldVon(el);
    if (f) f.classList.toggle('has-error', !!an);
  }

  function meldung(form, text, art) {
    var box = $('[data-form-msg]', form);
    if (!box) { if (art === 'err') alert(text); return; }
    box.textContent = text;
    box.className = 'form-msg is-visible ' + (art || 'err');
  }

  function meldungWeg(form) {
    var box = $('[data-form-msg]', form);
    if (box) box.className = 'form-msg';
  }

  /* ---------- Prüfung ---------- */

  function pruefe(form) {
    var ok = true, ersterFehler = null;

    $$('[required]', form).forEach(function (el) {
      // Felder in ausgeblendeten Schritten werden nicht geprüft
      if (el.offsetParent === null && el.type !== 'checkbox') return;

      var schlecht = false;
      var wert = (el.value || '').trim();

      if (el.type === 'checkbox')            schlecht = !el.checked;
      else if (!wert)                        schlecht = true;
      else if (el.type === 'email' && !MAIL.test(wert)) schlecht = true;
      else if (el.name === 'plz' && !/^[0-9]{5}$/.test(wert)) schlecht = true;
      else if (el.type === 'tel' && wert.replace(/[^0-9]/g, '').length < 6) schlecht = true;

      markiere(el, schlecht);
      if (schlecht) { ok = false; if (!ersterFehler) ersterFehler = el; }
    });

    if (ersterFehler) {
      (feldVon(ersterFehler) || ersterFehler).scrollIntoView({ behavior: 'smooth', block: 'center' });
      try { ersterFehler.focus({ preventScroll: true }); } catch (e) { ersterFehler.focus(); }
    }
    return ok;
  }

  document.addEventListener('input', function (e) {
    if (e.target.matches && e.target.matches('.input, .select, .textarea')) markiere(e.target, false);
  });
  document.addEventListener('change', function (e) {
    if (e.target.matches && e.target.matches('input[type="checkbox"], .select')) markiere(e.target, false);
  });

  /* ---------- Angaben einsammeln ---------- */

  function sammle(form) {
    var daten = {};
    $$('input, select, textarea', form).forEach(function (el) {
      if (!el.name || el.name === 'website') return;
      if (el.type === 'checkbox') daten[el.name] = el.checked ? 'Ja' : 'Nein';
      else if (el.value)          daten[el.name] = el.value.trim();
    });
    // Ergebnisse des Photovoltaik-Rechners
    if (form.extraData) {
      Object.keys(form.extraData).forEach(function (k) { daten[k] = form.extraData[k]; });
    }
    return daten;
  }

  function alsText(daten) {
    return Object.keys(daten)
      .filter(function (k) { return INTERN.indexOf(k) === -1; })
      .map(function (k) { return (LABELS[k] || k) + ': ' + daten[k]; })
      .join('\n');
  }

  function nachricht(art, daten) {
    return (EINLEITUNG[art] || 'Guten Tag,') + '\n\n' + alsText(daten);
  }

  /* ---------- Stufe 2: der Besucher schickt selbst ---------- */

  var ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6 9-6"/></svg>';
  var ICON_WA   = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23z"/><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z"/></svg>';
  var ICON_KOP  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.4"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  var ICON_HAKEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  function selbstVersand(form, art, daten) {
    var text  = nachricht(art, daten);
    var titel = (BETREFF[art] || 'Anfrage über die Website');
    var name  = daten.vorname ? (daten.vorname + ' ' + (daten.nachname || '')).trim()
                              : (daten.name || daten.firma || '');
    if (name) titel += ' – ' + name;

    var mailto = 'mailto:' + empfaenger() +
                 '?subject=' + encodeURIComponent(titel) +
                 '&body='    + encodeURIComponent(text);
    var wa = whatsapp() ? 'https://wa.me/' + whatsapp() + '?text=' + encodeURIComponent(text) : '';

    var kasten = document.createElement('div');
    kasten.className = 'versand';
    kasten.setAttribute('role', 'group');
    kasten.setAttribute('aria-label', 'Angaben absenden');
    kasten.innerHTML =
      '<div class="versand-kopf">' +
        '<span class="versand-haken">' + ICON_HAKEN + '</span>' +
        '<div>' +
          '<h3>Fast geschafft</h3>' +
          '<p class="muted">Ihre Angaben sind zusammengestellt. Ein Klick, und sie sind bei uns.</p>' +
        '</div>' +
      '</div>' +
      '<div class="versand-wege">' +
        '<a class="btn btn-primary btn-lg" href="' + mailto + '">' + ICON_MAIL + ' Per E-Mail senden</a>' +
        (wa ? '<a class="wa-btn" href="' + wa + '" target="_blank" rel="noopener">' + ICON_WA + ' Per WhatsApp senden</a>' : '') +
      '</div>' +
      '<details class="versand-details">' +
        '<summary>Es öffnet sich nichts? Angaben kopieren</summary>' +
        '<p class="tiny muted mt-16">Senden Sie den folgenden Text an <strong>' + empfaenger() + '</strong>:</p>' +
        '<pre class="versand-text" tabindex="0"></pre>' +
        '<button type="button" class="btn btn-outline btn-full mt-16" data-kopieren>' + ICON_KOP + ' In die Zwischenablage kopieren</button>' +
        '<span class="tiny" data-kopie-hinweis aria-live="polite"></span>' +
      '</details>';

    kasten.querySelector('.versand-text').textContent = text;

    var knopf = kasten.querySelector('[data-kopieren]');
    var hinweis = kasten.querySelector('[data-kopie-hinweis]');
    knopf.addEventListener('click', function () {
      var fertig = function (ok) {
        hinweis.textContent = ok ? 'Kopiert.' : 'Bitte von Hand markieren und kopieren.';
        hinweis.className = 'tiny ' + (ok ? 'accent' : 'muted');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { fertig(true); }, function () { fertig(false); });
      } else {
        try {
          var hilfe = document.createElement('textarea');
          hilfe.value = text;
          hilfe.style.position = 'fixed';
          hilfe.style.opacity = '0';
          document.body.appendChild(hilfe);
          hilfe.select();
          fertig(document.execCommand('copy'));
          document.body.removeChild(hilfe);
        } catch (e) { fertig(false); }
      }
    });

    form.style.display = 'none';
    form.parentNode.insertBefore(kasten, form.nextSibling);
    // Versatz für Kopfzeile und Sprungmarkenleiste berücksichtigen
    if (window.solveraSpringeZu) window.solveraSpringeZu(kasten);
    else kasten.scrollIntoView({ behavior: 'smooth', block: 'center' });
    form.dispatchEvent(new CustomEvent('solvera:bereit', { bubbles: true }));
  }

  /* ---------- Seitenwechsel ---------- */

  function gehZu(ziel) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ solveraSeite: ziel.split('#')[0],
                                    anker: (ziel.split('#')[1] || '') }, '*');
        return;
      }
    } catch (e) { /* fremde Herkunft: normal weiterleiten */ }
    window.location.href = ziel;
  }

  /* ---------- Stufe 1: Versand an eine hinterlegte Adresse ---------- */

  function absenden(form) {
    var art   = form.getAttribute('data-form') || 'lead';
    var ziel  = (CFG.endpoints && CFG.endpoints[art]) || '';
    var daten = sammle(form);

    daten.art      = art;
    daten.formular = BETREFF[art] || art;
    daten.seite    = window.location.pathname;
    daten._subject = BETREFF[art] || 'Anfrage über die Website';

    // Kein Ziel hinterlegt oder die Seite läuft gar nicht über einen Server:
    // dann übernimmt der Besucher den Versand.
    var ueberServer = location.protocol === 'http:' || location.protocol === 'https:';
    if (!ziel || !ueberServer) { selbstVersand(form, art, daten); return; }

    var knopf = form.querySelector('button[type="submit"]');
    var alt   = knopf ? knopf.innerHTML : '';
    if (knopf) {
      knopf.disabled = true;
      knopf.innerHTML = '<span class="spinner"></span> Wird gesendet …';
    }
    meldungWeg(form);

    var zurueck = function () { if (knopf) { knopf.disabled = false; knopf.innerHTML = alt; } };

    fetch(ziel, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(daten)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        gehZu(dankeseite(art));
      })
      .catch(function () {
        // Der Dienst ist nicht erreichbar – der Besucher soll trotzdem
        // zum Ziel kommen, statt vor einer Fehlermeldung zu stehen.
        zurueck();
        selbstVersand(form, art, daten);
      });
  }

  /* ---------- Verdrahtung ---------- */

  $$('form[data-form]').forEach(function (form) {
    form.setAttribute('novalidate', 'novalidate');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Spam-Falle: das unsichtbare Feld darf nicht ausgefüllt sein
      var falle = form.querySelector('input[name="website"]');
      if (falle && falle.value) { gehZu(dankeseite(form.getAttribute('data-form') || 'lead')); return; }

      if (!pruefe(form)) {
        meldung(form, 'Bitte prüfen Sie die rot markierten Felder.', 'err');
        return;
      }
      absenden(form);
    });
  });

})();
