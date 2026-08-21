/* =========================================================================
   Solvera Sales – Formular-Verarbeitung
   Validierung, Versand, Spam-Schutz, Rueckmeldung.
   Konfiguration siehe assets/js/config.js
   ========================================================================= */
(function () {
  'use strict';

  var CFG   = window.SOLVERA || {};
  var $     = function (s, c) { return (c || document).querySelector(s); };
  var $$    = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var MAIL  = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  var MAXMB = 5;

  /* Lesbare Beschriftungen fuer die Fallback-E-Mail */
  var LABELS = {
    vorname: 'Vorname', nachname: 'Nachname', name: 'Name', email: 'E-Mail',
    telefon: 'Telefon', plz: 'PLZ', standort: 'Standort', start: 'Gewünschter Start',
    erfahrung: 'Vertriebserfahrung', nachricht: 'Nachricht', firma: 'Unternehmen',
    ansprechpartner: 'Ansprechpartner', position: 'Position', region: 'Region',
    menge: 'Lead-Bedarf pro Monat', website: 'Website',
    haus: 'Gebäudetyp', dach: 'Dachausrichtung', stromkosten: 'Stromkosten/Monat',
    extras: 'Zusätzlich geplant', anlage_kwp: 'Empfohlene Anlagengröße (kWp)',
    speicher_kwh: 'Empfohlener Speicher (kWh)', ersparnis_jahr: 'Ersparnis pro Jahr (€)',
    ertrag_kwh: 'Stromertrag pro Jahr (kWh)', autarkie: 'Autarkiegrad (%)',
    amortisation: 'Amortisation (Jahre)'
  };

  var SUBJECTS = {
    lead:      'Neue Anfrage über den Photovoltaik-Rechner',
    bewerbung: 'Neue Bewerbung als Vertriebspartner',
    firmen:    'Neue Anfrage eines Photovoltaik-Fachbetriebs'
  };

  /* Seite, auf die nach erfolgreichem Versand geleitet wird.
     Wird in assets/js/config.js unter "danke" gepflegt. */
  var DANKE = {
    lead:      'danke-beratung.html',
    bewerbung: 'danke.html',
    firmen:    'danke-firmen.html'
  };

  function dankeseite(type) {
    return (CFG.danke && CFG.danke[type]) || DANKE[type] || 'danke.html';
  }

  function versandFehler() {
    var to = (CFG.kontakt && CFG.kontakt.email) || 'info@solvera-sales.de';
    return 'Der Versand hat leider nicht geklappt. Bitte versuchen Sie es erneut oder ' +
           'schreiben Sie uns direkt an ' + to + '.';
  }

  /* Auf einer lokal geoeffneten Datei oder in der Vorschau gibt es keinen
     Server, der das Formular annehmen koennte. Dann greift der E-Mail-Weg. */
  function ohneServer() {
    return location.protocol !== 'http:' && location.protocol !== 'https:';
  }

  /* Seitenwechsel. In der eingebetteten Vorschau uebernimmt die Huelle. */
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

  /* ---------- Hilfsfunktionen ---------- */

  function fieldOf(el) {
    return el.closest('.field') || el.closest('.consent');
  }

  function markError(el, on) {
    var f = fieldOf(el);
    if (f) f.classList.toggle('has-error', !!on);
  }

  function showMessage(form, text, kind) {
    var box = $('[data-form-msg]', form);
    if (!box) { if (kind === 'err') alert(text); return; }
    box.textContent = text;
    box.className = 'form-msg is-visible ' + (kind || 'err');
  }

  function clearMessage(form) {
    var box = $('[data-form-msg]', form);
    if (box) box.className = 'form-msg';
  }

  /* Validierung aller sichtbaren Pflichtfelder */
  function validate(form) {
    var ok = true, firstBad = null;

    $$('[required]', form).forEach(function (el) {
      // Felder in ausgeblendeten Schritten werden nicht geprueft
      if (el.offsetParent === null && el.type !== 'checkbox') return;

      var bad = false;
      var val = (el.value || '').trim();

      if (el.type === 'checkbox') {
        bad = !el.checked;
      } else if (!val) {
        bad = true;
      } else if (el.type === 'email' && !MAIL.test(val)) {
        bad = true;
      } else if (el.name === 'plz' && !/^[0-9]{5}$/.test(val)) {
        bad = true;
      } else if (el.type === 'tel' && val.replace(/[^0-9]/g, '').length < 6) {
        bad = true;
      }

      markError(el, bad);
      if (bad) { ok = false; if (!firstBad) firstBad = el; }
    });

    if (firstBad) {
      var f = fieldOf(firstBad);
      (f || firstBad).scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (firstBad.focus) { try { firstBad.focus({ preventScroll: true }); } catch (e) { firstBad.focus(); } }
    }
    return ok;
  }

  /* Fehlermarkierung entfernen, sobald der Nutzer korrigiert */
  document.addEventListener('input', function (e) {
    if (e.target.matches && e.target.matches('.input, .select, .textarea')) markError(e.target, false);
  });
  document.addEventListener('change', function (e) {
    if (e.target.matches && e.target.matches('input[type="checkbox"], .select')) markError(e.target, false);
  });

  /* Formularinhalt als einfaches Objekt */
  function collect(form) {
    var data = {};
    $$('input, select, textarea', form).forEach(function (el) {
      if (!el.name || el.type === 'file' || el.name === 'website') return;
      if (el.type === 'checkbox') {
        data[el.name] = el.checked ? 'Ja' : 'Nein';
      } else if (el.value) {
        data[el.name] = el.value.trim();
      }
    });
    // Zusatzdaten (z. B. Ergebnisse des PV-Rechners)
    if (form.extraData) {
      Object.keys(form.extraData).forEach(function (k) { data[k] = form.extraData[k]; });
    }
    return data;
  }

  function asText(data) {
    return Object.keys(data).map(function (k) {
      return (LABELS[k] || k) + ': ' + data[k];
    }).join('\n');
  }

  /* Fallback: E-Mail-Programm des Besuchers oeffnen */
  function mailtoFallback(form, type, data) {
    var to      = (CFG.kontakt && CFG.kontakt.email) || 'info@solvera-sales.de';
    var subject = SUBJECTS[type] || 'Anfrage über die Website';
    var body    = asText(data) + '\n\n– gesendet über solvera-sales.de';
    window.location.href = 'mailto:' + to +
      '?subject=' + encodeURIComponent(subject) +
      '&body='    + encodeURIComponent(body);
    showMessage(form,
      'Ihr E-Mail-Programm wurde mit allen Angaben geöffnet. Bitte schicken Sie die Nachricht ab. ' +
      'Alternativ erreichen Sie uns unter ' + to + '.', 'ok');
  }

  /* ---------- Versand ---------- */

  function submitForm(form) {
    var type     = form.getAttribute('data-form') || 'lead';
    var endpoint = (CFG.endpoints && CFG.endpoints[type]) || '';
    var data     = collect(form);
    var fileEl   = $('input[type="file"]', form);
    var file     = fileEl && fileEl.files && fileEl.files[0];

    data.art       = type;
    data.formular  = SUBJECTS[type] || type;
    data.seite     = window.location.pathname;
    data._subject  = SUBJECTS[type] || 'Anfrage über die Website';

    if (file && file.size > MAXMB * 1024 * 1024) {
      showMessage(form, 'Die Datei ist größer als ' + MAXMB + ' MB. Bitte wählen Sie eine kleinere Datei.', 'err');
      return;
    }

    if (!endpoint || ohneServer()) { mailtoFallback(form, type, data); return; }

    var btn = form.querySelector('button[type="submit"]');
    var old = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Wird gesendet …';
    }
    clearMessage(form);

    var body, headers;
    if (file) {
      body = new FormData();
      Object.keys(data).forEach(function (k) { body.append(k, data[k]); });
      body.append('lebenslauf', file, file.name);
      headers = { 'Accept': 'application/json' };
    } else {
      body = JSON.stringify(data);
      headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    }

    fetch(endpoint, { method: 'POST', headers: headers, body: body })
      .then(function (res) {
        /* Ist am Ziel kein Empfangsskript hinterlegt (z. B. weil die Seite
           noch auf einem rein statischen Hoster liegt), soll der Besucher
           nicht im Regen stehen: dann oeffnet sich sein E-Mail-Programm. */
        if (res.status === 404 || res.status === 405 || res.status === 501) {
          mailtoFallback(form, type, data);
          return null;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json().catch(function () { return {}; });
      })
      .then(function (antwort) {
        if (antwort === null) return;                     // bereits per E-Mail abgehandelt
        if (antwort && antwort.ok === false) {
          showMessage(form, antwort.text || versandFehler(), 'err');
          if (btn) { btn.disabled = false; btn.innerHTML = old; }
          return;
        }
        form.dispatchEvent(new CustomEvent('solvera:success', { bubbles: true }));
        gehZu((antwort && antwort.weiter) || dankeseite(type));
      })
      .catch(function (fehler) {
        /* Netzwerkfehler: der Server ist gar nicht erreichbar. */
        if (fehler instanceof TypeError) { mailtoFallback(form, type, data); }
        else { showMessage(form, versandFehler(), 'err'); }
        if (btn) { btn.disabled = false; btn.innerHTML = old; }
      });
  }

  /* ---------- Verdrahtung ---------- */

  $$('form[data-form]').forEach(function (form) {
    form.setAttribute('novalidate', 'novalidate');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Spam-Schutz: unsichtbares Feld darf nicht ausgefuellt sein
      var trap = form.querySelector('input[name="website"]');
      if (trap && trap.value) {
        gehZu(dankeseite(form.getAttribute('data-form') || 'lead'));
        return;
      }

      if (!validate(form)) {
        showMessage(form, 'Bitte prüfen Sie die rot markierten Felder.', 'err');
        return;
      }
      submitForm(form);
    });

    // Dateiname im Upload-Feld anzeigen
    var fileEl = $('input[type="file"]', form);
    var label  = $('[data-file-label]', form);
    if (fileEl && label) {
      fileEl.addEventListener('change', function () {
        var f = fileEl.files && fileEl.files[0];
        label.textContent = f ? f.name : 'Datei auswählen';
      });
    }
  });

})();
