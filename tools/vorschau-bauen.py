#!/usr/bin/env python3
"""
Packt die mehrteilige Website in eine einzige HTML-Datei.

Zwei Ausgaben:

  vorschau.html                Zum Prüfen: mit Leiste zum Umschalten
                               zwischen Desktop-, Tablet- und Handy-Ansicht.

  Solvera-Sales-Website.html   Zum Weitergeben, etwa über WhatsApp oder
                               E-Mail: nur die Website, ohne Leiste.

Beide Dateien enthalten Stylesheet, Skripte und Bilder eingebettet und
funktionieren ohne Server und ohne Internetverbindung. Gemeinsame Bestandteile
werden nur einmal gespeichert, damit die Dateien klein bleiben.

Aufruf:  python3 tools/vorschau-bauen.py
"""

import base64
import json
import mimetypes
import os
import re

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SEITEN = [
    ('index.html',               'Start'),
    ('bewerben.html',            'Bewerben'),
    ('photovoltaik.html',        'Photovoltaikanlage'),
    ('photovoltaik-firmen.html', 'Firmenkunden'),
    ('ueber-uns.html',           'Über uns'),
]
WEITERE = ['impressum.html', 'datenschutz.html', '404.html']


def lies(pfad):
    with open(os.path.join(WURZEL, pfad), encoding='utf-8') as f:
        return f.read()


def daten_uri(pfad, klein=False):
    voll = os.path.join(WURZEL, pfad)
    typ = mimetypes.guess_type(voll)[0] or 'application/octet-stream'
    # Fuer die Weitergabe reichen die kleinen Fassungen der Teamfotos
    if klein:
        sparsam = voll.replace('.jpg', '@small.jpg')
        if '@small' not in voll and os.path.exists(sparsam):
            voll = sparsam
    with open(voll, 'rb') as f:
        return f'data:{typ};base64,' + base64.b64encode(f.read()).decode('ascii')


def sammle_bilder(klein):
    ordner = os.path.join(WURZEL, 'assets/img')
    return {n: daten_uri(f'assets/img/{n}', klein)
            for n in sorted(os.listdir(ordner)) if not n.startswith('.')}


BRUECKE = '''
<script>
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href$=".html"]');
    if (!a) return;
    e.preventDefault();
    var h = a.getAttribute('href');
    parent.postMessage({ solveraSeite: h.split('/').pop().split('#')[0],
                         anker: (h.split('#')[1] || '') }, '*');
  });
})();
</script>
'''


def baue_seite(datei):
    """Ersetzt Stylesheet, Skripte und Bildpfade durch Platzhalter."""
    html = lies(datei)
    html = html.replace('<link rel="stylesheet" href="assets/css/style.css">', '<!--SOLVERA:CSS-->')
    for treffer in re.findall(r'<script src="assets/js/([^"]+)"></script>', html):
        html = html.replace(f'<script src="assets/js/{treffer}"></script>',
                            f'<!--SOLVERA:JS:{treffer}-->')
    html = re.sub(r'assets/img/([^"\s,]+)', lambda m: '%SOLVERA_IMG:' + m.group(1) + '%', html)
    return html.replace('</body>', BRUECKE + '</body>', 1)


def schreibe(ziel, mit_leiste, klein):
    seiten = {d: baue_seite(d) for d, _ in SEITEN}
    for d in WEITERE:
        seiten[d] = baue_seite(d)

    mittel = {
        'css': lies('assets/css/style.css'),
        'js': {n: lies(f'assets/js/{n}') for n in sorted(os.listdir(os.path.join(WURZEL, 'assets/js')))},
        'img': sammle_bilder(klein),
    }

    def sicher(obj):
        return json.dumps(obj, ensure_ascii=False).replace('</', r'<\/')

    huelle = (HUELLE
              .replace('/*SEITEN*/', sicher(seiten))
              .replace('/*MITTEL*/', sicher(mittel))
              .replace('/*START*/', sicher(SEITEN[0][0]))
              .replace('/*LEISTE*/', 'true' if mit_leiste else 'false')
              .replace('%LOGO%', mittel['img']['logo-mark.png']))

    pfad = os.path.join(WURZEL, ziel)
    with open(pfad, 'w', encoding='utf-8') as f:
        f.write(huelle)
    print(f'{ziel:32} {os.path.getsize(pfad)/1024:6.0f} KB')
    return huelle


