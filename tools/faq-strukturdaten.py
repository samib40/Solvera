#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Erzeugt den FAQPage-Datensatz (schema.org) aus den sichtbaren Fragen und
Antworten einer Seite und schreibt ihn in die Seite zurueck.

Damit koennen Strukturdaten und sichtbarer Inhalt nicht auseinanderlaufen:
nach jeder Aenderung an den Fragen wird dieses Skript ausgefuehrt.

    python3 tools/faq-strukturdaten.py                 # alle Seiten mit FAQ
    python3 tools/faq-strukturdaten.py bewerben.html   # nur diese eine
"""
import html
import json
import pathlib
import re
import sys

WURZEL = pathlib.Path(__file__).resolve().parent.parent
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


def schreibe(seite):
    inhalt = seite.read_text(encoding='utf-8')

    paare = [(text(f), text(a)) for f, a in BLOCK.findall(inhalt)]
    if not paare:
        return 0

    gefunden = len(FRAGE.findall(inhalt))
    if gefunden != len(paare):
        sys.exit('%s: nur %d von %d Fragen lesbar.' % (seite.name, len(paare), gefunden))

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

    seite.write_text(inhalt, encoding='utf-8')
    print('%-22s %2d Fragen' % (seite.name, len(paare)))
    return len(paare)


def main():
    namen = sys.argv[1:]
    seiten = ([WURZEL / n for n in namen] if namen
              else sorted(p for p in WURZEL.glob('*.html')
                          if p.name not in ('vorschau.html', 'Solvera-Sales-Website.html')))
    gesamt = sum(schreibe(s) for s in seiten)
    if not gesamt:
        sys.exit('Keine Fragen gefunden.')
    print('insgesamt %d Fragen' % gesamt)


if __name__ == '__main__':
    main()
