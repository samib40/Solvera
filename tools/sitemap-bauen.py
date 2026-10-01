#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Erzeugt sitemap.xml und robots.txt aus dem tatsaechlichen Seitenbestand.

Was ein noindex traegt, kommt nicht in die Sitemap - so koennen die beiden
Dateien nicht auseinanderlaufen. Neue Seiten hier unter RANG eintragen.

    python3 tools/sitemap-bauen.py
"""
import datetime
import pathlib
import re
import sys

WURZEL = pathlib.Path(__file__).resolve().parent.parent
BASIS = 'https://solvera-sales.com/'
NUR_VORSCHAU = ('vorschau.html', 'Solvera-Sales-Website.html')

# Aenderungsrhythmus und Gewicht je Seite
RANG = {
    'index.html':               ('weekly',  '1.0'),
    'bewerben.html':            ('weekly',  '0.9'),
    'd2d-vertrieb.html':        ('monthly', '0.8'),
    'photovoltaik.html':        ('monthly', '0.8'),
    'vertrieb-karlsruhe.html':  ('monthly', '0.8'),
    'photovoltaik-firmen.html': ('monthly', '0.7'),
    'ueber-uns.html':           ('monthly', '0.6'),
}


def main():
    heute = datetime.date.today().isoformat()
    indexierbar, gesperrt = [], []

    for p in sorted(WURZEL.glob('*.html')):
        if p.name in NUR_VORSCHAU:
            gesperrt.append(p.name)
            continue
        m = re.search(r'<meta name="robots" content="([^"]*)"', p.read_text(encoding='utf-8')[:3000])
        (gesperrt if m and 'noindex' in m.group(1) else indexierbar).append(p.name)

    fehlt = [s for s in indexierbar if s not in RANG]
    if fehlt:
        sys.exit('Ohne Eintrag unter RANG: %s' % ', '.join(fehlt))

    zeilen = ['<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for datei in sorted(indexierbar, key=lambda d: (-float(RANG[d][1]), d)):
        freq, prio = RANG[datei]
        adresse = BASIS if datei == 'index.html' else BASIS + datei
        zeilen += ['  <url>',
                   '    <loc>%s</loc>' % adresse,
                   '    <lastmod>%s</lastmod>' % heute,
                   '    <changefreq>%s</changefreq>' % freq,
                   '    <priority>%s</priority>' % prio,
                   '  </url>']
    zeilen.append('</urlset>')
    (WURZEL / 'sitemap.xml').write_text('\n'.join(zeilen) + '\n', encoding='utf-8')

    danke = sorted(s for s in gesperrt if s.startswith('danke'))
    (WURZEL / 'robots.txt').write_text(
        'User-agent: *\n'
        'Allow: /\n\n'
        '# Zusammengepackte Einzeldateien - gehoeren nicht in den Index.\n'
        'Disallow: /vorschau.html\n'
        'Disallow: /Solvera-Sales-Website.html\n\n'
        '# Dankeseiten: kein eigenstaendiger Inhalt.\n'
        + ''.join('Disallow: /%s\n' % s for s in danke)
        + '\n# Impressum und Datenschutz tragen noindex, duerfen aber gelesen werden:\n'
          '# ein auffindbares Impressum ist ein Vertrauenssignal.\n\n'
          'Sitemap: %ssitemap.xml\n' % BASIS,
        encoding='utf-8')

    print('sitemap.xml: %d Seiten' % len(indexierbar))
    for s in sorted(indexierbar):
        print('  ' + s)
    print('nicht enthalten: %s' % ', '.join(sorted(gesperrt)))


if __name__ == '__main__':
    main()