HUELLE = r'''<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Solvera Sales GmbH</title>
<link rel="icon" href="%LOGO%" type="image/png">
<style>
  :root {
    --bg: #0b0b0d; --bar: #151518;
    --line: rgba(255,255,255,.09); --line-2: rgba(255,255,255,.16);
    --txt: #f5f4f2; --txt-2: #8a8781; --brass: #c0a16b;
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; }
  html, body { height: 100%; }
  body { background: var(--bg); color: var(--txt); font-family: var(--font);
         display: flex; flex-direction: column; overflow: hidden; }

  .leiste { flex: none; display: flex; align-items: center; gap: 18px;
            padding: 0 14px; height: 52px; background: var(--bar);
            border-bottom: 1px solid var(--line); overflow-x: auto; scrollbar-width: none; }
  .leiste::-webkit-scrollbar { display: none; }
  .leiste[hidden] { display: none; }
  .marke { display: flex; align-items: center; gap: 9px; flex: none; }
  .marke img { height: 26px; width: auto; }
  .marke span { font-size: .8rem; font-weight: 700; white-space: nowrap; }
  .hinweis { font-size: .78rem; color: var(--txt-2); white-space: nowrap; flex: none; }
  .geraete { display: flex; gap: 3px; margin-left: auto; flex: none; padding-left: 14px; }
  .geraete button { font: inherit; font-size: .78rem; font-weight: 600; color: var(--txt-2);
                    background: none; border: 1px solid transparent; padding: 6px 11px;
                    border-radius: 8px; cursor: pointer; white-space: nowrap; }
  .geraete button:hover { color: var(--txt); }
  .geraete button[aria-pressed="true"] { color: var(--brass); border-color: var(--line-2); }
  button:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }

  .buehne { flex: 1; min-height: 0; display: flex; justify-content: center;
            background: var(--bg); padding: 0; transition: padding .25s ease; }
  .buehne.gerahmt { padding: 22px 16px; }
  .rahmen { width: 100%; height: 100%; max-width: none; background: var(--bg);
            transition: max-width .25s ease; }
  .buehne.gerahmt .rahmen { border: 1px solid var(--line-2); border-radius: 16px;
                            overflow: hidden; box-shadow: 0 30px 70px -30px rgba(0,0,0,.9); }
  iframe { width: 100%; height: 100%; border: 0; display: block; background: var(--bg); }

  @media (max-width: 760px) { .marke span, .hinweis { display: none; } .geraete { display: none; } }
</style>
</head>
<body>

<div class="leiste" id="leiste">
  <div class="marke"><img src="%LOGO%" alt=""><span>Solvera Sales</span></div>
  <span class="hinweis">Navigation über die Website selbst</span>
  <div class="geraete" id="geraete" role="group" aria-label="Ansicht"></div>
</div>

<div class="buehne" id="buehne">
  <div class="rahmen" id="rahmen"><iframe id="rahmenInhalt" title="Solvera Sales"></iframe></div>
</div>

<script>
(function () {
  var SEITEN = /*SEITEN*/;
  var MITTEL = /*MITTEL*/;
  var START  = /*START*/;
  var LEISTE = /*LEISTE*/;

  var rahmenInhalt = document.getElementById('rahmenInhalt');
  var buehne = document.getElementById('buehne');
  var rahmen = document.getElementById('rahmen');
  var leiste = document.getElementById('leiste');
  var geraeteNav = document.getElementById('geraete');

  if (!LEISTE) leiste.hidden = true;

  /* Platzhalter durch die gemeinsam gespeicherten Bestandteile ersetzen */
  function baue(datei) {
    var html = SEITEN[datei];
    html = html.replace('<!--SOLVERA:CSS-->', '<style>' + MITTEL.css + '<\/style>');
    html = html.replace(/<!--SOLVERA:JS:([^>]+)-->/g, function (_, name) {
      return '<script>' + (MITTEL.js[name] || '') + '<\/script>';
    });
    html = html.replace(/%SOLVERA_IMG:([^%]+)%/g, function (_, name) {
      return MITTEL.img[name] || '';
    });
    return html;
  }

  function zeige(datei, anker) {
    if (!SEITEN[datei]) datei = START;
    var html = baue(datei);
    if (anker) {
      html = html.replace('</body>',
        '<script>window.addEventListener("load",function(){var z=document.getElementById(' +
        JSON.stringify(anker) + ');if(z&&window.solveraSpringeZu)window.solveraSpringeZu(z);' +
        'else if(z)z.scrollIntoView();});<\/script></body>');
    }
    rahmenInhalt.srcdoc = html;
    try { history.replaceState(null, '', '#' + datei.replace('.html', '')); } catch (e) {}
  }

  [{ name: 'Desktop', wert: 0 }, { name: 'Tablet', wert: 834 }, { name: 'Handy', wert: 390 }]
    .forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = g.name; b.dataset.wert = g.wert;
      b.addEventListener('click', function () { setzeBreite(g.wert); });
      geraeteNav.appendChild(b);
    });

  function setzeBreite(wert) {
    rahmen.style.maxWidth = wert ? wert + 'px' : 'none';
    buehne.classList.toggle('gerahmt', wert > 0);
    Array.prototype.forEach.call(geraeteNav.children, function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.wert) === wert));
    });
  }

  window.addEventListener('message', function (e) {
    if (!e.data || !e.data.solveraSeite) return;
    zeige(e.data.solveraSeite, e.data.anker || '');
  });

  setzeBreite(0);
  var start = (location.hash || '').replace('#', '');
  zeige(start ? start + '.html' : START, '');
})();
</script>
</body>
</html>
'''


def main():
    print('Erzeuge:')
    schreibe('vorschau.html', mit_leiste=True, klein=False)
    schreibe('Solvera-Sales-Website.html', mit_leiste=False, klein=True)

    fragment_ziel = os.environ.get('VORSCHAU_FRAGMENT')
    if fragment_ziel:
        inhalt = open(os.path.join(WURZEL, 'vorschau.html'), encoding='utf-8').read()
        inhalt = inhalt[inhalt.index('<title>'):]
        inhalt = inhalt.replace('</head>\n<body>\n', '')
        inhalt = inhalt.replace('</body>\n</html>\n', '')
        inhalt = re.sub(r'<link rel="icon"[^>]*>\n', '', inhalt)
        with open(fragment_ziel, 'w', encoding='utf-8') as f:
            f.write(inhalt)
        print(f'{"Fragment für die Online-Vorschau":32} {os.path.getsize(fragment_ziel)/1024:6.0f} KB')


if __name__ == '__main__':
    main()
