/* =========================================================================
   Solvera Akademie – Videoplayer mit Fortschrittsmessung
   -------------------------------------------------------------------------
   Unterstützt:
     Speicher  selbst hochgeladene Videos im privaten Speicher der Akademie
               (Adresse "speicher:<pfad>"). Abspielbar nur angemeldet und
               freigeschaltet, über eine Adresse, die nach 3 Stunden verfällt.
               Name und E-Mail des Zuschauers laufen als Wasserzeichen mit.
     YouTube   (am besten „nicht gelistet“) – über die IFrame-API
     Vimeo     (auch private Links mit Hash) – über postMessage
     Datei     .mp4 / .webm / .mov direkt verlinkt – HTML5-Video
     Sonstige  beliebige Einbettungs-Adresse – ohne Messung

   Gemessen wird, welche Sekunden tatsächlich abgespielt wurden. Vorspulen
   zählt also nicht als gesehen. Die gesehenen Sekunden merkt sich der
   Browser, damit ein Video auch über mehrere Sitzungen hinweg fertig
   geschaut werden kann.
   ========================================================================= */
(function () {
  'use strict';

  function erkennen(url) {
    url = String(url || '').trim();
    if (!url) return null;
    if (url.indexOf('speicher:') === 0) return { typ: 'speicher', pfad: url.slice(9) };
    var m;
    if ((m = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/))) {
      return { typ: 'youtube', id: m[1] };
    }
    if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\da-f]+))?(?:.*[?&]h=([\da-f]+))?/))) {
      return { typ: 'vimeo', id: m[1], h: m[2] || m[3] || '' };
    }
    if (/^https?:\/\//i.test(url) && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)) return { typ: 'datei', url: url };
    if (/^https:\/\//i.test(url)) return { typ: 'einbettung', url: url };
    return null;
  }

  /* ---------- gesehene Sekunden ---------- */
  function Messung(schluessel, beiFortschritt) {
    var gesehen = {};
    var anzahl = 0;
    var dauer = 0;
    var zuletztGemeldet = 0;
    try {
      var alt = JSON.parse(localStorage.getItem(schluessel) || '[]');
      alt.forEach(function (s) { gesehen[s] = 1; });
      anzahl = alt.length;
    } catch (e) { /* egal */ }

    function sichern() {
      try { localStorage.setItem(schluessel, JSON.stringify(Object.keys(gesehen).map(Number))); } catch (e) { /* voll */ }
    }
    function prozent() { return dauer ? Math.min(100, anzahl / Math.floor(dauer) * 100) : 0; }

    return {
      zeit: function (sek, gesamt) {
        if (gesamt > 0) dauer = gesamt;
        var s = Math.floor(sek);
        if (s >= 0 && !gesehen[s]) { gesehen[s] = 1; anzahl++; }
        if (anzahl - zuletztGemeldet >= 10) this.melden();
      },
      melden: function () {
        if (!dauer) return;
        zuletztGemeldet = anzahl;
        sichern();
        beiFortschritt(prozent(), anzahl);
      },
      ende: function () { if (dauer) { this.melden(); } }
    };
  }

  /* ---------- YouTube ---------- */
  var ytWarteschlange = null;
  function ytLaden() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytWarteschlange) return ytWarteschlange;
    ytWarteschlange = new Promise(function (fertig, fehler) {
      var vorher = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (vorher) vorher(); fertig(); };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = fehler;
      document.head.appendChild(s);
    });
    return ytWarteschlange;
  }

  function youtube(ziel, info, messung) {
    var platz = document.createElement('div');
    ziel.appendChild(platz);
    var player = null, takt = null, weg = false;
    ytLaden().then(function () {
      if (weg) return;
      player = new window.YT.Player(platz, {
        videoId: info.id,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: function (e) {
            clearInterval(takt);
            if (e.data === 1) {
              takt = setInterval(function () {
                messung.zeit(player.getCurrentTime(), player.getDuration());
              }, 1000);
            } else {
              messung.ende();
            }
          }
        }
      });
    }).catch(function () {
      ziel.innerHTML = '<div class="ak-video-leer"><div><strong>Video konnte nicht geladen werden.</strong>' +
        '<a class="ak-link" href="https://youtu.be/' + info.id + '" target="_blank" rel="noopener">Auf YouTube öffnen</a></div></div>';
    });
    return function () { weg = true; clearInterval(takt); messung.ende(); if (player && player.destroy) player.destroy(); };
  }

  /* ---------- Vimeo ---------- */
  function vimeo(ziel, info, messung) {
    var f = document.createElement('iframe');
    f.src = 'https://player.vimeo.com/video/' + info.id + '?dnt=1&playsinline=1' + (info.h ? '&h=' + info.h : '');
    f.allow = 'autoplay; fullscreen; picture-in-picture';
    f.allowFullscreen = true;
    f.title = 'Schulungsvideo';
    ziel.appendChild(f);

    function senden(methode, wert) {
      f.contentWindow.postMessage(JSON.stringify({ method: methode, value: wert }), 'https://player.vimeo.com');
    }
    function empfang(e) {
      if (e.origin !== 'https://player.vimeo.com' || e.source !== f.contentWindow) return;
      var d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (x) { return; }
      if (!d) return;
      if (d.event === 'ready') { senden('addEventListener', 'timeupdate'); senden('addEventListener', 'pause'); senden('addEventListener', 'ended'); }
      if (d.event === 'timeupdate' && d.data) messung.zeit(d.data.seconds, d.data.duration);
      if (d.event === 'pause' || d.event === 'ended') messung.ende();
    }
    window.addEventListener('message', empfang);
    return function () { window.removeEventListener('message', empfang); messung.ende(); };
  }

  /* ---------- eigene Datei / privater Speicher ---------- */
  function geschuetzt(v) {
    v.controls = true; v.playsInline = true; v.preload = 'metadata';
    v.setAttribute('controlsList', 'nodownload');
    v.disablePictureInPicture = true;
    v.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  /* Name des Zuschauers, wandert alle 20 Sekunden an eine andere Stelle */
  function wasserzeichen(ziel, text) {
    if (!text) return function () {};
    var w = document.createElement('span');
    w.className = 'ak-wasserzeichen';
    w.setAttribute('aria-hidden', 'true');
    w.textContent = text;
    ziel.appendChild(w);
    var orte = [[8, 8], [62, 12], [12, 72], [55, 78], [34, 44]];
    var i = 0;
    function setzen() { var o = orte[i++ % orte.length]; w.style.left = o[0] + '%'; w.style.top = o[1] + '%'; }
    setzen();
    var t = setInterval(setzen, 20000);
    return function () { clearInterval(t); };
  }

  /* Vollbild für den ganzen Rahmen, damit das Wasserzeichen sichtbar bleibt.
     Wo das nicht geht (iPhone), bleibt das Vollbild des Players. */
  function vollbild(ziel, v) {
    if (!ziel.requestFullscreen) return;
    v.setAttribute('controlsList', 'nodownload nofullscreen');
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ak-vollbild'; b.setAttribute('aria-label', 'Vollbild');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
    b.addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen(); else ziel.requestFullscreen();
    });
    ziel.appendChild(b);
  }

  function datei(ziel, info, messung, zusatz) {
    var v = document.createElement('video');
    geschuetzt(v);
    ziel.appendChild(v);
    var zeichenWeg = wasserzeichen(ziel, zusatz.zeichen);
    vollbild(ziel, v);
    var weg = false, erneuert = 0;

    function quelle() {
      if (info.typ !== 'speicher') { v.src = info.url; return; }
      zusatz.adresse(info.pfad).then(function (u) {
        if (weg) return;
        var stelle = v.currentTime, lief = !v.paused;
        v.src = u;
        if (stelle) v.addEventListener('loadedmetadata', function () { v.currentTime = stelle; if (lief) v.play(); }, { once: true });
      }).catch(function (e) {
        ziel.insertAdjacentHTML('beforeend', '<span class="ak-video-fehler">' +
          ((e && e.anzeigen && e.message) || 'Das Video konnte nicht geladen werden.') + '</span>');
      });
    }
    /* Abgelaufene Adresse (Pause über Stunden) still erneuern */
    v.addEventListener('error', function () {
      if (info.typ === 'speicher' && erneuert++ < 2) quelle();
    });
    quelle();
    v.addEventListener('timeupdate', function () { if (!v.paused) messung.zeit(v.currentTime, v.duration); });
    v.addEventListener('pause', function () { messung.ende(); });
    v.addEventListener('ended', function () { messung.ende(); });
    return function () { weg = true; zeichenWeg(); messung.ende(); v.pause(); v.removeAttribute('src'); v.load(); };
  }

  function einbettung(ziel, info) {
    var f = document.createElement('iframe');
    f.src = info.url; f.allow = 'autoplay; fullscreen'; f.allowFullscreen = true; f.title = 'Schulungsvideo';
    ziel.appendChild(f);
    return function () {};
  }

  /* Baut den Player in "ziel" ein. Gibt { messbar, zerstoeren } zurück.
     zusatz.zeichen  Text für das Wasserzeichen
     zusatz.adresse  Funktion pfad → Promise(Abspiel-Adresse) für "speicher:" */
  function einbauen(ziel, url, schluessel, beiFortschritt, zusatz) {
    var info = erkennen(url);
    ziel.innerHTML = '';
    if (!info) return { messbar: false, zerstoeren: function () {} };
    var messung = Messung('solvera-ak-video-' + schluessel, beiFortschritt);
    var weg = { youtube: youtube, vimeo: vimeo, datei: datei, speicher: datei, einbettung: einbettung }[info.typ](ziel, info, messung, zusatz || {});
    return { messbar: info.typ !== 'einbettung', zerstoeren: weg };
  }

  window.AkademieVideo = { erkennen: erkennen, einbauen: einbauen };
})();
