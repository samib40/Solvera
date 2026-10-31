/* =========================================================================
   Solvera Akademie – Datenschicht
   -------------------------------------------------------------------------
   Zwei gleichwertige Umsetzungen derselben Schnittstelle:

   LIVE   Supabase (Konten, Datenbank). Wird genutzt, sobald in config.js
          unter akademie.supabaseUrl und supabaseKey etwas steht.
          Kommt ohne fremde Bibliothek aus – nur fetch() gegen die
          REST-Schnittstellen von Supabase (Auth + PostgREST).

   DEMO   Alles im Local Storage dieses Browsers, mit Beispieldaten.
          Zum Ausprobieren, bevor Supabase eingerichtet ist.

   Die Oberflaeche (akademie.js) spricht nur mit window.AkademieDaten und
   merkt nicht, welche Umsetzung dahinter steckt.
   ========================================================================= */
(function () {
  'use strict';

  var CFG = (window.SOLVERA && window.SOLVERA.akademie) || {};
  var LIVE = !!(CFG.supabaseUrl && CFG.supabaseKey);

  function Fehler(text) { var e = new Error(text); e.anzeigen = true; return e; }

  /* Uebersetzt typische Meldungen von Supabase ins Deutsche */
  function uebersetzen(msg) {
    var m = String(msg || '');
    var t = [
      [/invalid login credentials/i, 'E-Mail-Adresse oder Passwort stimmt nicht.'],
      [/email not confirmed/i, 'Bitte bestätige zuerst deine E-Mail-Adresse über den Link in der Willkommens-Mail.'],
      [/already registered|already been registered|user already exists/i, 'Mit dieser E-Mail-Adresse gibt es bereits ein Konto. Bitte melde dich an.'],
      [/password should be at least|password.*(short|length)/i, 'Das Passwort ist zu kurz (mindestens 8 Zeichen).'],
      [/weak.?password/i, 'Das Passwort ist zu leicht zu erraten. Bitte wähle ein längeres.'],
      [/rate limit|too many/i, 'Zu viele Versuche in kurzer Zeit. Bitte warte einen Moment.'],
      [/invalid email|unable to validate email/i, 'Die E-Mail-Adresse ist ungültig.'],
      [/failed to fetch|networkerror|load failed/i, 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.'],
      [/jwt expired/i, 'Deine Sitzung ist abgelaufen. Bitte melde dich neu an.'],
      [/payload too large|maximum allowed size|exceeded the maximum|entity too large/i, 'Das Video ist zu groß für den Speicher. Bitte kleiner exportieren (z. B. 720p) oder die Obergrenze in Supabase erhöhen.'],
      [/mime type .* is not supported|invalid mime/i, 'Dieses Dateiformat wird nicht unterstützt. Bitte MP4 verwenden.']
    ];
    for (var i = 0; i < t.length; i++) if (t[i][0].test(m)) return t[i][1];
    return m || 'Unbekannter Fehler.';
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  /* Ablageort eines hochgeladenen Videos: Monat/Zufall-dateiname.mp4 */
  function videoPfad(datei) {
    var teile = String(datei.name || 'video.mp4').toLowerCase().split('.');
    var endung = teile.length > 1 ? teile.pop().replace(/[^a-z0-9]/g, '') : 'mp4';
    var name = teile.join('-').normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'video';
    return new Date().toISOString().slice(0, 7) + '/' + uuid().slice(0, 8) + '-' + name + '.' + (endung || 'mp4');
  }

  /* =======================================================================
     LIVE: Supabase über REST
     ======================================================================= */
  function liveDaten() {
    var BASIS = CFG.supabaseUrl.replace(/\/+$/, '');
    var KEY = CFG.supabaseKey;
    var SCHLUESSEL = 'solvera-akademie-sitzung';
    var sitzung = null;

    function sitzungLesen() {
      try { sitzung = JSON.parse(localStorage.getItem(SCHLUESSEL)); } catch (e) { sitzung = null; }
    }
    function sitzungSetzen(s) {
      sitzung = s;
      try {
        if (s) localStorage.setItem(SCHLUESSEL, JSON.stringify(s));
        else localStorage.removeItem(SCHLUESSEL);
      } catch (e) { /* privater Modus */ }
    }
    function ausAntwort(d) {
      return {
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
        user: d.user
      };
    }

    async function roh(pfad, opt) {
      opt = opt || {};
      var kopf = Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, opt.kopf || {});
      var token = opt.ohneToken ? null : (sitzung && sitzung.access_token);
      kopf.Authorization = 'Bearer ' + (token || KEY);
      var r;
      try {
        r = await fetch(BASIS + pfad, {
          method: opt.methode || 'GET',
          headers: kopf,
          body: opt.daten !== undefined ? JSON.stringify(opt.daten) : undefined
        });
      } catch (e) { throw Fehler(uebersetzen(e.message)); }
      var text = await r.text();
      var d = null;
      try { d = text ? JSON.parse(text) : null; } catch (e) { d = text; }
      if (!r.ok) {
        var msg = d && (d.msg || d.message || d.error_description || d.error);
        var err = Fehler(uebersetzen(msg || ('Fehler ' + r.status)));
        err.status = r.status;
        throw err;
      }
      return d;
    }

    async function auffrischen() {
      if (!sitzung || !sitzung.refresh_token) return false;
      try {
        var d = await roh('/auth/v1/token?grant_type=refresh_token',
          { methode: 'POST', daten: { refresh_token: sitzung.refresh_token }, ohneToken: true });
        sitzungSetzen(ausAntwort(d));
        return true;
      } catch (e) {
        if (e.status === 400 || e.status === 401) sitzungSetzen(null);
        return false;
      }
    }

    /* Anfrage mit Anmeldung; frischt die Sitzung bei Bedarf auf */
    async function frisch() {
      if (sitzung && sitzung.expires_at - 60 < Date.now() / 1000) await auffrischen();
    }
    async function angemeldet(pfad, opt) {
      await frisch();
      try {
        return await roh(pfad, opt);
      } catch (e) {
        if (e.status === 401 && await auffrischen()) return roh(pfad, opt);
        throw e;
      }
    }
    function db(pfad, opt) { return angemeldet('/rest/v1/' + pfad, opt); }

    function hinterlegen() { return { Prefer: 'return=representation' }; }
    var rueckweg = function () { return location.href.split('#')[0]; };

    async function profilLaden() {
      if (!sitzung) return null;
      var r = await db('profile?select=*&id=eq.' + sitzung.user.id);
      return r && r[0] ? r[0] : null;
    }

    /* Rueckkehr aus einer Mail (Bestaetigung oder Passwort vergessen):
       Supabase haengt die Sitzung an die Adresse an. */
    function ausAdresseUebernehmen() {
      var h = location.hash;
      if (h.indexOf('access_token=') === -1 && h.indexOf('error_description=') === -1) return null;
      var p = new URLSearchParams(h.replace(/^#\/?/, ''));
      history.replaceState(null, '', location.pathname + location.search);
      if (p.get('error_description')) return { fehler: uebersetzen(p.get('error_description')) };
      sitzungSetzen({
        access_token: p.get('access_token'),
        refresh_token: p.get('refresh_token'),
        expires_at: Number(p.get('expires_at')) || Math.floor(Date.now() / 1000) + 3600,
        user: null
      });
      return { art: p.get('type') };
    }

    return {
      modus: 'live',

      start: async function () {
        sitzungLesen();
        var rueck = ausAdresseUebernehmen();
        if (sitzung && !sitzung.user) {
          try {
            sitzung.user = await roh('/auth/v1/user');
            sitzungSetzen(sitzung);
          } catch (e) { sitzungSetzen(null); }
        }
        return rueck;
      },

      profil: async function () {
        if (!sitzung) return null;
        try { return await profilLaden(); }
        catch (e) { if (e.status === 401) { sitzungSetzen(null); return null; } throw e; }
      },

      anmelden: async function (email, passwort) {
        var d = await roh('/auth/v1/token?grant_type=password',
          { methode: 'POST', daten: { email: email, password: passwort }, ohneToken: true });
        sitzungSetzen(ausAntwort(d));
      },

      registrieren: async function (a) {
        var d = await roh('/auth/v1/signup?redirect_to=' + encodeURIComponent(rueckweg()), {
          methode: 'POST', ohneToken: true,
          daten: {
            email: a.email, password: a.passwort,
            data: { vorname: a.vorname, nachname: a.nachname, telefon: a.telefon, region: a.region }
          }
        });
        if (d && d.access_token) { sitzungSetzen(ausAntwort(d)); return { bestaetigen: false }; }
        return { bestaetigen: true };
      },

      abmelden: async function () {
        try { await roh('/auth/v1/logout', { methode: 'POST' }); } catch (e) { /* egal */ }
        sitzungSetzen(null);
      },

      passwortVergessen: function (email) {
        return roh('/auth/v1/recover?redirect_to=' + encodeURIComponent(rueckweg()),
          { methode: 'POST', daten: { email: email }, ohneToken: true });
      },

      neuesPasswort: function (pw) {
        return roh('/auth/v1/user', { methode: 'PUT', daten: { password: pw } });
      },

      profilSpeichern: function (id, felder) {
        return db('profile?id=eq.' + id, { methode: 'PATCH', daten: felder, kopf: hinterlegen() });
      },

      lektionen: function () { return db('lektionen?select=*&order=stufe.asc,reihenfolge.asc'); },
      beitraege: function () { return db('beitraege?select=*&order=erstellt_am.desc'); },

      fortschritt: function (nutzerId) {
        return db('fortschritt?select=*' + (nutzerId ? '&nutzer_id=eq.' + nutzerId : ''));
      },

      fortschrittMelden: function (nutzerId, inhaltId, art, prozent, sekunden) {
        return db('fortschritt?on_conflict=nutzer_id,inhalt_id', {
          methode: 'POST',
          kopf: { Prefer: 'resolution=merge-duplicates,return=representation' },
          daten: { nutzer_id: nutzerId, inhalt_id: inhaltId, art: art,
                   prozent: Math.min(100, Math.round(prozent)), sekunden: Math.round(sekunden || 0) }
        });
      },

      zusagen: function () { return db('zusagen?select=*'); },
      zusageSetzen: function (nutzerId, beitragId, an) {
        if (an) return db('zusagen', { methode: 'POST', daten: { nutzer_id: nutzerId, beitrag_id: beitragId },
                                       kopf: { Prefer: 'resolution=ignore-duplicates' } });
        return db('zusagen?nutzer_id=eq.' + nutzerId + '&beitrag_id=eq.' + beitragId, { methode: 'DELETE' });
      },

      /* ---- Admin ---- */
      alleProfile: function () { return db('profile?select=*&order=erstellt_am.desc'); },
      meldungen: function () { return db('meldungen?select=*&order=erstellt_am.desc&limit=200'); },
      meldungenGelesen: function () {
        return db('meldungen?gelesen=eq.false', { methode: 'PATCH', daten: { gelesen: true } });
      },
      profilStatus: function (id, status) {
        return db('profile?id=eq.' + id, { methode: 'PATCH', daten: { status: status }, kopf: hinterlegen() });
      },
      lektionSpeichern: function (l) {
        var id = l.id; var d = Object.assign({}, l); delete d.id; delete d.erstellt_am;
        if (id) return db('lektionen?id=eq.' + id, { methode: 'PATCH', daten: d, kopf: hinterlegen() });
        return db('lektionen', { methode: 'POST', daten: d, kopf: hinterlegen() });
      },
      lektionLoeschen: function (id) { return db('lektionen?id=eq.' + id, { methode: 'DELETE' }); },
      beitragSpeichern: function (b) {
        var id = b.id; var d = Object.assign({}, b); delete d.id; delete d.erstellt_am;
        if (id) return db('beitraege?id=eq.' + id, { methode: 'PATCH', daten: d, kopf: hinterlegen() });
        return db('beitraege', { methode: 'POST', daten: d, kopf: hinterlegen() });
      },
      beitragLoeschen: function (id) { return db('beitraege?id=eq.' + id, { methode: 'DELETE' }); },

      /* ---- Videos im privaten Speicher (Bucket "videos") ---- */
      videoHochladen: async function (datei, beiFortschritt) {
        await frisch();
        var pfad = videoPfad(datei);
        await new Promise(function (fertig, fehler) {
          var x = new XMLHttpRequest();
          x.open('POST', BASIS + '/storage/v1/object/videos/' + pfad);
          x.setRequestHeader('apikey', KEY);
          x.setRequestHeader('Authorization', 'Bearer ' + (sitzung && sitzung.access_token));
          x.setRequestHeader('Content-Type', datei.type || 'video/mp4');
          x.setRequestHeader('x-upsert', 'false');
          x.upload.onprogress = function (e) { if (e.lengthComputable && beiFortschritt) beiFortschritt(e.loaded / e.total); };
          x.onload = function () {
            if (x.status < 300) return fertig();
            var d = {}; try { d = JSON.parse(x.responseText); } catch (e) { /* egal */ }
            fehler(Fehler(uebersetzen(d.message || d.error || (x.status === 413 ? 'Payload too large' : 'Hochladen fehlgeschlagen (' + x.status + ')'))));
          };
          x.onerror = function () { fehler(Fehler('Die Verbindung ist beim Hochladen abgebrochen. Bitte noch einmal versuchen.')); };
          x.send(datei);
        });
        return pfad;
      },
      /* Zeitlich begrenzte Abspiel-Adresse (3 Stunden). Wird ein Link
         weitergegeben, funktioniert er danach nicht mehr. */
      videoAdresse: async function (pfad) {
        var d = await angemeldet('/storage/v1/object/sign/videos/' + pfad, { methode: 'POST', daten: { expiresIn: 10800 } });
        var u = d.signedURL || d.signedUrl;
        return /^https?:/.test(u) ? u : BASIS + '/storage/v1' + u;
      },
      videoLoeschen: function (pfad) {
        return angemeldet('/storage/v1/object/videos/' + pfad, { methode: 'DELETE' });
      }
    };
  }

  /* =======================================================================
     DEMO: alles im Local Storage
     ======================================================================= */
  function demoDaten() {
    var SCHLUESSEL = 'solvera-akademie-demo';
    var speicher = null;

    function jetzt() { return new Date().toISOString(); }
    function vor(tage, stunden) { return new Date(Date.now() - (tage * 24 + (stunden || 0)) * 3600000).toISOString(); }
    function kopie(x) { return JSON.parse(JSON.stringify(x)); }
    function warte() { return new Promise(function (r) { setTimeout(r, 120); }); }

    function naechsterWochentag(tag, stunde) {
      var d = new Date(); d.setHours(stunde, 0, 0, 0);
      var diff = (tag - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString();
    }

    function beispielDaten() {
      var L = [
        ['starter', 1, 'Willkommen bei Solvera Sales', 'Wer wir sind, wie der Ablauf funktioniert und was dich in den ersten Wochen erwartet.', 'Unser Geschäftsmodell: qualifizierte Termine für Photovoltaik-Fachbetriebe\nDeine Vergütung: 70 € je qualifiziertem Lead plus Boni\nWer dein Ansprechpartner ist und wie du ihn erreichst', 8],
        ['starter', 2, 'Photovoltaik-Grundlagen', 'Das technische Basiswissen, das du an jeder Haustür brauchst – verständlich erklärt.', 'Wie eine PV-Anlage Strom erzeugt\nkWp, Ertrag, Eigenverbrauch und Speicher\nWarum sich eine Anlage für Eigenheimbesitzer rechnet', 15],
        ['starter', 3, 'Der qualifizierte Lead', 'Welche Kriterien ein Kontakt erfüllen muss, damit er vergütet wird.', 'Die sieben Qualitätskriterien unseres Fachpartners\nTypische Fehler, die einen Lead ungültig machen\nSaubere Erfassung der Kundendaten', 10],
        ['starter', 4, 'Dein erster Tag an der Tür', 'Auftreten, Kleidung, Gebietsplanung und die ersten Sätze.', 'Vorbereitung und Ausrüstung\nDer Einstieg in den ersten 10 Sekunden\nGebiete sinnvoll ablaufen', 12],
        ['fortgeschritten', 1, 'Gesprächsleitfaden im Detail', 'Der komplette Ablauf vom Klingeln bis zum vereinbarten Termin.', 'Aufbau des Gesprächs in fünf Phasen\nBedarf erkennen mit den richtigen Fragen\nDen Termin verbindlich festmachen', 18],
        ['fortgeschritten', 2, 'Einwandbehandlung', 'Die häufigsten Einwände und wie du souverän darauf reagierst.', '„Kein Interesse“, „Zu teuer“, „Muss ich mit meinem Partner besprechen“\nEinwand oder Vorwand unterscheiden\nRuhig bleiben und nachfragen', 20],
        ['fortgeschritten', 3, 'Förderung und Wirtschaftlichkeit', 'Aktuelle Förderprogramme und eine einfache Beispielrechnung für das Gespräch.', 'Einspeisevergütung und Eigenverbrauch\nFörderprogramme und Steuervorteile\nAmortisation verständlich erklären', 15],
        ['profi', 1, 'Abschlussstarke Gesprächsführung', 'Fortgeschrittene Techniken für mehr Termine pro Tag.', 'Kaufsignale erkennen\nEmpfehlungen aktiv einholen\nDie eigene Quote messen und verbessern', 22],
        ['profi', 2, 'Selbstorganisation und Zahlen', 'Wie Top-Partner ihre Woche planen und ihre Kennzahlen im Blick behalten.', 'Tages- und Wochenziele setzen\nKontakte, Gespräche, Leads: die Trichter-Rechnung\nMotivation über Wochen hochhalten', 14],
        ['profi', 3, 'Vom Partner zur Teamleitung', 'Was es braucht, um selbst neue Partner einzuarbeiten und ein Team zu führen.', 'Neue Partner begleiten und ausbilden\nVorbild an der Tür sein\nDer Weg im Entwicklungsmodell von Solvera Sales', 16]
      ].map(function (x) {
        return { id: uuid(), stufe: x[0], reihenfolge: x[1], titel: x[2], beschreibung: x[3], inhalt: x[4],
                 video_url: 'demo:' + (20 + x[1] * 5), dauer_min: x[5], veroeffentlicht: true, erstellt_am: vor(30) };
      });

      var B = [
        { art: 'termin', titel: 'Teams-Meeting: Wochenstart', angeheftet: true,
          text: 'Gemeinsamer Start in die Woche: Zahlen der Vorwoche, Ziele, offene Fragen. Kamera bitte an.',
          termin_am: naechsterWochentag(1, 18), termin_dauer_min: 45,
          meeting_link: 'https://teams.microsoft.com/l/meetup-join/beispiel', erstellt_am: vor(1) },
        { art: 'woche', titel: 'Wochenschulung: Die ersten 10 Sekunden an der Tür',
          text: 'Warum der Einstieg über Erfolg oder Misserfolg entscheidet – mit drei Formulierungen zum direkten Ausprobieren.',
          video_url: 'demo:25', erstellt_am: vor(2) },
        { art: 'ansage', titel: 'Neue Gebiete in Baden-Württemberg freigegeben',
          text: 'Ab Montag sind die Gebiete rund um Pforzheim und Bruchsal freigegeben. Bitte vorher mit der Vertriebsleitung abstimmen, wer wo unterwegs ist.',
          erstellt_am: vor(3) },
        { art: 'woche', titel: 'Wochenschulung: Einwand „Wir haben kein Geld“',
          text: 'Wie du mit Finanzierung und Förderung souverän auf den häufigsten Einwand reagierst.',
          video_url: 'demo:20', erstellt_am: vor(9) }
      ].map(function (b) {
        return Object.assign({ id: uuid(), video_url: '', termin_am: null, termin_dauer_min: 60,
                               meeting_link: '', angeheftet: false, veroeffentlicht: true }, b);
      });

      var admin = { id: uuid(), email: 'admin@demo.de', passwort: 'demo1234', vorname: 'Sami', nachname: 'Bssiss',
                    telefon: '', region: 'Karlsruhe', rolle: 'admin', status: 'aktiv', erstellt_am: vor(60), letzte_aktivitaet: vor(0, 1) };
      var partner = { id: uuid(), email: 'partner@demo.de', passwort: 'demo1234', vorname: 'Max', nachname: 'Muster',
                      telefon: '0170 0000000', region: 'Karlsruhe', rolle: 'partner', status: 'aktiv', erstellt_am: vor(6), letzte_aktivitaet: vor(1) };
      var beispiele = [
        ['Lena', 'Beispiel', 'Stuttgart', 21, 'aktiv', 10, 0],
        ['Tom', 'Probe', 'Mannheim', 14, 'aktiv', 6, 2],
        ['Jana', 'Muster', 'Heidelberg', 4, 'aktiv', 2, 1],
        ['Kai', 'Test', 'Freiburg', 0, 'wartend', 0, 0]
      ].map(function (x) {
        return { id: uuid(), email: x[0].toLowerCase() + '@beispiel.de', passwort: 'demo1234', vorname: x[0], nachname: x[1],
                 telefon: '', region: x[2], rolle: 'partner', status: x[4], erstellt_am: vor(x[3] + 1),
                 letzte_aktivitaet: x[5] ? vor(x[6], 3) : null, _anzahl: x[5] };
      });

      var F = [], M = [];
      function abschliessen(p, l, tageZurueck) {
        F.push({ nutzer_id: p.id, inhalt_id: l.id, art: 'lektion', prozent: 100, sekunden: l.dauer_min * 60,
                 begonnen_am: vor(tageZurueck, 2), abgeschlossen_am: vor(tageZurueck, 3), aktualisiert_am: vor(tageZurueck, 3) });
        M.push({ id: M.length + 1, art: 'abgeschlossen', nutzer_id: p.id, inhalt_id: l.id, gelesen: tageZurueck > 1,
                 text: p.vorname + ' ' + p.nachname + ' hat „' + l.titel + '“ abgeschlossen.', erstellt_am: vor(tageZurueck, 3) });
      }
      beispiele.forEach(function (p) {
        for (var i = 0; i < p._anzahl; i++) abschliessen(p, L[i], Math.max(0, p._anzahl - i - 1 + (p.vorname === 'Tom' ? 2 : 0)));
        if (p._anzahl && p._anzahl < L.length) {
          F.push({ nutzer_id: p.id, inhalt_id: L[p._anzahl].id, art: 'lektion', prozent: 40, sekunden: 200,
                   begonnen_am: vor(0, 5), abgeschlossen_am: null, aktualisiert_am: vor(0, 5) });
        }
        delete p._anzahl;
      });
      abschliessen(partner, L[0], 3);
      abschliessen(partner, L[1], 1);
      F.push({ nutzer_id: partner.id, inhalt_id: L[2].id, art: 'lektion', prozent: 35, sekunden: 210,
               begonnen_am: vor(1), abgeschlossen_am: null, aktualisiert_am: vor(1) });
      var kai = beispiele[3];
      M.push({ id: M.length + 1, art: 'registrierung', nutzer_id: kai.id, inhalt_id: null, gelesen: false,
               text: kai.vorname + ' ' + kai.nachname + ' hat sich registriert und wartet auf Freischaltung.', erstellt_am: vor(0, 2) });
      M.push({ id: M.length + 1, art: 'stufe', nutzer_id: beispiele[0].id, inhalt_id: null, gelesen: false,
               text: 'Lena Beispiel hat die Stufe Profi vollständig abgeschlossen.', erstellt_am: vor(0) });

      return { konten: [admin, partner].concat(beispiele), lektionen: L, beitraege: B,
               fortschritt: F, meldungen: M, zusagen: [{ nutzer_id: beispiele[0].id, beitrag_id: B[0].id, erstellt_am: vor(0) }],
               sitzung: null };
    }

    function videoDb(art, arbeit) {
      return new Promise(function (fertig, fehler) {
        var auf = indexedDB.open('solvera-akademie-videos', 1);
        auf.onupgradeneeded = function () { auf.result.createObjectStore('videos'); };
        auf.onerror = function () { fehler(Fehler('Der Browser erlaubt hier keine Ablage von Videos.')); };
        auf.onsuccess = function () {
          var tx = auf.result.transaction('videos', art);
          var anfrage = arbeit(tx.objectStore('videos'));
          tx.oncomplete = function () { fertig(anfrage && anfrage.result); };
          tx.onerror = function () { fehler(Fehler('Das Video konnte nicht gespeichert werden (Speicher voll?).')); };
        };
      });
    }

    function laden() {
      if (speicher) return speicher;
      try { speicher = JSON.parse(localStorage.getItem(SCHLUESSEL)); } catch (e) { speicher = null; }
      if (!speicher || !speicher.konten || speicher.version !== 2) { speicher = beispielDaten(); speicher.version = 2; sichern(); }
      return speicher;
    }
    function sichern() {
      try { localStorage.setItem(SCHLUESSEL, JSON.stringify(speicher)); } catch (e) { /* privater Modus */ }
    }
    function ich() {
      var s = laden();
      return s.konten.filter(function (k) { return k.id === s.sitzung; })[0] || null;
    }
    function ohnePasswort(k) { if (!k) return null; var p = kopie(k); delete p.passwort; return p; }
    function mussAdmin() { var k = ich(); if (!k || k.rolle !== 'admin') throw Fehler('Keine Berechtigung.'); }
    function name(k) { return (k.vorname + ' ' + k.nachname).trim(); }
    function melden(art, nutzerId, inhaltId, text) {
      var s = laden();
      s.meldungen.unshift({ id: Date.now(), art: art, nutzer_id: nutzerId, inhalt_id: inhaltId,
                            text: text, gelesen: false, erstellt_am: jetzt() });
    }

    return {
      modus: 'demo',
      start: async function () { laden(); return null; },
      profil: async function () { return ohnePasswort(ich()); },

      anmelden: async function (email, passwort) {
        await warte();
        var s = laden();
        var k = s.konten.filter(function (x) { return x.email.toLowerCase() === String(email).toLowerCase(); })[0];
        if (!k || k.passwort !== passwort) throw Fehler('E-Mail-Adresse oder Passwort stimmt nicht.');
        s.sitzung = k.id; sichern();
      },

      registrieren: async function (a) {
        await warte();
        var s = laden();
        if (s.konten.some(function (x) { return x.email.toLowerCase() === a.email.toLowerCase(); })) {
          throw Fehler('Mit dieser E-Mail-Adresse gibt es bereits ein Konto. Bitte melde dich an.');
        }
        var k = { id: uuid(), email: a.email, passwort: a.passwort, vorname: a.vorname, nachname: a.nachname,
                  telefon: a.telefon, region: a.region, rolle: 'partner', status: 'wartend',
                  erstellt_am: jetzt(), letzte_aktivitaet: null };
        s.konten.push(k);
        melden('registrierung', k.id, null, name(k) + ' hat sich registriert und wartet auf Freischaltung.');
        s.sitzung = k.id; sichern();
        return { bestaetigen: false };
      },

      abmelden: async function () { var s = laden(); s.sitzung = null; sichern(); },
      passwortVergessen: async function () { await warte(); },
      neuesPasswort: async function (pw) { var k = ich(); if (k) { k.passwort = pw; sichern(); } },

      profilSpeichern: async function (id, felder) {
        var k = laden().konten.filter(function (x) { return x.id === id; })[0];
        ['vorname', 'nachname', 'telefon', 'region'].forEach(function (f) { if (f in felder) k[f] = felder[f]; });
        sichern(); return [ohnePasswort(k)];
      },

      lektionen: async function () {
        var k = ich();
        return kopie(laden().lektionen.filter(function (l) { return l.veroeffentlicht || (k && k.rolle === 'admin'); }))
          .sort(function (a, b) { return a.stufe.localeCompare(b.stufe) || a.reihenfolge - b.reihenfolge; });
      },
      beitraege: async function () {
        var k = ich();
        return kopie(laden().beitraege.filter(function (b) { return b.veroeffentlicht || (k && k.rolle === 'admin'); }))
          .sort(function (a, b) { return b.erstellt_am.localeCompare(a.erstellt_am); });
      },

      fortschritt: async function (nutzerId) {
        var k = ich(); var s = laden();
        return kopie(s.fortschritt.filter(function (f) {
          if (nutzerId) return f.nutzer_id === nutzerId;
          return k.rolle === 'admin' || f.nutzer_id === k.id;
        }));
      },

      fortschrittMelden: async function (nutzerId, inhaltId, art, prozent, sekunden) {
        var s = laden(); var k = ich();
        if (!k || k.id !== nutzerId || k.status !== 'aktiv') throw Fehler('Keine Berechtigung.');
        var f = s.fortschritt.filter(function (x) { return x.nutzer_id === nutzerId && x.inhalt_id === inhaltId; })[0];
        var vorher = f && f.abgeschlossen_am;
        if (!f) {
          f = { nutzer_id: nutzerId, inhalt_id: inhaltId, art: art, prozent: 0, sekunden: 0,
                begonnen_am: jetzt(), abgeschlossen_am: null };
          s.fortschritt.push(f);
        }
        f.prozent = Math.max(f.prozent, Math.min(100, Math.round(prozent)));
        f.sekunden = Math.max(f.sekunden, Math.round(sekunden || 0));
        if (f.prozent >= 100 && !f.abgeschlossen_am) f.abgeschlossen_am = jetzt();
        f.aktualisiert_am = jetzt();
        k.letzte_aktivitaet = jetzt();

        if (f.abgeschlossen_am && !vorher) {
          var quelle = art === 'lektion' ? s.lektionen : s.beitraege;
          var inhalt = quelle.filter(function (x) { return x.id === inhaltId; })[0] || { titel: 'ein Video' };
          melden('abgeschlossen', k.id, inhaltId, name(k) + ' hat „' + inhalt.titel + '“ abgeschlossen.');
          if (art === 'lektion') {
            var stufe = s.lektionen.filter(function (l) { return l.stufe === inhalt.stufe && l.veroeffentlicht; });
            var fertig = stufe.every(function (l) {
              return s.fortschritt.some(function (x) { return x.nutzer_id === k.id && x.inhalt_id === l.id && x.abgeschlossen_am; });
            });
            if (stufe.length && fertig) {
              var n = { starter: 'Starter', fortgeschritten: 'Fortgeschritten', profi: 'Profi' }[inhalt.stufe];
              melden('stufe', k.id, null, name(k) + ' hat die Stufe ' + n + ' vollständig abgeschlossen.');
            }
          }
        }
        sichern();
        return [kopie(f)];
      },

      zusagen: async function () {
        var k = ich();
        return kopie(laden().zusagen.filter(function (z) { return k.rolle === 'admin' || z.nutzer_id === k.id; }));
      },
      zusageSetzen: async function (nutzerId, beitragId, an) {
        var s = laden();
        s.zusagen = s.zusagen.filter(function (z) { return !(z.nutzer_id === nutzerId && z.beitrag_id === beitragId); });
        if (an) s.zusagen.push({ nutzer_id: nutzerId, beitrag_id: beitragId, erstellt_am: jetzt() });
        sichern();
      },

      alleProfile: async function () {
        mussAdmin();
        return laden().konten.map(ohnePasswort)
          .sort(function (a, b) { return b.erstellt_am.localeCompare(a.erstellt_am); });
      },
      meldungen: async function () { mussAdmin(); return kopie(laden().meldungen); },
      meldungenGelesen: async function () {
        mussAdmin(); laden().meldungen.forEach(function (m) { m.gelesen = true; }); sichern();
      },
      profilStatus: async function (id, status) {
        mussAdmin();
        var k = laden().konten.filter(function (x) { return x.id === id; })[0];
        k.status = status; sichern(); return [ohnePasswort(k)];
      },
      lektionSpeichern: async function (l) {
        mussAdmin(); var s = laden();
        if (l.id) {
          var alt = s.lektionen.filter(function (x) { return x.id === l.id; })[0];
          Object.assign(alt, l);
          sichern(); return [kopie(alt)];
        }
        var neu = Object.assign({ id: uuid(), erstellt_am: jetzt() }, l);
        s.lektionen.push(neu); sichern(); return [kopie(neu)];
      },
      lektionLoeschen: async function (id) {
        mussAdmin(); var s = laden();
        s.lektionen = s.lektionen.filter(function (x) { return x.id !== id; });
        s.fortschritt = s.fortschritt.filter(function (x) { return x.inhalt_id !== id; });
        sichern();
      },
      beitragSpeichern: async function (b) {
        mussAdmin(); var s = laden();
        if (b.id) {
          var alt = s.beitraege.filter(function (x) { return x.id === b.id; })[0];
          Object.assign(alt, b);
          sichern(); return [kopie(alt)];
        }
        var neu = Object.assign({ id: uuid(), erstellt_am: jetzt() }, b);
        s.beitraege.push(neu); sichern(); return [kopie(neu)];
      },
      beitragLoeschen: async function (id) {
        mussAdmin(); var s = laden();
        s.beitraege = s.beitraege.filter(function (x) { return x.id !== id; });
        s.zusagen = s.zusagen.filter(function (x) { return x.beitrag_id !== id; });
        sichern();
      },

      /* Videos im Demo-Modus: im IndexedDB-Speicher dieses Browsers */
      videoHochladen: async function (datei, beiFortschritt) {
        mussAdmin();
        var pfad = videoPfad(datei);
        for (var i = 1; i <= 10; i++) { await new Promise(function (r) { setTimeout(r, 70); }); if (beiFortschritt) beiFortschritt(i / 10); }
        await videoDb('readwrite', function (st) { st.put(datei, pfad); });
        return pfad;
      },
      videoAdresse: async function (pfad) {
        var blob = await videoDb('readonly', function (st) { return st.get(pfad); });
        if (!blob) throw Fehler('Das Video ist in diesem Browser nicht mehr vorhanden.');
        return URL.createObjectURL(blob);
      },
      videoLoeschen: function (pfad) {
        return videoDb('readwrite', function (st) { st.delete(pfad); }).catch(function () {});
      },

      /* Nur im Demo-Modus: alles auf die Beispieldaten zuruecksetzen */
      version: 2,
      zuruecksetzen: function () { speicher = beispielDaten(); speicher.version = 2; sichern(); }
    };
  }

  window.AkademieDaten = LIVE ? liveDaten() : demoDaten();
})();
