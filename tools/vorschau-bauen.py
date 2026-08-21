#!/usr/bin/env python3
"""
Baut aus der mehrteiligen Website eine einzige HTML-Datei zum Anschauen.

CSS, JavaScript und alle Bilder werden eingebettet, sodass die Datei ohne
Server und ohne Internetverbindung funktioniert – zum Weitergeben per E-Mail
oder zum Öffnen per Doppelklick.

Aufruf:  python3 tools/vorschau-bauen.py
Ergebnis: vorschau.html im Projektordner
"""

import base64
import json
import mimetypes
import os
import re

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SEITEN = [
    ('index.html',               'Start'),
    ('verdienst.html',           'Verdienst'),
    ('standorte.html',           'Standorte & Aufstieg'),
    ('photovoltaik.html',        'Photovoltaik'),
    ('bewerben.html',            'Bewerben'),
    ('photovoltaik-firmen.html', 'Für Firmen'),
    ('impressum.html',           'Impressum'),
    ('datenschutz.html',         'Datenschutz'),
]


def lies(pfad):
    with open(os.path.join(WURZEL, pfad), encoding='utf-8') as f:
        return f.read()


def daten_uri(pfad):
    voll = os.path.join(WURZEL, pfad)
    typ = mimetypes.guess_type(voll)[0] or 'application/octet-stream'
    if typ == 'image/svg+xml':
        typ = 'image/svg+xml'
    with open(voll, 'rb') as f:
        roh = base64.b64encode(f.read()).decode('ascii')
    return f'data:{typ};base64,{roh}'


_uri_cache = {}


def uri(pfad):
    if pfad not in _uri_cache:
        _uri_cache[pfad] = daten_uri(pfad)
    return _uri_cache[pfad]


def baue_seite(datei):
    html = lies(datei)

    # Stylesheet einbetten
    css = lies('assets/css/style.css')
    html = html.replace(
        '<link rel="stylesheet" href="assets/css/style.css">',
        '<style>\n' + css + '\n</style>')

    # Skripte einbetten
    for treffer in re.findall(r'<script src="(assets/js/[^"]+)"></script>', html):
        js = lies(treffer)
        html = html.replace(f'<script src="{treffer}"></script>',
                            '<script>\n' + js + '\n</script>')

    # Favicon und Bilder als Daten-URI
    html = re.sub(r'href="(assets/img/[^"]+)"', lambda m: f'href="{uri(m.group(1))}"', html)
    html = re.sub(r'src="(assets/img/[^"]+)"',  lambda m: f'src="{uri(m.group(1))}"',  html)

    def ersetze_srcset(m):
        teile = []
        for eintrag in m.group(1).split(','):
            eintrag = eintrag.strip()
            if not eintrag:
                continue
            stueck = eintrag.split()
            teile.append(uri(stueck[0]) + (' ' + ' '.join(stueck[1:]) if len(stueck) > 1 else ''))
        return 'srcset="' + ', '.join(teile) + '"'

    html = re.sub(r'srcset="([^"]+)"', ersetze_srcset, html)

    # Seitenwechsel an die Vorschau-Hülle melden
    bruecke = '''
<script>
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href$=".html"]');
    if (!a) return;
    e.preventDefault();
    var ziel = a.getAttribute('href').split('/').pop();
    parent.postMessage({ solveraSeite: ziel, anker: (a.getAttribute('href').split('#')[1] || '') }, '*');
  });
})();
</script>
</body>'''
    html = html.replace('</body>', bruecke, 1)
    return html


def main():
    seiten = {datei: baue_seite(datei) for datei, _ in SEITEN}
    logo = uri('assets/img/logo.svg')

    # </script> im eingebetteten JSON entschärfen
    daten = json.dumps(seiten, ensure_ascii=False).replace('</', r'<\/')
    reiter = json.dumps([{'datei': d, 'name': n} for d, n in SEITEN], ensure_ascii=False)

    huelle = HUELLE.replace('/*SEITEN*/', daten).replace('/*REITER*/', reiter).replace('%LOGO%', logo)

    ziel = os.path.join(WURZEL, 'vorschau.html')
    with open(ziel, 'w', encoding='utf-8') as f:
        f.write(huelle)
    print(f'vorschau.html geschrieben – {os.path.getsize(ziel) / 1024:.0f} KB, {len(SEITEN)} Seiten')

    # Zweite Fassung ohne <html>/<head>/<body> – wird von manchen Vorschau-
    # Diensten benoetigt, die den Dokumentrahmen selbst mitbringen.
    import sys
    fragment_ziel = os.environ.get('VORSCHAU_FRAGMENT')
    if fragment_ziel:
        inhalt = huelle
        inhalt = inhalt[inhalt.index('<title>'):]
        inhalt = inhalt.replace('</head>\n<body>\n', '')
        inhalt = inhalt.replace('</body>\n</html>\n', '')
        inhalt = re.sub(r'<link rel="icon"[^>]*>\n', '', inhalt)
        with open(fragment_ziel, 'w', encoding='utf-8') as f:
            f.write(inhalt)
        print(f'Fragment geschrieben: {fragment_ziel} – {os.path.getsize(fragment_ziel) / 1024:.0f} KB')


