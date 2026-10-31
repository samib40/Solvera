/* =========================================================================
   Solvera Akademie – Oberfläche
   -------------------------------------------------------------------------
   Kleine Einzelseiten-Anwendung mit Adressen nach dem #:
     #/                    Übersicht
     #/lektionen           Ausbildungsplan (Starter, Fortgeschritten, Profi)
     #/lektion/<id>        eine Lektion mit Video
     #/neuigkeiten         Wochenschulungen, Ansagen, Termine
     #/beitrag/<id>        ein Beitrag
     #/profil              eigene Angaben, Passwort, Abmelden
     #/admin               Partnerübersicht mit Ausbildungsstand
     #/admin/partner/<id>  Ausbildungsstand eines Partners
     #/admin/inhalte       Lektionen und Beiträge pflegen
     #/admin/lektion/<id|neu>, #/admin/beitrag/<id|neu>
     #/admin/meldungen     Benachrichtigungen
   Daten kommen ausschließlich über window.AkademieDaten.
   ========================================================================= */
(function () {
  'use strict';

  var D = window.AkademieDaten;
  var V = window.AkademieVideo;
  var CFG = (window.SOLVERA && window.SOLVERA.akademie) || {};
  var SCHWELLE = CFG.abschlussAbProzent || 100;
  var NACHEINANDER = CFG.stufenNacheinander !== false;

  var main = document.getElementById('ak-main');
  var nav = document.getElementById('ak-nav');
  var konto = document.getElementById('ak-konto');

  var STUFEN = [
    { id: 'starter', name: 'Starter', text: 'Die Grundlagen für deine ersten Tage an der Tür.' },
    { id: 'fortgeschritten', name: 'Fortgeschritten', text: 'Gesprächsführung, Einwände und Wirtschaftlichkeit im Detail.' },
    { id: 'profi', name: 'Profi', text: 'Techniken der Besten – und der Weg zur Teamleitung.' }
  ];
  var ARTEN = { woche: 'Wochenschulung', ansage: 'Ansage', termin: 'Termin' };

  /* ---------- Zustand ---------- */
  var S = {
    profil: null, lektionen: [], beitraege: [], meinF: {}, alleF: [], zusagen: [],
    profile: [], meldungen: [], geladen: false
  };
  var player = null;
  var abfrage = null;

  /* ---------- Hilfen ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function istAdmin() { return S.profil && S.profil.rolle === 'admin' && S.profil.status === 'aktiv'; }
  function name(p) { return p ? ((p.vorname || '') + ' ' + (p.nachname || '')).trim() || p.email : ''; }
  function initialen(p) {
    var n = ((p.vorname || '')[0] || '') + ((p.nachname || '')[0] || '');
    return (n || (p.email || '?')[0]).toUpperCase();
  }
  function datum(iso, mitZeit) {
    if (!iso) return '–';
    var o = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (mitZeit) { o.hour = '2-digit'; o.minute = '2-digit'; }
    return new Date(iso).toLocaleString('de-DE', o);
  }
  function relativ(iso) {
    if (!iso) return 'noch nie';
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'gerade eben';
    if (s < 3600) return 'vor ' + Math.floor(s / 60) + ' Min.';
    if (s < 86400) return 'vor ' + Math.floor(s / 3600) + ' Std.';
    if (s < 86400 * 2) return 'gestern';
    if (s < 86400 * 30) return 'vor ' + Math.floor(s / 86400) + ' Tagen';
    return datum(iso);
  }
  function terminText(b) {
    var d = new Date(b.termin_am);
    var ende = new Date(d.getTime() + (b.termin_dauer_min || 60) * 60000);
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) + ', ' +
      d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + '–' +
      ende.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  }
  function fuerEingabe(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var z = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes());
  }
  function sicherUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }

  var ICO = {
    home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
    buch: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 22h14"/>',
    megafon: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1ZM16 8.5a5 5 0 0 1 0 7M19 5.5a9 9 0 0 1 0 13"/>',
    nutzer: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    gruppe: '<circle cx="9" cy="8" r="4"/><path d="M15 21a6 6 0 0 0-12 0M16 4.1a4 4 0 0 1 0 7.8M21 21a6 6 0 0 0-3.5-5.5"/>',
    stift: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    glocke: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    haken: '<path d="M20 6 9 17l-5-5"/>',
    schloss: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    play: '<path d="M8 5v14l11-7Z"/>',
    links: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    rechts: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    kalender: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4Z"/>',
    uhr: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    laden: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    stern: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1-4.3-4.3 6.1-.9Z"/>',
    raus: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    pin: '<path d="M12 17v5M9 3h6l-1 7 4 3H6l4-3Z"/>',
    text: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9ZM14 3v6h6M8 13h8M8 17h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    sanduhr: '<path d="M6 2h12M6 22h12M7 2v4a5 5 0 0 0 10 0V2M7 22v-4a5 5 0 0 1 10 0v4"/>'
  };
  function ico(n) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[n] + '</svg>';
  }

  var toastZeit = null;
  function toast(text, fehler) {
    var t = document.getElementById('ak-toast');
    t.textContent = text;
    t.classList.toggle('err', !!fehler);
    t.classList.add('is-visible');
    clearTimeout(toastZeit);
    toastZeit = setTimeout(function () { t.classList.remove('is-visible'); }, 3800);
  }
  function fehlerZeigen(e) {
    console.error(e);
    toast(e && e.anzeigen ? e.message : 'Das hat nicht geklappt. Bitte versuche es noch einmal.', true);
  }

  /* ---------- Fortschritt auswerten ---------- */
  function fertig(id, nutzerId) {
    if (!nutzerId) { var f = S.meinF[id]; return !!(f && f.abgeschlossen_am); }
    return S.alleF.some(function (x) { return x.nutzer_id === nutzerId && x.inhalt_id === id && x.abgeschlossen_am; });
  }
  function prozentVon(id) { var f = S.meinF[id]; return f ? f.prozent : 0; }
  function lektionenDer(stufe) {
    return S.lektionen.filter(function (l) { return l.stufe === stufe && l.veroeffentlicht; })
      .sort(function (a, b) { return a.reihenfolge - b.reihenfolge; });
  }
  /* Zählt für den Ausbildungsstand: nur Lektionen mit Video – nur die lassen
     sich abschließen. */
  function hatVideo(l) { return !!V.erkennen(l.video_url); }
  function zaehlbar(stufe) { return lektionenDer(stufe).filter(hatVideo); }
  function stufenStand(nutzerId) {
    return STUFEN.map(function (s) {
      var ls = zaehlbar(s.id);
      var n = ls.filter(function (l) { return fertig(l.id, nutzerId); }).length;
      return { stufe: s, gesamt: ls.length, fertig: n, prozent: ls.length ? Math.round(n / ls.length * 100) : 0 };
    });
  }
  function gesamtStand(nutzerId) {
    var st = stufenStand(nutzerId);
    var g = st.reduce(function (a, x) { return a + x.gesamt; }, 0);
    var f = st.reduce(function (a, x) { return a + x.fertig; }, 0);
    var aktuell = st.filter(function (x) { return x.fertig < x.gesamt; })[0];
    return { stufen: st, gesamt: g, fertig: f, prozent: g ? Math.round(f / g * 100) : 0,
             aktuell: aktuell ? aktuell.stufe.name : (g ? 'Abgeschlossen' : '–') };
  }
  function stufeOffen(stufeId) {
    if (!NACHEINANDER || istAdmin()) return true;
    var st = stufenStand();
    for (var i = 0; i < STUFEN.length; i++) {
      if (STUFEN[i].id === stufeId) return true;
      if (st[i].fertig < st[i].gesamt) return false;
    }
    return true;
  }
  function naechsteLektion() {
    for (var i = 0; i < STUFEN.length; i++) {
      if (!stufeOffen(STUFEN[i].id)) return null;
      var offen = zaehlbar(STUFEN[i].id).filter(function (l) { return !fertig(l.id); })[0];
      if (offen) return offen;
    }
    return null;
  }
  function kommendeTermine() {
    var jetzt = Date.now();
    return S.beitraege.filter(function (b) {
      return b.art === 'termin' && b.termin_am && b.veroeffentlicht &&
        new Date(b.termin_am).getTime() + (b.termin_dauer_min || 60) * 60000 > jetzt;
    }).sort(function (a, b) { return new Date(a.termin_am) - new Date(b.termin_am); });
  }
  function habeZugesagt(beitragId) {
    return S.zusagen.some(function (z) { return z.beitrag_id === beitragId && z.nutzer_id === S.profil.id; });
  }

  /* Neuigkeiten seit dem letzten Besuch */
  function gesehenSchluessel() { return 'solvera-ak-neuigkeiten-' + (S.profil ? S.profil.id : ''); }
  function zuletztGesehen() { try { return localStorage.getItem(gesehenSchluessel()) || ''; } catch (e) { return ''; } }
  function neuigkeitenGesehen() { try { localStorage.setItem(gesehenSchluessel(), new Date().toISOString()); } catch (e) { /* egal */ } }
  function anzahlNeu() {
    var z = zuletztGesehen();
    return S.beitraege.filter(function (b) { return b.veroeffentlicht && b.erstellt_am > z; }).length;
  }
  function ungeleseneMeldungen() { return S.meldungen.filter(function (m) { return !m.gelesen; }).length; }

  /* ---------- Daten laden ---------- */
  async function ladeAlles() {
    var r = await Promise.all([D.lektionen(), D.beitraege(), D.fortschritt(), D.zusagen()]);
    S.lektionen = r[0] || []; S.beitraege = r[1] || []; S.alleF = r[2] || []; S.zusagen = r[3] || [];
    S.meinF = {};
    S.alleF.forEach(function (f) { if (f.nutzer_id === S.profil.id) S.meinF[f.inhalt_id] = f; });
    if (istAdmin()) {
      var a = await Promise.all([D.alleProfile(), D.meldungen()]);
      S.profile = a[0] || []; S.meldungen = a[1] || [];
    }
    S.geladen = true;
  }

  async function meldungenAbfragen() {
    if (!istAdmin()) return;
    try {
      var vorher = ungeleseneMeldungen();
      S.meldungen = await D.meldungen() || [];
      var jetzt = ungeleseneMeldungen();
      if (jetzt > vorher) {
        var neueste = S.meldungen.filter(function (m) { return !m.gelesen; })[0];
        toast(neueste ? neueste.text : 'Neue Meldung');
        if (window.Notification && Notification.permission === 'granted' && neueste) {
          try { new Notification('Solvera Akademie', { body: neueste.text, icon: 'assets/img/favicon-192.png' }); } catch (e) { /* egal */ }
        }
        if (/^admin\/?$/.test(pfad().join('/')) || pfad()[1] === 'partner') {
          var r = await Promise.all([D.alleProfile(), D.fortschritt()]);
          S.profile = r[0]; S.alleF = r[1];
          zeigen();
        }
      }
      navZeichnen();
    } catch (e) { /* still weiter versuchen */ }
  }

  /* ---------- Rahmen ---------- */
  function pfad() { return location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean); }
  function geheZu(p) { location.hash = '#/' + p; }

  function navZeichnen() {
    if (!S.profil || S.profil.status !== 'aktiv') { nav.hidden = true; nav.innerHTML = ''; return; }
    var p = pfad(); var h = p[0] || '';
    var neu = anzahlNeu(), meld = ungeleseneMeldungen();
    var punkte = [
      ['', 'home', 'Übersicht', h === ''],
      ['lektionen', 'buch', 'Lektionen', h === 'lektionen' || h === 'lektion'],
      ['neuigkeiten', 'megafon', 'Neuigkeiten' + (neu ? ' <span class="ak-zahl">' + neu + '</span>' : ''), h === 'neuigkeiten' || h === 'beitrag'],
      ['profil', 'nutzer', 'Profil', h === 'profil']
    ];
    if (istAdmin()) {
      punkte.push(['admin', 'gruppe', 'Partner', h === 'admin' && (!p[1] || p[1] === 'partner'), 'ak-nav-admin']);
      punkte.push(['admin/inhalte', 'stift', 'Inhalte', h === 'admin' && /inhalte|lektion|beitrag/.test(p[1] || '')]);
      punkte.push(['admin/meldungen', 'glocke', 'Meldungen' + (meld ? ' <span class="ak-zahl">' + meld + '</span>' : ''), h === 'admin' && p[1] === 'meldungen']);
    }
    nav.innerHTML = punkte.map(function (x) {
      return '<a href="#/' + x[0] + '" class="' + (x[3] ? 'is-active ' : '') + (x[4] || '') + '"' +
        (x[3] ? ' aria-current="page"' : '') + '>' + ico(x[1]) + x[2] + '</a>';
    }).join('');
    nav.hidden = false;
  }

  function kontoZeichnen() {
    if (!S.profil) { konto.hidden = true; konto.innerHTML = ''; return; }
    konto.innerHTML = '<div class="ak-konto-name">' + esc(name(S.profil)) +
      '<small>' + (istAdmin() ? 'Admin' : esc(gesamtStand().aktuell === '–' ? 'Partner' : 'Stufe ' + gesamtStand().aktuell)) + '</small></div>' +
      '<a class="ak-avatar" href="#/profil" title="Profil">' + esc(initialen(S.profil)) + '</a>';
    konto.hidden = false;
  }

  function demoLeiste() {
    var el = document.getElementById('ak-demo');
    if (D.modus !== 'demo') { el.hidden = true; return; }
    el.innerHTML = '<strong>Demo-Modus:</strong> Alle Daten bleiben nur in diesem Browser. ' +
      'Zugänge <strong>partner@demo.de</strong> und <strong>admin@demo.de</strong>, Passwort <strong>demo1234</strong>. ' +
      '<button type="button" data-aktion="demo-reset">Beispieldaten zurücksetzen</button>';
    el.hidden = false;
  }

  function setzen(html) {
    if (player) { player.zerstoeren(); player = null; }
    main.innerHTML = '<div class="wrap">' + html + '</div>';
  }

  /* ---------- Bausteine ---------- */
  function balken(p, ok) { return '<div class="ak-balken' + (ok ? ' ok' : '') + '"><i style="width:' + Math.max(0, Math.min(100, p)) + '%"></i></div>'; }

  function lektionEintrag(l, nr, offen) {
    var f = S.meinF[l.id];
    var erledigt = f && f.abgeschlossen_am;
    var sym = !offen ? '<span class="ak-symbol">' + ico('schloss') + '</span>'
      : erledigt ? '<span class="ak-symbol fertig">' + ico('haken') + '</span>'
      : f ? '<span class="ak-symbol laeuft">' + ico('play') + '</span>'
      : '<span class="ak-symbol">' + nr + '</span>';
    var rechts = erledigt ? 'Erledigt' : !hatVideo(l) ? 'Video folgt' : f ? f.prozent + ' %' : '';
    var inhalt = sym + '<div class="txt"><strong>' + esc(l.titel) + '</strong><p>' + esc(l.beschreibung) + '</p>' +
      '<div class="meta">' + (hatVideo(l) ? '<span>Video</span>' : '<span>Video folgt</span>') +
      (l.dauer_min ? '<span>' + l.dauer_min + ' Min.</span>' : '') +
      (!l.veroeffentlicht ? '<span class="ak-tag warn">Entwurf</span>' : '') + '</div></div>' +
      '<div class="rechts">' + rechts + '</div>';
    return offen ? '<a class="ak-eintrag" href="#/lektion/' + esc(l.id) + '">' + inhalt + '</a>'
                 : '<div class="ak-eintrag" aria-disabled="true">' + inhalt + '</div>';
  }

  function datumKachel(iso) {
    var d = new Date(iso);
    return '<div class="ak-datum" aria-hidden="true"><b>' + d.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '') + '</b>' +
      '<span>' + d.getDate() + '</span><small>' + d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '') + '</small></div>';
  }

  function terminBlock(b, kurz) {
    var zu = habeZugesagt(b.id);
    var link = sicherUrl(b.meeting_link);
    var anzahl = S.zusagen.filter(function (z) { return z.beitrag_id === b.id; }).length;
    return '<div class="ak-termin">' + datumKachel(b.termin_am) +
      '<div class="txt"><strong>' + (kurz ? '<a href="#/beitrag/' + esc(b.id) + '">' + esc(b.titel) + '</a>' : esc(b.titel)) + '</strong>' +
      '<div class="zeit">' + esc(terminText(b)) + '</div>' +
      (istAdmin() ? '<div class="zeit">' + anzahl + ' Zusage' + (anzahl === 1 ? '' : 'n') + '</div>' : '') +
      '<div class="ak-knoepfe">' +
      (link ? '<a class="btn btn-primary btn-sm" href="' + esc(link) + '" target="_blank" rel="noopener">' + ico('video') + 'Teilnehmen</a>' : '') +
      '<button class="btn btn-ghost btn-sm" type="button" data-aktion="zusage" data-id="' + esc(b.id) + '" aria-pressed="' + zu + '">' +
      (zu ? ico('haken') + 'Zugesagt' : 'Ich bin dabei') + '</button>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-aktion="ics" data-id="' + esc(b.id) + '">' + ico('kalender') + 'Kalender</button>' +
      '</div></div></div>';
  }

  function beitragKarte(b) {
    var neu = b.erstellt_am > zuletztGesehen();
    var f = S.meinF[b.id];
    if (b.art === 'termin' && b.termin_am) {
      var vorbei = new Date(b.termin_am).getTime() + (b.termin_dauer_min || 60) * 60000 < Date.now();
      return '<div class="ak-beitrag' + (b.angeheftet ? ' angeheftet' : '') + '">' +
        '<div class="ak-beitrag-kopf"><span class="ak-tag termin">Termin</span>' + (vorbei ? '<span class="ak-tag">Vorbei</span>' : '') +
        (neu ? '<span class="ak-tag neu">Neu</span>' : '') + '</div><div class="mt-16">' + terminBlock(b, true) + '</div></div>';
    }
    return '<a class="ak-beitrag' + (b.angeheftet ? ' angeheftet' : '') + '" href="#/beitrag/' + esc(b.id) + '">' +
      '<div class="ak-beitrag-kopf"><span class="ak-tag ' + b.art + '">' + ARTEN[b.art] + '</span>' +
      (b.angeheftet ? '<span>' + ico('pin').replace('<svg', '<svg width="14" height="14"') + '</span>' : '') +
      (neu ? '<span class="ak-tag neu">Neu</span>' : '') +
      (f && f.abgeschlossen_am ? '<span class="ak-tag ok">Gesehen</span>' : '') +
      (!b.veroeffentlicht ? '<span class="ak-tag warn">Entwurf</span>' : '') +
      '<span>' + relativ(b.erstellt_am) + '</span></div>' +
      '<h3>' + esc(b.titel) + '</h3>' +
      (b.text ? '<p>' + esc(b.text.length > 200 ? b.text.slice(0, 200) + '…' : b.text) + '</p>' : '') + '</a>';
  }

  /* =======================================================================
     ANSICHTEN – Anmeldung
     ======================================================================= */
  function feld(id, label, typ, extra) {
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      '<input class="input" id="' + id + '" name="' + id + '" type="' + (typ || 'text') + '" ' + (extra || '') + '></div>';
  }
  function pwFeld(id, label, extra) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><div class="ak-pw">' +
      '<input class="input" id="' + id + '" name="' + id + '" type="password" ' + (extra || '') + '>' +
      '<button type="button" data-aktion="pw-zeigen" aria-label="Passwort anzeigen">Zeigen</button></div></div>';
  }

  function vAnmelden(hinweis) {
    setzen('<div class="ak-auth"><div class="ak-karte">' +
      '<span class="eyebrow">Partnerbereich</span><h1 class="mt-8">Willkommen in der Solvera Akademie</h1>' +
      '<p class="lead">Melde dich an, um mit deinen Lektionen weiterzumachen.</p>' +
      (hinweis ? '<div class="ak-hinweis mt-16">' + hinweis + '</div>' : '') +
      '<form data-form="anmelden" novalidate>' +
      feld('email', 'E-Mail-Adresse', 'email', 'autocomplete="email" required') +
      pwFeld('passwort', 'Passwort', 'autocomplete="current-password" required') +
      '<div class="form-msg err" role="alert"></div>' +
      '<button class="btn btn-primary btn-full" type="submit">Anmelden</button>' +
      '</form>' +
      (D.modus === 'demo' ? '<div class="ak-schnell"><button class="btn btn-ghost btn-sm" type="button" data-aktion="demo-login" data-wer="partner">Als Partner ansehen</button>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-aktion="demo-login" data-wer="admin">Als Admin ansehen</button></div>' : '') +
      '<div class="ak-auth-fuss"><a href="#/passwort-vergessen">Passwort vergessen?</a></div>' +
      '</div><p class="ak-auth-fuss">Neu bei Solvera Sales? <a href="#/registrieren">Konto erstellen</a></p></div>');
  }

  function vRegistrieren() {
    setzen('<div class="ak-auth"><div class="ak-karte">' +
      '<span class="eyebrow">Neues Konto</span><h1 class="mt-8">Für die Akademie registrieren</h1>' +
      '<p class="lead">Nach der Registrierung schalten wir dein Konto frei – meist am selben Tag.</p>' +
      '<form data-form="registrieren" novalidate><div class="form-grid">' +
      feld('vorname', 'Vorname', 'text', 'autocomplete="given-name" required') +
      feld('nachname', 'Nachname', 'text', 'autocomplete="family-name" required') +
      '<div class="col-2">' + feld('email', 'E-Mail-Adresse', 'email', 'autocomplete="email" required') + '</div>' +
      feld('telefon', 'Telefon', 'tel', 'autocomplete="tel"') +
      feld('region', 'Stadt / Region', 'text', 'placeholder="z. B. Karlsruhe"') +
      '<div class="col-2">' + pwFeld('passwort', 'Passwort (mind. 8 Zeichen)', 'autocomplete="new-password" minlength="8" required') + '</div>' +
      '<div class="col-2">' + pwFeld('passwort2', 'Passwort wiederholen', 'autocomplete="new-password" required') + '</div>' +
      '</div>' +
      '<label class="consent"><input type="checkbox" name="einwilligung" required><span class="consent-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg></span>' +
      '<span class="consent-txt">Ich bin einverstanden, dass Solvera Sales meine Angaben und meinen Lernfortschritt (welche Lektionen und Videos ich wann angesehen habe) speichert, um meine Ausbildung zu begleiten. Details in der <a href="datenschutz.html#akademie" target="_blank">Datenschutzerklärung</a>.</span></label>' +
      '<div class="form-msg err" role="alert"></div>' +
      '<button class="btn btn-primary btn-full" type="submit">Konto erstellen</button>' +
      '</form></div><p class="ak-auth-fuss">Schon registriert? <a href="#/anmelden">Anmelden</a></p></div>');
  }

  function vPasswortVergessen() {
    setzen('<div class="ak-auth"><div class="ak-karte">' +
      '<span class="eyebrow">Passwort</span><h1 class="mt-8">Passwort zurücksetzen</h1>' +
      '<p class="lead">Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst.</p>' +
      '<form data-form="vergessen" novalidate>' + feld('email', 'E-Mail-Adresse', 'email', 'autocomplete="email" required') +
      '<div class="form-msg err" role="alert"></div>' +
      '<button class="btn btn-primary btn-full" type="submit">Link anfordern</button></form>' +
      '</div><p class="ak-auth-fuss"><a href="#/anmelden">Zurück zur Anmeldung</a></p></div>');
  }

  function vNeuesPasswort() {
    setzen('<div class="ak-auth"><div class="ak-karte">' +
      '<span class="eyebrow">Passwort</span><h1 class="mt-8">Neues Passwort festlegen</h1>' +
      '<form data-form="neues-passwort" novalidate>' +
      pwFeld('passwort', 'Neues Passwort (mind. 8 Zeichen)', 'autocomplete="new-password" required') +
      pwFeld('passwort2', 'Wiederholen', 'autocomplete="new-password" required') +
      '<div class="form-msg err" role="alert"></div>' +
      '<button class="btn btn-primary btn-full" type="submit">Speichern</button></form></div></div>');
  }

  function vZustand() {
    var wartet = S.profil.status === 'wartend';
    setzen('<div class="ak-zustand"><div class="ico-tile ico-tile-lg">' + ico(wartet ? 'sanduhr' : 'schloss') + '</div>' +
      '<h1>' + (wartet ? 'Fast geschafft, ' + esc(S.profil.vorname) + '!' : 'Konto gesperrt') + '</h1>' +
      '<p>' + (wartet
        ? 'Dein Konto ist angelegt und wird gerade geprüft. Sobald wir dich freigeschaltet haben, stehen dir alle Lektionen, Wochenschulungen und Termine offen. Schau einfach später noch einmal vorbei.'
        : 'Dein Zugang zur Akademie ist derzeit nicht aktiv. Bei Fragen melde dich bitte bei deiner Vertriebsleitung.') + '</p>' +
      '<div class="ak-knoepfe" style="justify-content:center;margin-top:26px">' +
      '<button class="btn btn-primary" type="button" data-aktion="neu-laden">Status prüfen</button>' +
      '<button class="btn btn-ghost" type="button" data-aktion="abmelden">' + ico('raus') + 'Abmelden</button></div></div>');
  }

  /* =======================================================================
     ANSICHTEN – Partner
     ======================================================================= */
  function vUebersicht() {
    var g = gesamtStand();
    var weiter = naechsteLektion();
    var termine = kommendeTermine().slice(0, 3);
    var neueste = S.beitraege.filter(function (b) { return b.art !== 'termin' && b.veroeffentlicht; })
      .sort(function (a, b) { return (b.angeheftet - a.angeheftet) || b.erstellt_am.localeCompare(a.erstellt_am); }).slice(0, 3);
    var stunde = new Date().getHours();
    var gruss = stunde < 11 ? 'Guten Morgen' : stunde < 18 ? 'Hallo' : 'Guten Abend';

    setzen(
      '<section class="ak-hallo"><span class="eyebrow">Solvera Akademie</span>' +
      '<h1>' + gruss + ', ' + esc(S.profil.vorname || name(S.profil)) + '</h1>' +
      '<p>' + (g.fertig === 0 ? 'Schön, dass du dabei bist. Starte mit der ersten Lektion – sie dauert nur wenige Minuten.'
        : g.fertig === g.gesamt && g.gesamt ? 'Du hast alle Lektionen abgeschlossen. Stark! Neue Inhalte findest du unter Neuigkeiten.'
        : 'Du hast ' + g.fertig + ' von ' + g.gesamt + ' Lektionen abgeschlossen. Mach weiter, wo du aufgehört hast.') + '</p>' +
      (weiter ? '<div class="ak-weiter"><span class="ak-symbol gold">' + ico('play') + '</span><div class="txt"><small>' +
        (S.meinF[weiter.id] ? 'Weiter mit' : 'Als Nächstes') + ' · ' + esc(STUFEN.filter(function (s) { return s.id === weiter.stufe; })[0].name) +
        '</small><strong>' + esc(weiter.titel) + '</strong></div>' +
        '<a class="btn btn-primary" href="#/lektion/' + esc(weiter.id) + '">' + (S.meinF[weiter.id] ? 'Fortsetzen' : 'Starten') + '</a></div>' : '') +
      '</section>' +

      '<div class="ak-raster"><div class="ak-spalte">' +
      '<section class="ak-karte"><div class="ak-karte-kopf"><h2>Dein Ausbildungsstand</h2><a href="#/lektionen">Alle Lektionen</a></div>' +
      '<div class="ak-stand"><div class="ak-ring" style="--p:' + g.prozent + '" role="img" aria-label="' + g.prozent + ' Prozent abgeschlossen"><span>' + g.prozent + ' %<small>gesamt</small></span></div>' +
      '<div class="ak-stufen-mini">' + g.stufen.map(function (x) {
        return '<div><div class="zeile"><span>' + x.stufe.name + (stufeOffen(x.stufe.id) ? '' : ' ' + ico('schloss').replace('<svg', '<svg width="13" height="13" style="display:inline;vertical-align:-1px"')) +
          '</span><span>' + x.fertig + ' / ' + x.gesamt + '</span></div>' + balken(x.prozent, x.gesamt && x.fertig === x.gesamt) + '</div>';
      }).join('') + '</div></div></section>' +

      '<section class="ak-karte"><div class="ak-karte-kopf"><h2>Neuigkeiten</h2><a href="#/neuigkeiten">Alle anzeigen</a></div>' +
      (neueste.length ? '<div class="ak-liste">' + neueste.map(beitragKarte).join('') + '</div>' : '<p class="ak-leer">Noch keine Beiträge.</p>') +
      '</section></div>' +

      '<div class="ak-spalte"><section class="ak-karte"><div class="ak-karte-kopf"><h2>Nächste Termine</h2></div>' +
      (termine.length ? termine.map(function (b) { return terminBlock(b, true); }).join('') : '<p class="ak-leer">Aktuell sind keine Termine geplant.</p>') +
      '</section></div></div>');
  }

  function vLektionen() {
    var html = '<div class="ak-kopf"><div><span class="eyebrow">Ausbildungsplan</span><h1>Deine Lektionen</h1>' +
      '<p>Drei Stufen, Schritt für Schritt. Eine Lektion ist erledigt, sobald du das Video vollständig angesehen hast. Vorspulen zählt nicht.' +
      (NACHEINANDER ? ' Die nächste Stufe öffnet sich, wenn die vorige abgeschlossen ist.' : '') + '</p></div></div>';
    stufenStand().forEach(function (x) {
      var offen = stufeOffen(x.stufe.id);
      var ls = lektionenDer(x.stufe.id);
      if (istAdmin()) ls = S.lektionen.filter(function (l) { return l.stufe === x.stufe.id; }).sort(function (a, b) { return a.reihenfolge - b.reihenfolge; });
      html += '<section class="ak-stufe' + (offen ? '' : ' ak-stufe-zu') + '"><div class="ak-stufe-kopf"><h2>' + x.stufe.name + '</h2>' +
        balken(x.prozent, x.gesamt && x.fertig === x.gesamt) + '<span class="zahl">' + x.fertig + ' von ' + x.gesamt + '</span>' +
        (!offen ? '<span class="ak-tag">' + ico('schloss').replace('<svg', '<svg width="12" height="12"') + 'Noch gesperrt</span>' : '') + '</div>' +
        '<p class="muted small" style="margin:-6px 0 14px">' + x.stufe.text + '</p>' +
        (ls.length ? '<div class="ak-liste">' + ls.map(function (l, i) { return lektionEintrag(l, i + 1, offen); }).join('') + '</div>'
          : '<p class="ak-leer">Für diese Stufe gibt es noch keine Lektionen.</p>') + '</section>';
    });
    setzen(html);
  }

  function lernpunkte(text) {
    var z = String(text || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!z.length) return '';
    return '<ul class="ak-punkte">' + z.map(function (s) { return '<li>' + ico('haken') + '<span>' + esc(s) + '</span></li>'; }).join('') + '</ul>';
  }

  function videoBereich(url) {
    if (V.erkennen(url)) return '<div class="ak-video" id="ak-video"></div>';
    return '<div class="ak-video ak-video-leer"><div>' + ico('video') + '<strong>Video folgt</strong>' +
      '<span class="small">Bis dahin findest du die wichtigsten Punkte unten.</span></div></div>';
  }

  function statusBereich(id, url) {
    var f = S.meinF[id];
    var info = V.erkennen(url);
    if (f && f.abgeschlossen_am) {
      return '<span class="ak-tag ok">' + ico('haken').replace('<svg', '<svg width="13" height="13"') + 'Abgeschlossen am ' + datum(f.abgeschlossen_am) + '</span>';
    }
    if (!info) return '<span class="small muted">Sobald das Video da ist, kannst du diese Lektion abschließen.</span>';
    return balken(f ? f.prozent : 0) + '<span class="zahl">' + (f ? f.prozent : 0) + ' % gesehen</span>' +
      '<span class="small muted" style="flex-basis:100%">Wird automatisch als erledigt markiert, sobald du das Video vollständig angesehen hast. Vorspulen zählt nicht.</span>';
  }

  function playerStarten(inhalt, art) {
    var ziel = document.getElementById('ak-video');
    if (!ziel) return;
    player = V.einbauen(ziel, inhalt.video_url, S.profil.id + '-' + inhalt.id, function (prozent, sek) {
      fortschrittSenden(inhalt.id, art, prozent >= SCHWELLE ? 100 : prozent, sek);
    }, { zeichen: name(S.profil) + ' · ' + S.profil.email, adresse: D.videoAdresse });
  }

  var sendeKette = Promise.resolve();
  function fortschrittSenden(id, art, prozent, sek) {
    if (S.profil.status !== 'aktiv') return Promise.resolve();
    var vorher = S.meinF[id] && S.meinF[id].abgeschlossen_am;
    sendeKette = sendeKette.then(function () {
      return D.fortschrittMelden(S.profil.id, id, art, prozent, sek);
    }).then(function (r) {
      var zeile = r && r[0];
      if (zeile) {
        S.meinF[id] = zeile;
        var i = S.alleF.findIndex(function (x) { return x.nutzer_id === zeile.nutzer_id && x.inhalt_id === id; });
        if (i >= 0) S.alleF[i] = zeile; else S.alleF.push(zeile);
      }
      var st = document.getElementById('ak-lstatus');
      if (st && st.getAttribute('data-id') === id) st.innerHTML = statusBereich(id, st.getAttribute('data-url'));
      if (zeile && zeile.abgeschlossen_am && !vorher) {
        toast(art === 'lektion' ? 'Lektion abgeschlossen – stark!' : 'Als gesehen gespeichert.');
        var w = document.getElementById('ak-weiter-knopf');
        if (w) w.hidden = false;
        kontoZeichnen();
      }
    }).catch(fehlerZeigen);
    return sendeKette;
  }

  function vLektion(id) {
    var l = S.lektionen.filter(function (x) { return x.id === id; })[0];
    if (!l) return vNichtGefunden();
    if (!stufeOffen(l.stufe)) {
      setzen('<div class="ak-zustand"><div class="ico-tile ico-tile-lg">' + ico('schloss') + '</div><h1>Diese Lektion ist noch gesperrt</h1>' +
        '<p>Schließe zuerst die vorige Stufe ab.</p><div class="mt-24"><a class="btn btn-primary" href="#/lektionen">Zu den Lektionen</a></div></div>');
      return;
    }
    var stufe = STUFEN.filter(function (s) { return s.id === l.stufe; })[0];
    var ls = lektionenDer(l.stufe);
    var i = ls.findIndex(function (x) { return x.id === id; });
    var alle = [];
    STUFEN.forEach(function (s) { alle = alle.concat(lektionenDer(s.id)); });
    var gi = alle.findIndex(function (x) { return x.id === id; });
    var zurueck = gi > 0 ? alle[gi - 1] : null;
    var vor = gi >= 0 && gi < alle.length - 1 ? alle[gi + 1] : null;
    var vorOffen = vor && stufeOffen(vor.stufe);

    setzen('<a class="ak-zurueck" href="#/lektionen">' + ico('links') + 'Alle Lektionen</a>' +
      '<div class="ak-raster"><div class="ak-spalte"><div>' + videoBereich(l.video_url) +
      '<div class="ak-lektion-status" id="ak-lstatus" data-id="' + esc(l.id) + '" data-url="' + esc(l.video_url) + '">' + statusBereich(l.id, l.video_url) + '</div></div>' +
      '<div><span class="eyebrow">' + stufe.name + (i >= 0 ? ' · Lektion ' + (i + 1) + ' von ' + ls.length : '') + '</span>' +
      '<h1 class="mt-8" style="font-size:clamp(1.6rem,3.2vw,2.2rem)">' + esc(l.titel) + '</h1>' +
      '<p class="lead mt-16">' + esc(l.beschreibung) + '</p></div>' +
      '<div class="ak-blaettern">' +
      (zurueck ? '<a class="btn btn-ghost" href="#/lektion/' + esc(zurueck.id) + '">' + ico('links') + 'Vorige</a>' : '<span></span>') +
      (vor ? '<a class="btn btn-primary" id="ak-weiter-knopf" href="#/lektion/' + esc(vor.id) + '"' + (vorOffen || fertig(l.id) ? '' : ' hidden') + '>Nächste Lektion' + ico('rechts') + '</a>' : '') +
      '</div></div>' +
      '<div class="ak-spalte"><section class="ak-karte"><h2>Das lernst du</h2>' + (lernpunkte(l.inhalt) || '<p class="ak-leer">–</p>') +
      '<div class="ak-info-liste mt-24"><div><dt>Stufe</dt><dd>' + stufe.name + '</dd></div>' +
      (l.dauer_min ? '<div><dt>Dauer</dt><dd>ca. ' + l.dauer_min + ' Min.</dd></div>' : '') + '</div>' +
      (istAdmin() ? '<a class="btn btn-ghost btn-sm mt-24" href="#/admin/lektion/' + esc(l.id) + '">' + ico('stift') + 'Bearbeiten</a>' : '') +
      '</section></div></div>');
    playerStarten(l, 'lektion');
  }

  function vNeuigkeiten() {
    var filter = (location.hash.split('?filter=')[1] || 'alle');
    var liste = S.beitraege.filter(function (b) { return filter === 'alle' || b.art === filter; });
    var kommend = filter === 'termin' || filter === 'alle' ? kommendeTermine() : [];
    var rest = liste.filter(function (b) { return kommend.indexOf(b) === -1; })
      .sort(function (a, b) { return (b.angeheftet - a.angeheftet) || b.erstellt_am.localeCompare(a.erstellt_am); });
    var html = '<div class="ak-kopf"><div><span class="eyebrow">Aus dem Team</span><h1>Neuigkeiten</h1>' +
      '<p>Wochenschulungen, Ansagen und Termine wie Teams-Meetings – alles an einem Ort.</p></div></div>' +
      '<div class="ak-filter" role="group" aria-label="Filter">' + [['alle', 'Alle'], ['woche', 'Wochenschulungen'], ['ansage', 'Ansagen'], ['termin', 'Termine']].map(function (x) {
        return '<button type="button" data-aktion="filter" data-wert="' + x[0] + '" aria-pressed="' + (filter === x[0]) + '">' + x[1] + '</button>';
      }).join('') + '</div>';
    if (kommend.length) {
      html += '<section class="ak-karte" style="margin-bottom:22px"><div class="ak-karte-kopf"><h2>Anstehende Termine</h2></div>' +
        kommend.map(function (b) { return terminBlock(b, true); }).join('') + '</section>';
    }
    html += rest.length ? '<div class="ak-liste">' + rest.map(beitragKarte).join('') + '</div>'
      : (kommend.length ? '' : '<p class="ak-leer">Hier ist noch nichts.</p>');
    setzen(html);
    neuigkeitenGesehen();
  }

  function vBeitrag(id) {
    var b = S.beitraege.filter(function (x) { return x.id === id; })[0];
    if (!b) return vNichtGefunden();
    var hatVideo = !!V.erkennen(b.video_url);
    setzen('<a class="ak-zurueck" href="#/neuigkeiten">' + ico('links') + 'Alle Neuigkeiten</a>' +
      '<div class="wrap-narrow" style="padding:0;margin:0 auto">' +
      '<div class="ak-beitrag-kopf"><span class="ak-tag ' + b.art + '">' + ARTEN[b.art] + '</span><span>' + datum(b.erstellt_am) + '</span></div>' +
      '<h1 class="mt-16" style="font-size:clamp(1.6rem,3.2vw,2.3rem)">' + esc(b.titel) + '</h1>' +
      (b.art === 'termin' && b.termin_am ? '<div class="ak-karte mt-24">' + terminBlock(b, false) + '</div>' : '') +
      (hatVideo ? '<div class="mt-24">' + videoBereich(b.video_url) +
        '<div class="ak-lektion-status" id="ak-lstatus" data-id="' + esc(b.id) + '" data-url="' + esc(b.video_url) + '">' + statusBereich(b.id, b.video_url) + '</div></div>' : '') +
      (b.text ? '<div class="ak-textblock mt-24">' + esc(b.text) + '</div>' : '') +
      (istAdmin() ? '<a class="btn btn-ghost btn-sm mt-32" href="#/admin/beitrag/' + esc(b.id) + '">' + ico('stift') + 'Bearbeiten</a>' : '') +
      '</div>');
    if (hatVideo) playerStarten(b, 'beitrag');
  }

  function vProfil() {
    var p = S.profil;
    setzen('<div class="ak-kopf"><div><span class="eyebrow">Dein Konto</span><h1>Profil</h1></div></div>' +
      '<div class="ak-raster"><div class="ak-spalte">' +
      '<section class="ak-karte"><h2>Deine Angaben</h2><form class="ak-formular mt-16" data-form="profil" novalidate><div class="form-grid">' +
      feld('vorname', 'Vorname', 'text', 'value="' + esc(p.vorname) + '" required') +
      feld('nachname', 'Nachname', 'text', 'value="' + esc(p.nachname) + '" required') +
      feld('telefon', 'Telefon', 'tel', 'value="' + esc(p.telefon) + '"') +
      feld('region', 'Stadt / Region', 'text', 'value="' + esc(p.region) + '"') +
      '</div><div class="form-msg err" role="alert"></div><div><button class="btn btn-primary" type="submit">Speichern</button></div></form></section>' +
      '<section class="ak-karte"><h2>Passwort ändern</h2><form class="ak-formular mt-16" data-form="neues-passwort" novalidate><div class="form-grid">' +
      pwFeld('passwort', 'Neues Passwort', 'autocomplete="new-password" required') +
      pwFeld('passwort2', 'Wiederholen', 'autocomplete="new-password" required') +
      '</div><div class="form-msg err" role="alert"></div><div><button class="btn btn-ghost" type="submit">Passwort ändern</button></div></form></section>' +
      '</div><div class="ak-spalte"><section class="ak-karte"><h2>Konto</h2><dl class="ak-info-liste mt-16">' +
      '<div><dt>E-Mail</dt><dd>' + esc(p.email) + '</dd></div>' +
      '<div><dt>Rolle</dt><dd>' + (p.rolle === 'admin' ? 'Admin' : 'Vertriebspartner') + '</dd></div>' +
      '<div><dt>Dabei seit</dt><dd>' + datum(p.erstellt_am) + '</dd></div></dl>' +
      '<button class="btn btn-ghost btn-full mt-24" type="button" data-aktion="abmelden">' + ico('raus') + 'Abmelden</button></section></div></div>');
  }

  function vNichtGefunden() {
    setzen('<div class="ak-zustand"><h1>Nicht gefunden</h1><p>Diesen Inhalt gibt es nicht (mehr).</p>' +
      '<div class="mt-24"><a class="btn btn-primary" href="#/">Zur Übersicht</a></div></div>');
  }

  /* =======================================================================
     ANSICHTEN – Admin
     ======================================================================= */
  function partnerZeilen() {
    return S.profile.filter(function (p) { return p.rolle !== 'admin'; }).map(function (p) {
      var g = gesamtStand(p.id);
      var eigene = S.alleF.filter(function (f) { return f.nutzer_id === p.id; });
      var letzte = eigene.reduce(function (m, f) { return f.aktualisiert_am > m ? f.aktualisiert_am : m; }, p.letzte_aktivitaet || '');
      var wochen = eigene.filter(function (f) { return f.art === 'beitrag' && f.abgeschlossen_am; }).length;
      return { p: p, g: g, letzte: letzte || null, wochen: wochen };
    });
  }

  var tabelle = { suche: '', status: 'alle', sort: 'neu' };

  function vAdmin() {
    var zeilen = partnerZeilen();
    var aktive = zeilen.filter(function (z) { return z.p.status === 'aktiv'; });
    var wartend = zeilen.filter(function (z) { return z.p.status === 'wartend'; });
    var schnitt = aktive.length ? Math.round(aktive.reduce(function (a, z) { return a + z.g.prozent; }, 0) / aktive.length) : 0;
    var woche = Date.now() - 7 * 86400000;
    var abschluesse = S.alleF.filter(function (f) { return f.abgeschlossen_am && new Date(f.abgeschlossen_am).getTime() > woche; }).length;

    var html = '<div class="ak-kopf"><div><span class="eyebrow">Admin</span><h1>Ausbildungsstand</h1>' +
      '<p>Wer steht wo? Klicke auf einen Partner für alle Details.</p></div>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-aktion="csv">' + ico('laden') + 'Als CSV exportieren</button></div>' +
      '<div class="ak-kennzahlen">' +
      '<div class="ak-kennzahl"><div class="v">' + aktive.length + '</div><div class="k">aktive Partner</div></div>' +
      '<div class="ak-kennzahl"><div class="v">' + wartend.length + '</div><div class="k">warten auf Freischaltung</div></div>' +
      '<div class="ak-kennzahl"><div class="v">' + schnitt + ' %</div><div class="k">Ø Ausbildungsstand</div></div>' +
      '<div class="ak-kennzahl"><div class="v">' + abschluesse + '</div><div class="k">Abschlüsse in 7 Tagen</div></div></div>';

    if (wartend.length) {
      html += '<section class="ak-karte ak-warteliste" style="margin-bottom:22px"><div class="ak-karte-kopf"><h2>Neue Registrierungen</h2></div><div class="ak-liste">' +
        wartend.map(function (z) {
          return '<div class="ak-eintrag"><span class="ak-avatar">' + esc(initialen(z.p)) + '</span><div class="txt"><strong>' + esc(name(z.p)) + '</strong>' +
            '<p>' + esc(z.p.email) + (z.p.telefon ? ' · ' + esc(z.p.telefon) : '') + (z.p.region ? ' · ' + esc(z.p.region) : '') + '</p>' +
            '<div class="meta"><span>registriert ' + relativ(z.p.erstellt_am) + '</span></div></div>' +
            '<div class="ak-knoepfe"><button class="btn btn-primary btn-sm" type="button" data-aktion="status" data-id="' + esc(z.p.id) + '" data-wert="aktiv">Freischalten</button>' +
            '<button class="btn btn-ghost btn-sm ak-gefahr" type="button" data-aktion="status" data-id="' + esc(z.p.id) + '" data-wert="gesperrt">Ablehnen</button></div></div>';
        }).join('') + '</div></section>';
    }

    html += '<div class="ak-werkzeug"><input class="input" type="search" placeholder="Name, E-Mail oder Region suchen" data-tabelle="suche" value="' + esc(tabelle.suche) + '" aria-label="Partner suchen">' +
      '<select class="select" data-tabelle="status" aria-label="Status">' + [['alle', 'Alle Status'], ['aktiv', 'Aktiv'], ['wartend', 'Wartend'], ['gesperrt', 'Gesperrt']].map(function (x) {
        return '<option value="' + x[0] + '"' + (tabelle.status === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select>' +
      '<select class="select" data-tabelle="sort" aria-label="Sortierung">' + [['neu', 'Neueste zuerst'], ['name', 'Name'], ['stand', 'Ausbildungsstand'], ['aktiv', 'Letzte Aktivität']].map(function (x) {
        return '<option value="' + x[0] + '"' + (tabelle.sort === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select></div><div id="ak-tabelle"></div>';
    setzen(html);
    tabelleZeichnen();
  }

  function tabelleZeichnen() {
    var ziel = document.getElementById('ak-tabelle');
    if (!ziel) return;
    var q = tabelle.suche.toLowerCase();
    var z = partnerZeilen().filter(function (x) {
      if (tabelle.status !== 'alle' && x.p.status !== tabelle.status) return false;
      return !q || [name(x.p), x.p.email, x.p.region].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    z.sort({
      neu: function (a, b) { return b.p.erstellt_am.localeCompare(a.p.erstellt_am); },
      name: function (a, b) { return name(a.p).localeCompare(name(b.p), 'de'); },
      stand: function (a, b) { return b.g.prozent - a.g.prozent; },
      aktiv: function (a, b) { return (b.letzte || '').localeCompare(a.letzte || ''); }
    }[tabelle.sort]);
    if (!z.length) { ziel.innerHTML = '<p class="ak-leer">Keine Partner gefunden.</p>'; return; }
    ziel.innerHTML = '<div class="ak-tabelle-rahmen"><table class="ak-tabelle"><thead><tr>' +
      '<th>Partner</th><th>Region</th><th>Stufe</th><th>Fortschritt</th><th>Starter · Fortg. · Profi</th><th>Wochenschulungen</th><th>Zuletzt aktiv</th><th>Status</th></tr></thead><tbody>' +
      z.map(function (x) {
        var st = { aktiv: '<span class="ak-tag ok">Aktiv</span>', wartend: '<span class="ak-tag warn">Wartend</span>', gesperrt: '<span class="ak-tag err">Gesperrt</span>' }[x.p.status];
        return '<tr class="klickbar" data-aktion="partner" data-id="' + esc(x.p.id) + '" tabindex="0">' +
          '<td class="name"><strong>' + esc(name(x.p)) + '</strong><small>' + esc(x.p.email) + '</small></td>' +
          '<td>' + esc(x.p.region || '–') + '</td>' +
          '<td class="nowrap">' + esc(x.g.aktuell) + '</td>' +
          '<td><div class="row gap-8" style="flex-wrap:nowrap">' + balken(x.g.prozent, x.g.prozent === 100) + '<span class="zahlen">' + x.g.prozent + ' %</span></div></td>' +
          '<td><div class="ak-stufen-zellen" title="' + x.g.stufen.map(function (s) { return s.stufe.name + ': ' + s.fertig + '/' + s.gesamt; }).join(', ') + '">' +
          x.g.stufen.map(function (s) { return '<i class="' + (s.gesamt && s.fertig === s.gesamt ? 'voll' : '') + '"><b style="width:' + s.prozent + '%"></b></i>'; }).join('') + '</div></td>' +
          '<td class="zahlen">' + x.wochen + '</td>' +
          '<td class="zahlen">' + relativ(x.letzte) + '</td>' +
          '<td>' + st + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function vPartner(id) {
    var p = S.profile.filter(function (x) { return x.id === id; })[0];
    if (!p) return vNichtGefunden();
    var g = gesamtStand(p.id);
    var eigene = {};
    S.alleF.forEach(function (f) { if (f.nutzer_id === p.id) eigene[f.inhalt_id] = f; });
    var wochen = S.beitraege.filter(function (b) { return b.art === 'woche'; });
    var zusagen = kommendeTermine().filter(function (b) {
      return S.zusagen.some(function (z) { return z.beitrag_id === b.id && z.nutzer_id === p.id; });
    });
    function statusZelle(f) {
      if (!f) return '<span class="ak-tag">Offen</span>';
      if (f.abgeschlossen_am) return '<span class="ak-tag ok">Erledigt</span>';
      return '<span class="ak-tag warn">' + f.prozent + ' %</span>';
    }
    var html = '<a class="ak-zurueck" href="#/admin">' + ico('links') + 'Alle Partner</a>' +
      '<div class="ak-kopf"><div class="row gap-16" style="flex-wrap:nowrap"><span class="ak-avatar" style="width:54px;height:54px;font-size:1.1rem">' + esc(initialen(p)) + '</span>' +
      '<div><h1 style="margin:0">' + esc(name(p)) + '</h1><p style="margin-top:2px">' + esc(g.aktuell === 'Abgeschlossen' ? 'Alle Stufen abgeschlossen' : 'Aktuelle Stufe: ' + g.aktuell) + ' · ' + g.prozent + ' % gesamt</p></div></div>' +
      '<div class="ak-knoepfe" style="margin:0">' +
      (p.status !== 'aktiv' ? '<button class="btn btn-primary btn-sm" type="button" data-aktion="status" data-id="' + esc(p.id) + '" data-wert="aktiv">Freischalten</button>' : '') +
      (p.status !== 'gesperrt' ? '<button class="btn btn-ghost btn-sm ak-gefahr" type="button" data-aktion="status" data-id="' + esc(p.id) + '" data-wert="gesperrt">Sperren</button>' : '') +
      '</div></div>' +
      '<div class="ak-raster"><div class="ak-spalte">';
    g.stufen.forEach(function (s) {
      var ls = lektionenDer(s.stufe.id);
      html += '<section class="ak-karte"><div class="ak-karte-kopf"><h2>' + s.stufe.name + '</h2><span class="zahlen small">' + s.fertig + ' / ' + s.gesamt + '</span></div>' +
        (ls.length ? '<div class="ak-tabelle-rahmen"><table class="ak-tabelle"><thead><tr><th>Lektion</th><th>Status</th><th>Begonnen</th><th>Abgeschlossen</th></tr></thead><tbody>' +
          ls.map(function (l) {
            var f = eigene[l.id];
            return '<tr><td>' + esc(l.titel) + '</td><td>' + statusZelle(f) + '</td><td class="zahlen">' + (f ? datum(f.begonnen_am, true) : '–') +
              '</td><td class="zahlen">' + (f && f.abgeschlossen_am ? datum(f.abgeschlossen_am, true) : '–') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<p class="ak-leer">Keine Lektionen.</p>') + '</section>';
    });
    html += '<section class="ak-karte"><div class="ak-karte-kopf"><h2>Wochenschulungen</h2></div>' +
      (wochen.length ? '<div class="ak-tabelle-rahmen"><table class="ak-tabelle"><thead><tr><th>Video</th><th>Status</th><th>Gesehen am</th></tr></thead><tbody>' +
        wochen.map(function (b) {
          var f = eigene[b.id];
          return '<tr><td>' + esc(b.titel) + '</td><td>' + statusZelle(f) + '</td><td class="zahlen">' + (f && f.abgeschlossen_am ? datum(f.abgeschlossen_am, true) : '–') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="ak-leer">Noch keine Wochenschulungen.</p>') + '</section>';

    html += '</div><div class="ak-spalte"><section class="ak-karte"><h2>Kontakt</h2><dl class="ak-info-liste mt-16">' +
      '<div><dt>E-Mail</dt><dd><a class="ak-link" href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></dd></div>' +
      '<div><dt>Telefon</dt><dd>' + (p.telefon ? '<a class="ak-link" href="tel:' + esc(p.telefon.replace(/[^\d+]/g, '')) + '">' + esc(p.telefon) + '</a>' : '–') + '</dd></div>' +
      '<div><dt>Region</dt><dd>' + esc(p.region || '–') + '</dd></div>' +
      '<div><dt>Registriert</dt><dd>' + datum(p.erstellt_am) + '</dd></div>' +
      '<div><dt>Zuletzt aktiv</dt><dd>' + relativ(partnerZeilen().filter(function (z) { return z.p.id === p.id; })[0].letzte) + '</dd></div>' +
      '<div><dt>Status</dt><dd>' + esc(p.status) + '</dd></div></dl></section>' +
      '<section class="ak-karte"><h2>Zusagen zu Terminen</h2>' +
      (zusagen.length ? '<ul class="ak-punkte">' + zusagen.map(function (b) { return '<li>' + ico('kalender') + '<span>' + esc(b.titel) + '<br><small class="muted">' + esc(terminText(b)) + '</small></span></li>'; }).join('') + '</ul>'
        : '<p class="ak-leer mt-8">Keine Zusagen zu anstehenden Terminen.</p>') + '</section></div></div>';
    setzen(html);
  }

  function vInhalte() {
    var html = '<div class="ak-kopf"><div><span class="eyebrow">Admin</span><h1>Inhalte pflegen</h1>' +
      '<p>Lektionen des Ausbildungsplans sowie Wochenschulungen, Ansagen und Termine.</p></div>' +
      '<div class="ak-knoepfe" style="margin:0"><a class="btn btn-primary btn-sm" href="#/admin/beitrag/neu?art=woche">' + ico('plus') + 'Wochenschulung</a>' +
      '<a class="btn btn-ghost btn-sm" href="#/admin/beitrag/neu?art=ansage">' + ico('plus') + 'Ansage</a>' +
      '<a class="btn btn-ghost btn-sm" href="#/admin/beitrag/neu?art=termin">' + ico('plus') + 'Termin</a></div></div>';
    var aktive = S.profile.filter(function (p) { return p.rolle !== 'admin' && p.status === 'aktiv'; });
    function gesehenVon(id) { return S.alleF.filter(function (f) { return f.inhalt_id === id && f.abgeschlossen_am && f.nutzer_id !== S.profil.id; }).length; }

    html += '<section class="ak-karte"><div class="ak-karte-kopf"><h2>Beiträge</h2></div>' +
      (S.beitraege.length ? '<div class="ak-tabelle-rahmen"><table class="ak-tabelle"><thead><tr><th>Titel</th><th>Art</th><th>Datum</th><th>Reichweite</th><th></th></tr></thead><tbody>' +
        S.beitraege.map(function (b) {
          var reich = b.art === 'termin' ? S.zusagen.filter(function (z) { return z.beitrag_id === b.id; }).length + ' Zusagen'
            : b.art === 'woche' ? gesehenVon(b.id) + ' / ' + aktive.length + ' gesehen' : '–';
          return '<tr><td><strong>' + esc(b.titel) + '</strong>' + (!b.veroeffentlicht ? ' <span class="ak-tag warn">Entwurf</span>' : '') + (b.angeheftet ? ' <span class="ak-tag">Angeheftet</span>' : '') + '</td>' +
            '<td><span class="ak-tag ' + b.art + '">' + ARTEN[b.art] + '</span></td>' +
            '<td class="zahlen">' + (b.art === 'termin' && b.termin_am ? datum(b.termin_am, true) : datum(b.erstellt_am)) + '</td>' +
            '<td class="zahlen">' + reich + '</td>' +
            '<td class="nowrap"><a class="btn btn-ghost btn-sm" href="#/admin/beitrag/' + esc(b.id) + '">Bearbeiten</a></td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="ak-leer">Noch keine Beiträge.</p>') + '</section>';

    STUFEN.forEach(function (s) {
      var ls = S.lektionen.filter(function (l) { return l.stufe === s.id; }).sort(function (a, b) { return a.reihenfolge - b.reihenfolge; });
      html += '<section class="ak-karte mt-24"><div class="ak-karte-kopf"><h2>Lektionen · ' + s.name + '</h2>' +
        '<a href="#/admin/lektion/neu?stufe=' + s.id + '">+ Neue Lektion</a></div>' +
        (ls.length ? '<div class="ak-tabelle-rahmen"><table class="ak-tabelle"><thead><tr><th>Nr.</th><th>Titel</th><th>Video</th><th>Abgeschlossen von</th><th></th></tr></thead><tbody>' +
          ls.map(function (l) {
            var info = V.erkennen(l.video_url);
            return '<tr><td class="zahlen">' + l.reihenfolge + '</td><td><strong>' + esc(l.titel) + '</strong>' + (!l.veroeffentlicht ? ' <span class="ak-tag warn">Entwurf</span>' : '') + '</td>' +
              '<td>' + (info ? '<span class="ak-tag ok">' + { speicher: 'Hochgeladen', youtube: 'YouTube', vimeo: 'Vimeo', datei: 'Datei', demo: 'Beispiel' }[info.typ] + '</span>' : '<span class="ak-tag warn">fehlt</span>') + '</td>' +
              '<td class="zahlen">' + gesehenVon(l.id) + ' / ' + aktive.length + '</td>' +
              '<td class="nowrap"><a class="btn btn-ghost btn-sm" href="#/admin/lektion/' + esc(l.id) + '">Bearbeiten</a></td></tr>';
          }).join('') + '</tbody></table></div>' : '<p class="ak-leer">Noch keine Lektionen in dieser Stufe.</p>') + '</section>';
    });
    setzen(html);
  }

  function parameter(n) { var m = location.hash.match(new RegExp('[?&]' + n + '=([^&]+)')); return m ? decodeURIComponent(m[1]) : ''; }

  function speicherName(url) {
    return String(url).replace(/^speicher:/, '').split('/').pop().replace(/^[0-9a-f]{8}-/, '');
  }

  /* Video hochladen oder alternativ einen Link angeben */
  function videoFeld(url) {
    var hoch = String(url || '').indexOf('speicher:') === 0;
    return '<div class="field"><label for="video_datei">Video</label>' +
      '<div class="ak-upload"><input type="file" id="video_datei" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" hidden>' +
      '<input type="hidden" name="video_pfad" id="video_pfad" value="' + (hoch ? esc(url.slice(9)) : '') + '">' +
      '<button class="btn btn-outline btn-sm" type="button" data-aktion="video-waehlen">' + ico('laden').replace('M12 3v12M7 10l5 5 5-5', 'M12 15V3M7 8l5-5 5 5') + (hoch ? 'Anderes Video hochladen' : 'Video hochladen') + '</button>' +
      '<span class="info" id="video_info">' + (hoch ? '<strong>Hochgeladen:</strong> ' + esc(speicherName(url)) : 'MP4 vom Handy oder Computer. Liegt privat bei uns und ist nur für freigeschaltete Partner abspielbar.') + '</span>' +
      (hoch ? '<button class="btn btn-ghost btn-sm ak-gefahr" type="button" data-aktion="video-entfernen">Entfernen</button>' : '') +
      '<div class="ak-balken" id="video_balken" hidden><i style="width:0%"></i></div></div></div>' +
      '<div class="field" id="video_link_feld"' + (hoch ? ' hidden' : '') + '><label for="video_url"><span class="ak-oder">oder</span> Link zu YouTube oder Vimeo</label>' +
      '<input class="input" id="video_url" name="video_url" type="url" placeholder="https://youtu.be/…" value="' + (hoch ? '' : esc(url)) + '">' +
      '<span class="hilfe">Externe Links lassen sich weitergeben. Für interne Schulungen besser hochladen.</span></div>';
  }
  function videoAusFormular(w) { return w.video_pfad ? 'speicher:' + w.video_pfad : (w.video_url || ''); }

  var hochladenLaeuft = false;
  async function videoHochladen(eingabe) {
    var datei = eingabe.files && eingabe.files[0];
    eingabe.value = '';
    if (!datei) return;
    if (!/^video\//.test(datei.type) && !/\.(mp4|mov|m4v|webm)$/i.test(datei.name)) { toast('Bitte eine Videodatei wählen (am besten MP4).', true); return; }
    var form = eingabe.closest('form');
    var info = document.getElementById('video_info');
    var balken = document.getElementById('video_balken');
    var knopf = form.querySelector('[type=submit]');
    var mb = (datei.size / 1048576).toFixed(0);
    hochladenLaeuft = true; knopf.disabled = true; balken.hidden = false;
    info.innerHTML = '<strong>Lädt hoch …</strong> ' + esc(datei.name) + ' (' + mb + ' MB). Bitte das Fenster offen lassen.';
    try {
      var pfad = await D.videoHochladen(datei, function (anteil) {
        balken.firstChild.style.width = Math.round(anteil * 100) + '%';
        info.innerHTML = '<strong>Lädt hoch … ' + Math.round(anteil * 100) + ' %</strong> ' + esc(datei.name) + ' (' + mb + ' MB)';
      });
      if (!document.body.contains(form)) { D.videoLoeschen(pfad).catch(function () {}); toast('Hochladen abgebrochen: Das Formular wurde verlassen.', true); return; }
      var alt = document.getElementById('video_pfad').value;
      if (alt && alt !== form.getAttribute('data-video-alt')) D.videoLoeschen(alt).catch(function () {});
      document.getElementById('video_pfad').value = pfad;
      document.getElementById('video_url').value = '';
      document.getElementById('video_link_feld').hidden = true;
      info.innerHTML = '<strong>Fertig hochgeladen:</strong> ' + esc(datei.name) + '. Jetzt noch speichern.';
      toast('Video hochgeladen. Bitte noch speichern.');
    } catch (e) {
      balken.hidden = true;
      info.innerHTML = '<strong class="ak-gefahr">Hochladen fehlgeschlagen.</strong> ' + esc(e && e.anzeigen ? e.message : 'Bitte noch einmal versuchen.');
    } finally { hochladenLaeuft = false; knopf.disabled = false; }
  }

  /* Nach dem Speichern: ersetztes oder entferntes Video aus dem Speicher löschen */
  function altesVideoAufraeumen(alt, neu) {
    if (alt && alt.indexOf('speicher:') === 0 && alt !== neu) D.videoLoeschen(alt.slice(9)).catch(function () {});
  }

  function vLektionBearbeiten(id) {
    var neu = id === 'neu';
    var l = neu ? { stufe: parameter('stufe') || 'starter', reihenfolge: lektionenDer(parameter('stufe') || 'starter').length + 1, titel: '', beschreibung: '', inhalt: '', video_url: '', dauer_min: '', veroeffentlicht: true }
      : S.lektionen.filter(function (x) { return x.id === id; })[0];
    if (!l) return vNichtGefunden();
    setzen('<a class="ak-zurueck" href="#/admin/inhalte">' + ico('links') + 'Alle Inhalte</a>' +
      '<div class="ak-kopf"><div><span class="eyebrow">Lektion</span><h1>' + (neu ? 'Neue Lektion' : 'Lektion bearbeiten') + '</h1></div></div>' +
      '<section class="ak-karte" style="max-width:820px"><form class="ak-formular" data-form="lektion" data-id="' + (neu ? '' : esc(l.id)) + '" data-video-alt="' + esc(String(l.video_url || '').replace(/^speicher:/, '')) + '" novalidate>' +
      '<div class="zeile3"><div class="field"><label for="stufe">Stufe</label><select class="select" id="stufe" name="stufe">' +
      STUFEN.map(function (s) { return '<option value="' + s.id + '"' + (l.stufe === s.id ? ' selected' : '') + '>' + s.name + '</option>'; }).join('') + '</select></div>' +
      feld('reihenfolge', 'Reihenfolge', 'number', 'min="1" value="' + esc(l.reihenfolge) + '"') +
      feld('dauer_min', 'Dauer in Minuten', 'number', 'min="0" value="' + esc(l.dauer_min) + '"') + '</div>' +
      feld('titel', 'Titel', 'text', 'required value="' + esc(l.titel) + '"') +
      '<div class="field"><label for="beschreibung">Kurzbeschreibung</label><textarea class="textarea" id="beschreibung" name="beschreibung" style="min-height:80px">' + esc(l.beschreibung) + '</textarea></div>' +
      videoFeld(l.video_url) +
      '<div class="field"><label for="inhalt">Das lernst du (ein Punkt je Zeile)</label><textarea class="textarea" id="inhalt" name="inhalt">' + esc(l.inhalt) + '</textarea></div>' +
      '<label class="ak-schalter"><input type="checkbox" name="veroeffentlicht"' + (l.veroeffentlicht ? ' checked' : '') + '> Veröffentlicht (für Partner sichtbar)</label>' +
      '<div class="form-msg err" role="alert"></div>' +
      '<div class="ak-knoepfe"><button class="btn btn-primary" type="submit">Speichern</button>' +
      (neu ? '' : '<a class="btn btn-ghost" href="#/lektion/' + esc(l.id) + '">Ansehen</a><button class="btn btn-ghost ak-gefahr" type="button" data-aktion="lektion-loeschen" data-id="' + esc(l.id) + '">Löschen</button>') +
      '</div></form></section>');
  }

  function vBeitragBearbeiten(id) {
    var neu = id === 'neu';
    var b = neu ? { art: parameter('art') || 'woche', titel: '', text: '', video_url: '', termin_am: null, termin_dauer_min: 60, meeting_link: '', angeheftet: false, veroeffentlicht: true }
      : S.beitraege.filter(function (x) { return x.id === id; })[0];
    if (!b) return vNichtGefunden();
    setzen('<a class="ak-zurueck" href="#/admin/inhalte">' + ico('links') + 'Alle Inhalte</a>' +
      '<div class="ak-kopf"><div><span class="eyebrow">Beitrag</span><h1>' + (neu ? 'Neuer Beitrag' : 'Beitrag bearbeiten') + '</h1>' +
      '<p>Neue Beiträge erscheinen bei allen Partnern unter Neuigkeiten mit dem Hinweis „Neu“.</p></div></div>' +
      '<section class="ak-karte" style="max-width:820px"><form class="ak-formular" data-form="beitrag" data-id="' + (neu ? '' : esc(b.id)) + '" data-video-alt="' + esc(String(b.video_url || '').replace(/^speicher:/, '')) + '" novalidate>' +
      '<div class="field"><label for="art">Art</label><select class="select" id="art" name="art" data-aktion-change="art">' +
      Object.keys(ARTEN).map(function (k) { return '<option value="' + k + '"' + (b.art === k ? ' selected' : '') + '>' + ARTEN[k] + '</option>'; }).join('') + '</select></div>' +
      feld('titel', 'Titel', 'text', 'required value="' + esc(b.titel) + '" placeholder="' + ({ woche: 'z. B. Wochenschulung KW 45: Einwandbehandlung', ansage: 'z. B. Neue Gebiete freigegeben', termin: 'z. B. Teams-Meeting: Wochenstart' }[b.art]) + '"') +
      '<div class="field"><label for="text">Text</label><textarea class="textarea" id="text" name="text">' + esc(b.text) + '</textarea></div>' +
      '<div data-nur="woche ansage" class="ak-formular">' + videoFeld(b.video_url) + '</div>' +
      '<div class="zeile3" data-nur="termin"><div class="field" style="grid-column:span 2"><label for="termin_am">Datum und Uhrzeit</label><input class="input" id="termin_am" name="termin_am" type="datetime-local" value="' + esc(fuerEingabe(b.termin_am)) + '"></div>' +
      feld('termin_dauer_min', 'Dauer (Min.)', 'number', 'min="5" value="' + esc(b.termin_dauer_min || 60) + '"') + '</div>' +
      '<div class="field" data-nur="termin"><label for="meeting_link">Link zum Meeting (Teams, Zoom …)</label><input class="input" id="meeting_link" name="meeting_link" type="url" placeholder="https://teams.microsoft.com/l/meetup-join/…" value="' + esc(b.meeting_link) + '"></div>' +
      '<label class="ak-schalter"><input type="checkbox" name="angeheftet"' + (b.angeheftet ? ' checked' : '') + '> Oben anheften</label>' +
      '<label class="ak-schalter"><input type="checkbox" name="veroeffentlicht"' + (b.veroeffentlicht ? ' checked' : '') + '> Veröffentlicht (für Partner sichtbar)</label>' +
      '<div class="form-msg err" role="alert"></div>' +
      '<div class="ak-knoepfe"><button class="btn btn-primary" type="submit">' + (neu ? 'Veröffentlichen' : 'Speichern') + '</button>' +
      (neu ? '' : '<a class="btn btn-ghost" href="#/beitrag/' + esc(b.id) + '">Ansehen</a><button class="btn btn-ghost ak-gefahr" type="button" data-aktion="beitrag-loeschen" data-id="' + esc(b.id) + '">Löschen</button>') +
      '</div></form></section>');
    artFelder(b.art);
  }

  function artFelder(art) {
    Array.prototype.forEach.call(main.querySelectorAll('[data-nur]'), function (el) {
      el.hidden = el.getAttribute('data-nur').split(' ').indexOf(art) === -1;
    });
  }

  function vMeldungen() {
    var sym = { registrierung: 'nutzer', abgeschlossen: 'haken', stufe: 'stern' };
    var kannDesktop = window.Notification && Notification.permission === 'default';
    setzen('<div class="ak-kopf"><div><span class="eyebrow">Admin</span><h1>Meldungen</h1>' +
      '<p>Neue Registrierungen und abgeschlossene Videos. Per E-Mail kommen sie, sobald der Mail-Versand eingerichtet ist (siehe Anleitung).</p></div>' +
      (kannDesktop ? '<button class="btn btn-ghost btn-sm" type="button" data-aktion="desktop">' + ico('glocke') + 'Desktop-Hinweise einschalten</button>' : '') + '</div>' +
      '<section class="ak-karte">' + (S.meldungen.length ? S.meldungen.map(function (m) {
        var p = S.profile.filter(function (x) { return x.id === m.nutzer_id; })[0];
        return '<div class="ak-meldung' + (m.gelesen ? '' : ' ungelesen') + '"><span class="ak-symbol ' + (m.art === 'abgeschlossen' ? 'fertig' : m.art === 'stufe' ? 'gold' : 'laeuft') + '">' + ico(sym[m.art] || 'glocke') + '</span>' +
          '<div class="txt">' + (p ? '<a href="#/admin/partner/' + esc(p.id) + '">' + esc(m.text) + '</a>' : esc(m.text)) + '<small>' + relativ(m.erstellt_am) + ' · ' + datum(m.erstellt_am, true) + '</small></div></div>';
      }).join('') : '<p class="ak-leer">Noch keine Meldungen.</p>') + '</section>');
    if (ungeleseneMeldungen()) {
      D.meldungenGelesen().then(function () {
        S.meldungen.forEach(function (m) { m.gelesen = true; });
        navZeichnen();
      }).catch(function () { /* egal */ });
    }
  }

  /* =======================================================================
     Router
     ======================================================================= */
  var OFFEN = ['anmelden', 'registrieren', 'passwort-vergessen', 'neues-passwort'];

  function zeigen() {
    var p = pfad();
    var h = p[0] || '';
    navZeichnen();
    kontoZeichnen();

    if (!S.profil) {
      if (h === 'registrieren') vRegistrieren();
      else if (h === 'passwort-vergessen') vPasswortVergessen();
      else if (h === 'neues-passwort') vNeuesPasswort();
      else { if (h !== 'anmelden') { history.replaceState(null, '', '#/anmelden'); } vAnmelden(); }
      fokus();
      return;
    }
    if (h === 'neues-passwort') { vNeuesPasswort(); fokus(); return; }
    if (OFFEN.indexOf(h) !== -1) { history.replaceState(null, '', '#/'); h = ''; p = []; navZeichnen(); }
    if (S.profil.status !== 'aktiv') { if (h === 'profil') vProfil(); else vZustand(); fokus(); return; }

    if (h === 'admin' && !istAdmin()) { geheZu(''); return; }
    switch (h) {
      case '': vUebersicht(); break;
      case 'lektionen': vLektionen(); break;
      case 'lektion': vLektion(p[1]); break;
      case 'neuigkeiten': vNeuigkeiten(); navZeichnen(); break;
      case 'beitrag': vBeitrag(p[1]); break;
      case 'profil': vProfil(); break;
      case 'admin':
        if (!p[1]) vAdmin();
        else if (p[1] === 'partner') vPartner(p[2]);
        else if (p[1] === 'inhalte') vInhalte();
        else if (p[1] === 'lektion') vLektionBearbeiten(p[2]);
        else if (p[1] === 'beitrag') vBeitragBearbeiten(p[2]);
        else if (p[1] === 'meldungen') vMeldungen();
        else vNichtGefunden();
        break;
      default: vNichtGefunden();
    }
    fokus();
  }

  var ersterAufruf = true;
  function fokus() {
    if (ersterAufruf) { ersterAufruf = false; return; }
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  async function anmeldungAbschliessen() {
    S.profil = await D.profil();
    if (!S.profil) throw Object.assign(new Error('Dein Profil wurde nicht gefunden. Bitte wende dich an die Vertriebsleitung.'), { anzeigen: true });
    if (S.profil.status === 'aktiv') await ladeAlles();
    clearInterval(abfrage);
    if (istAdmin()) abfrage = setInterval(meldungenAbfragen, 60000);
  }

  /* =======================================================================
     Formulare
     ======================================================================= */
  function werte(form) {
    var o = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      o[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
    });
    return o;
  }
  function formFehler(form, text) {
    var m = form.querySelector('.form-msg');
    if (m) { m.textContent = text; m.classList.add('is-visible'); }
  }
  function pflicht(form, namen) {
    var leer = namen.filter(function (n) { return !form.elements[n].value.trim(); });
    namen.forEach(function (n) { form.elements[n].closest('.field').classList.toggle('has-error', leer.indexOf(n) !== -1); });
    if (leer.length) { form.elements[leer[0]].focus(); return false; }
    return true;
  }
  function emailOk(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  var FORMULARE = {
    anmelden: async function (form, w) {
      if (!pflicht(form, ['email', 'passwort'])) return formFehler(form, 'Bitte E-Mail-Adresse und Passwort eingeben.');
      await D.anmelden(w.email, w.passwort);
      await anmeldungAbschliessen();
      location.hash = '#/';
      zeigen();
    },
    registrieren: async function (form, w) {
      if (!pflicht(form, ['vorname', 'nachname', 'email', 'passwort', 'passwort2'])) return formFehler(form, 'Bitte fülle alle Pflichtfelder aus.');
      if (!emailOk(w.email)) return formFehler(form, 'Bitte gib eine gültige E-Mail-Adresse ein.');
      if (w.passwort.length < 8) return formFehler(form, 'Das Passwort muss mindestens 8 Zeichen haben.');
      if (w.passwort !== w.passwort2) return formFehler(form, 'Die beiden Passwörter stimmen nicht überein.');
      if (!w.einwilligung) return formFehler(form, 'Bitte stimme der Speicherung deines Lernfortschritts zu.');
      var r = await D.registrieren(w);
      if (r.bestaetigen) {
        history.replaceState(null, '', '#/anmelden');
        vAnmelden('<strong>Fast fertig:</strong> Wir haben dir eine E-Mail an ' + esc(w.email) + ' geschickt. Bitte klicke auf den Link darin, um deine Adresse zu bestätigen. Danach kannst du dich hier anmelden.');
        return;
      }
      await anmeldungAbschliessen();
      location.hash = '#/';
      zeigen();
    },
    vergessen: async function (form, w) {
      if (!emailOk(w.email)) return formFehler(form, 'Bitte gib eine gültige E-Mail-Adresse ein.');
      await D.passwortVergessen(w.email);
      history.replaceState(null, '', '#/anmelden');
      vAnmelden(D.modus === 'demo' ? 'Im Demo-Modus werden keine E-Mails verschickt.'
        : 'Falls es ein Konto mit dieser Adresse gibt, ist der Link unterwegs. Schau auch im Spam-Ordner nach.');
    },
    'neues-passwort': async function (form, w) {
      if (w.passwort.length < 8) return formFehler(form, 'Das Passwort muss mindestens 8 Zeichen haben.');
      if (w.passwort !== w.passwort2) return formFehler(form, 'Die beiden Passwörter stimmen nicht überein.');
      await D.neuesPasswort(w.passwort);
      toast('Neues Passwort gespeichert.');
      form.reset();
      if (pfad()[0] === 'neues-passwort') { location.hash = '#/'; }
    },
    profil: async function (form, w) {
      if (!pflicht(form, ['vorname', 'nachname'])) return formFehler(form, 'Vor- und Nachname dürfen nicht leer sein.');
      var r = await D.profilSpeichern(S.profil.id, { vorname: w.vorname, nachname: w.nachname, telefon: w.telefon, region: w.region });
      if (r && r[0]) S.profil = r[0];
      kontoZeichnen();
      toast('Gespeichert.');
    },
    lektion: async function (form, w) {
      if (!pflicht(form, ['titel'])) return formFehler(form, 'Bitte gib einen Titel ein.');
      if (hochladenLaeuft) return formFehler(form, 'Bitte warten, bis das Video fertig hochgeladen ist.');
      if (w.video_url && !w.video_pfad && !V.erkennen(w.video_url)) return formFehler(form, 'Der Link wird nicht erkannt. Möglich sind YouTube, Vimeo oder ein direkter Link auf eine MP4-Datei – nur bei diesen lässt sich messen, ob das Video komplett gesehen wurde.');
      if (w.veroeffentlicht && !w.video_pfad && !w.video_url) return formFehler(form, 'Eine veröffentlichte Lektion braucht ein Video, sonst kann sie niemand abschließen. Lade ein Video hoch oder speichere die Lektion als Entwurf (Haken bei „Veröffentlicht“ entfernen).');
      var d = { stufe: w.stufe, reihenfolge: parseInt(w.reihenfolge, 10) || 1, titel: w.titel, beschreibung: w.beschreibung,
                inhalt: w.inhalt, video_url: videoAusFormular(w), dauer_min: parseInt(w.dauer_min, 10) || 0, veroeffentlicht: w.veroeffentlicht };
      var vorher = null;
      if (form.getAttribute('data-id')) { d.id = form.getAttribute('data-id'); vorher = S.lektionen.filter(function (x) { return x.id === d.id; })[0]; }
      await D.lektionSpeichern(d);
      if (vorher) altesVideoAufraeumen(vorher.video_url, d.video_url);
      S.lektionen = await D.lektionen();
      toast('Lektion gespeichert.');
      geheZu('admin/inhalte');
    },
    beitrag: async function (form, w) {
      if (!pflicht(form, ['titel'])) return formFehler(form, 'Bitte gib einen Titel ein.');
      if (w.art === 'termin' && !w.termin_am) return formFehler(form, 'Bitte Datum und Uhrzeit des Termins angeben.');
      if (hochladenLaeuft) return formFehler(form, 'Bitte warten, bis das Video fertig hochgeladen ist.');
      if (w.video_url && !w.video_pfad && w.art !== 'termin' && !V.erkennen(w.video_url)) return formFehler(form, 'Der Link wird nicht erkannt. Möglich sind YouTube, Vimeo oder ein direkter Link auf eine MP4-Datei.');
      if (w.meeting_link && w.art === 'termin' && !sicherUrl(w.meeting_link)) return formFehler(form, 'Der Meeting-Link muss mit https:// beginnen.');
      var d = { art: w.art, titel: w.titel, text: w.text, angeheftet: w.angeheftet, veroeffentlicht: w.veroeffentlicht,
                video_url: w.art === 'termin' ? '' : videoAusFormular(w),
                termin_am: w.art === 'termin' ? new Date(w.termin_am).toISOString() : null,
                termin_dauer_min: parseInt(w.termin_dauer_min, 10) || 60,
                meeting_link: w.art === 'termin' ? w.meeting_link : '' };
      var vorher = null;
      if (form.getAttribute('data-id')) { d.id = form.getAttribute('data-id'); vorher = S.beitraege.filter(function (x) { return x.id === d.id; })[0]; }
      await D.beitragSpeichern(d);
      if (vorher) altesVideoAufraeumen(vorher.video_url, d.video_url);
      S.beitraege = await D.beitraege();
      toast(d.id ? 'Beitrag gespeichert.' : 'Beitrag veröffentlicht.');
      geheZu('admin/inhalte');
    }
  };

  main.addEventListener('submit', async function (e) {
    var form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    var knopf = form.querySelector('[type=submit]');
    var m = form.querySelector('.form-msg');
    if (m) m.classList.remove('is-visible');
    knopf.disabled = true;
    try { await FORMULARE[form.getAttribute('data-form')](form, werte(form)); }
    catch (err) {
      console.error(err);
      if (document.body.contains(form)) formFehler(form, err && err.anzeigen ? err.message : 'Das hat nicht geklappt. Bitte versuche es noch einmal.');
      else fehlerZeigen(err);
    }
    finally { knopf.disabled = false; }
  });

  /* =======================================================================
     Klicks
     ======================================================================= */
  function icsLaden(b) {
    var f = function (d) { return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
    var x = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); };
    var ende = new Date(new Date(b.termin_am).getTime() + (b.termin_dauer_min || 60) * 60000);
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Solvera Sales//Akademie//DE', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + b.id + '@solvera-sales.com', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(b.termin_am), 'DTEND:' + f(ende),
      'SUMMARY:' + x(b.titel), 'DESCRIPTION:' + x(b.text + (b.meeting_link ? '\n\n' + b.meeting_link : '')),
      b.meeting_link ? 'LOCATION:' + x(b.meeting_link) : 'LOCATION:Online', b.meeting_link ? 'URL:' + b.meeting_link : '',
      'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:' + x(b.titel), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    herunterladen(ics, 'text/calendar', b.titel.replace(/[^\wäöüÄÖÜß -]/g, '').trim() + '.ics');
  }
  function herunterladen(inhalt, typ, datei) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([inhalt], { type: typ + ';charset=utf-8' }));
    a.download = datei;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function csvExport() {
    var q = function (s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; };
    var kopf = ['Vorname', 'Nachname', 'E-Mail', 'Telefon', 'Region', 'Status', 'Registriert', 'Zuletzt aktiv', 'Aktuelle Stufe',
                'Starter', 'Fortgeschritten', 'Profi', 'Gesamt %', 'Wochenschulungen gesehen'];
    var zeilen = partnerZeilen().map(function (z) {
      return [z.p.vorname, z.p.nachname, z.p.email, z.p.telefon, z.p.region, z.p.status, datum(z.p.erstellt_am), z.letzte ? datum(z.letzte, true) : '',
              z.g.aktuell].concat(z.g.stufen.map(function (s) { return s.fertig + '/' + s.gesamt; })).concat([z.g.prozent, z.wochen]);
    });
    var csv = '\ufeff' + [kopf].concat(zeilen).map(function (r) { return r.map(q).join(';'); }).join('\r\n');
    herunterladen(csv, 'text/csv', 'ausbildungsstand-' + new Date().toISOString().slice(0, 10) + '.csv');
  }

  var AKTIONEN = {
    'pw-zeigen': function (el) {
      var i = el.parentNode.querySelector('input');
      var zeigen = i.type === 'password';
      i.type = zeigen ? 'text' : 'password';
      el.textContent = zeigen ? 'Verbergen' : 'Zeigen';
    },
    'demo-login': async function (el) {
      await D.anmelden(el.getAttribute('data-wer') + '@demo.de', 'demo1234');
      await anmeldungAbschliessen();
      location.hash = el.getAttribute('data-wer') === 'admin' ? '#/admin' : '#/';
      zeigen();
    },
    'demo-reset': async function () {
      if (!confirm('Alle Demo-Daten in diesem Browser auf die Beispieldaten zurücksetzen?')) return;
      D.zuruecksetzen();
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('solvera-ak-') === 0) localStorage.removeItem(k); }); } catch (e) { /* egal */ }
      S.profil = null;
      location.hash = '#/anmelden';
      zeigen();
    },
    abmelden: async function () {
      await D.abmelden();
      clearInterval(abfrage);
      S.profil = null; S.geladen = false;
      location.hash = '#/anmelden';
      zeigen();
    },
    'neu-laden': async function () {
      await anmeldungAbschliessen();
      zeigen();
      if (S.profil.status !== 'aktiv') toast('Noch nicht freigeschaltet.');
    },
    filter: function (el) {
      var w = el.getAttribute('data-wert');
      history.replaceState(null, '', '#/neuigkeiten' + (w === 'alle' ? '' : '?filter=' + w));
      vNeuigkeiten();
    },
    zusage: async function (el) {
      var id = el.getAttribute('data-id');
      var an = !habeZugesagt(id);
      await D.zusageSetzen(S.profil.id, id, an);
      if (an) S.zusagen.push({ nutzer_id: S.profil.id, beitrag_id: id });
      else S.zusagen = S.zusagen.filter(function (z) { return !(z.nutzer_id === S.profil.id && z.beitrag_id === id); });
      toast(an ? 'Zugesagt – bis dann!' : 'Zusage zurückgezogen.');
      var y = window.scrollY; zeigen(); window.scrollTo(0, y);
    },
    ics: function (el) {
      var b = S.beitraege.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      if (b) icsLaden(b);
    },
    partner: function (el) { geheZu('admin/partner/' + el.getAttribute('data-id')); },
    status: async function (el) {
      var id = el.getAttribute('data-id'), wert = el.getAttribute('data-wert');
      var p = S.profile.filter(function (x) { return x.id === id; })[0];
      if (wert === 'gesperrt' && !confirm(name(p) + ' wirklich sperren? Der Zugang zur Akademie ist dann nicht mehr möglich.')) return;
      await D.profilStatus(id, wert);
      p.status = wert;
      toast(wert === 'aktiv' ? name(p) + ' ist freigeschaltet.' : name(p) + ' ist gesperrt.');
      zeigen();
    },
    csv: csvExport,
    'video-waehlen': function () { document.getElementById('video_datei').click(); },
    'video-entfernen': function (el) {
      document.getElementById('video_pfad').value = '';
      document.getElementById('video_link_feld').hidden = false;
      document.getElementById('video_info').innerHTML = 'Video wird beim Speichern entfernt.';
      el.remove();
    },
    desktop: function () {
      Notification.requestPermission().then(function (r) {
        toast(r === 'granted' ? 'Desktop-Hinweise sind an, solange die Akademie geöffnet ist.' : 'Desktop-Hinweise wurden nicht erlaubt.');
        zeigen();
      });
    },
    'lektion-loeschen': async function (el) {
      if (!confirm('Lektion wirklich löschen? Der Fortschritt aller Partner zu dieser Lektion geht verloren.')) return;
      var l = S.lektionen.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      await D.lektionLoeschen(el.getAttribute('data-id'));
      if (l) altesVideoAufraeumen(l.video_url, '');
      S.lektionen = await D.lektionen();
      toast('Lektion gelöscht.');
      geheZu('admin/inhalte');
    },
    'beitrag-loeschen': async function (el) {
      if (!confirm('Beitrag wirklich löschen?')) return;
      var b = S.beitraege.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      await D.beitragLoeschen(el.getAttribute('data-id'));
      if (b) altesVideoAufraeumen(b.video_url, '');
      S.beitraege = await D.beitraege();
      toast('Beitrag gelöscht.');
      geheZu('admin/inhalte');
    }
  };

  document.addEventListener('click', async function (e) {
    var el = e.target.closest('[data-aktion]');
    if (!el || !AKTIONEN[el.getAttribute('data-aktion')]) return;
    if (el.tagName === 'A') e.preventDefault();
    try { await AKTIONEN[el.getAttribute('data-aktion')](el); }
    catch (err) { fehlerZeigen(err); el.disabled = false; }
  });
  main.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('tr[data-aktion="partner"]')) AKTIONEN.partner(e.target);
  });
  main.addEventListener('input', function (e) {
    var t = e.target.getAttribute('data-tabelle');
    if (t) { tabelle[t] = e.target.value; tabelleZeichnen(); }
  });
  main.addEventListener('change', function (e) {
    var t = e.target.getAttribute('data-tabelle');
    if (t) { tabelle[t] = e.target.value; tabelleZeichnen(); }
    if (e.target.getAttribute('data-aktion-change') === 'art') artFelder(e.target.value);
    if (e.target.id === 'video_datei') videoHochladen(e.target);
  });

  window.addEventListener('hashchange', zeigen);
  window.addEventListener('beforeunload', function (e) { if (hochladenLaeuft) { e.preventDefault(); e.returnValue = ''; } });
  /* Beim Verlassen der Seite den letzten Stand des Videos noch senden */
  window.addEventListener('pagehide', function () { if (player) { player.zerstoeren(); player = null; } });

  /* =======================================================================
     Start
     ======================================================================= */
  (async function () {
    demoLeiste();
    try {
      var rueck = await D.start();
      if (rueck && rueck.fehler) {
        history.replaceState(null, '', '#/anmelden');
        S.profil = null; zeigen();
        vAnmelden('<strong>Der Link hat nicht funktioniert:</strong> ' + esc(rueck.fehler) + ' Bitte fordere einen neuen an.');
        return;
      }
      S.profil = await D.profil();
      if (S.profil) await anmeldungAbschliessen();
      if (rueck && rueck.art === 'recovery') history.replaceState(null, '', '#/neues-passwort');
      else if (rueck && rueck.art) { history.replaceState(null, '', '#/'); toast('E-Mail-Adresse bestätigt – willkommen!'); }
    } catch (e) {
      console.error(e);
      S.profil = null;
      toast(e && e.anzeigen ? e.message : 'Die Akademie konnte nicht geladen werden.', true);
    }
    zeigen();
  })();
})();
