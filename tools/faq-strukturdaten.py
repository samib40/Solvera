#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Erzeugt den FAQPage-Datensatz (schema.org) aus den sichtbaren Fragen und
Antworten der Bewerbungsseite und schreibt ihn in die Seite zurueck.

Damit koennen Strukturdaten und sichtbarer Inhalt nicht auseinanderlaufen:
nach jedem Neubau der Seiten wird dieses Skript ausgefuehrt.

    python3 tools/faq-strukturdaten.py
"""
import html
import json
import pathlib
import re
import sys

SEITE = pathlib.Path(__file__).resolve().parent.parent / 'bewerben.html'
ANFANG = '<!-- FAQ-Strukturdaten: erzeugt von tools/faq-strukturdaten.py -->'
ENDE = '<!-- /FAQ-Strukturdaten -->'

FRAGE = re.compile(
    r'<button class="faq-q"[^>]*>(.*?)<svg', re.S)
BLOCK = re.compile(
    r'<div class="faq-item[^"]*">\s*<button class="faq-q"[^>]*>(.*?)<svg.*?'
    r'<div class="faq-a"><div>(.*?)</div></div>', re.S)


def text(roh):
    """Markup entfernen, Entities aufloesen, Leerraum normalisieren."""
    roh = re.sub(r'<p>', ' ', roh)
    roh = re.sub(r'<[^>]+>', ' ', roh)
    return re.sub(r'\s+', ' ', html.unescape(roh)).strip()


def main():
    inhalt = SEITE.read_text(encoding='utf-8')

    paare = [(text(f), text(a)) for f, a in BLOCK.findall(inhalt)]
    if not paare:
        sys.exit('Keine Fragen gefunden – Aufbau der Seite geprueft?')

    gefunden = len(FRAGE.findall(inhalt))
    if gefunden != len(paare):
        sys.exit('Nur %d von %d Fragen konnten gelesen werden.' % (len(paare), gefunden))

    daten = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            {
                '@type': 'Question',
                'name': f,
                'acceptedAnswer': {'@type': 'Answer', 'text': a},
            }
            for f, a in paare
        ],
    }

    block = (ANFANG + '\n<script type="application/ld+json">\n'
             + json.dumps(daten, ensure_ascii=False, indent=2)
             + '\n</script>\n' + ENDE)

    if ANFANG in inhalt:
        inhalt = re.sub(re.escape(ANFANG) + r'.*?' + re.escape(ENDE),
                        lambda _: block, inhalt, flags=re.S)
    else:
        inhalt = inhalt.replace('</head>', block + '\n</head>', 1)

    SEITE.write_text(inhalt, encoding='utf-8')
    print('FAQ-Strukturdaten geschrieben: %d Fragen' % len(paare))
    for f, _ in paare:
        print('  · ' + f)


if __name__ == '__main__':
    main()