HUELLE = r'''<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Solvera Sales</title>
<link rel="icon" href="%LOGO%" type="image/svg+xml">
<style>
  :root {
    --bg:      #0b0b0d;
    --bar:     #151518;
    --line:    rgba(255, 255, 255, .09);
    --line-2:  rgba(255, 255, 255, .16);
    --txt:     #f5f4f2;
    --txt-2:   #8a8781;
    --brass:   #c0a16b;
    --rose:    #dcc394;
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; }
  html, body { height: 100%; }
  body {
    background: var(--bg);
    color: var(--txt);
    font-family: var(--font);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Leiste */
  .leiste {
    flex: none;
    display: flex; align-items: center; gap: 18px;
    padding: 0 14px;
    height: 52px;
    background: var(--bar);
    border-bottom: 1px solid var(--line);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .leiste::-webkit-scrollbar { display: none; }

  .marke { display: flex; align-items: center; gap: 9px; flex: none; }
  .marke img { width: 24px; height: 24px; }
  .marke span { font-size: .82rem; font-weight: 700; letter-spacing: -.01em; white-space: nowrap; }
  .marke em {
    font-style: normal; font-size: .62rem; letter-spacing: .16em;
    text-transform: uppercase; color: var(--txt-2); margin-left: 9px;
  }

  .reiter { display: flex; gap: 3px; flex: none; }
  .reiter button {
    font: inherit; font-size: .82rem; font-weight: 600;
    color: var(--txt-2);
    background: none; border: 0;
    padding: 7px 12px;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
    transition: color .15s ease, background .15s ease;
  }
  .reiter button:hover { color: var(--txt); background: rgba(255, 255, 255, .05); }
  .reiter button[aria-current="true"] { color: var(--txt); background: var(--brass); color: #14100a; }

  .geraete { display: flex; gap: 3px; margin-left: auto; flex: none; padding-left: 14px; }
  .geraete button {
    font: inherit; font-size: .78rem; font-weight: 600;
    color: var(--txt-2);
    background: none;
    border: 1px solid transparent;
    padding: 6px 11px;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
    transition: color .15s ease, border-color .15s ease;
  }
  .geraete button:hover { color: var(--txt); }
  .geraete button[aria-pressed="true"] { color: var(--rose); border-color: var(--line-2); }

  button:focus-visible { outline: 2px solid var(--rose); outline-offset: 2px; }

  /* Bühne */
  .buehne {
    flex: 1;
    min-height: 0;
    display: flex;
    justify-content: center;
    background:
      repeating-linear-gradient(45deg, rgba(255,255,255,.014) 0 1px, transparent 1px 9px),
      var(--bg);
    padding: 0;
    transition: padding .25s ease;
  }
  .buehne.gerahmt { padding: 22px 16px; }

  .rahmen {
    width: 100%;
    height: 100%;
    max-width: none;
    background: var(--bg);
    transition: max-width .25s ease;
  }
  .buehne.gerahmt .rahmen {
    border: 1px solid var(--line-2);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 30px 70px -30px rgba(0, 0, 0, .9);
  }
  iframe { width: 100%; height: 100%; border: 0; display: block; background: var(--bg); }

  @media (max-width: 760px) {
    .marke span { display: none; }
    .geraete { display: none; }
    .leiste { gap: 12px; }
  }
</style>
</head>
<body>

<div class="leiste">
  <div class="marke">
    <img src="%LOGO%" alt="">
    <span>Solvera Sales<em>Vorschau</em></span>
  </div>
  <nav class="reiter" id="reiter" aria-label="Seiten"></nav>
  <div class="geraete" id="geraete" role="group" aria-label="Ansicht"></div>
</div>

<div class="buehne" id="buehne">
  <div class="rahmen" id="rahmen">
    <iframe id="rahmenInhalt" title="Vorschau der Website"></iframe>
  </div>
</div>

<script>
(function () {
  var SEITEN = /*SEITEN*/;
  var REITER = /*REITER*/;
  var BREITEN = [
    { name: 'Desktop', wert: 0 },
    { name: 'Tablet',  wert: 834 },
    { name: 'Handy',   wert: 390 }
  ];

  var rahmenInhalt = document.getElementById('rahmenInhalt');
  var buehne       = document.getElementById('buehne');
  var rahmen       = document.getElementById('rahmen');
  var reiterNav    = document.getElementById('reiter');
  var geraeteNav   = document.getElementById('geraete');

  var aktuelleSeite = REITER[0].datei;
  var aktuelleBreite = 0;

  function zeige(datei, anker) {
    if (!SEITEN[datei]) datei = REITER[0].datei;
    aktuelleSeite = datei;

    var html = SEITEN[datei];
    if (anker) {
      html = html.replace('</body>',
        '<script>window.addEventListener("load",function(){var z=document.getElementById(' +
        JSON.stringify(anker) + ');if(z)z.scrollIntoView();});<\/script></body>');
    }
    rahmenInhalt.srcdoc = html;

    Array.prototype.forEach.call(reiterNav.children, function (b) {
      b.setAttribute('aria-current', String(b.dataset.datei === datei));
    });
    try { history.replaceState(null, '', '#' + datei.replace('.html', '')); } catch (e) {}
  }

  function setzeBreite(wert) {
    aktuelleBreite = wert;
    rahmen.style.maxWidth = wert ? wert + 'px' : 'none';
    buehne.classList.toggle('gerahmt', wert > 0);
    Array.prototype.forEach.call(geraeteNav.children, function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.wert) === wert));
    });
  }

  REITER.forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.name;
    b.dataset.datei = s.datei;
    b.addEventListener('click', function () { zeige(s.datei, ''); });
    reiterNav.appendChild(b);
  });

  BREITEN.forEach(function (g) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = g.name;
    b.dataset.wert = g.wert;
    b.addEventListener('click', function () { setzeBreite(g.wert); });
    geraeteNav.appendChild(b);
  });

  window.addEventListener('message', function (e) {
    if (!e.data || !e.data.solveraSeite) return;
    zeige(e.data.solveraSeite, e.data.anker || '');
  });

  var start = (location.hash || '').replace('#', '');
  setzeBreite(0);
  zeige(start ? start + '.html' : REITER[0].datei, '');
})();
</script>
</body>
</html>
'''


if __name__ == '__main__':
    main()
