/* =========================================================================
   Solvera Sales – Prüfung aller Seiten

   Öffnet jede Seite in einem echten Browser und meldet, was nicht stimmt:
   Skriptfehler, fehlende Bilder, tote Sprungmarken, waagerechtes Scrollen,
   Anfragen an fremde Server, unausgeglichene Tags, veraltete Angaben sowie
   die wichtigsten Punkte für die Suchmaschine.

   Aufruf:  node tools/pruefen.js
   Voraussetzung: playwright-core und ein Chromium. Fehlt beides, sagt das
   Skript, was zu tun ist.
   ========================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const WURZEL = path.dirname(__dirname);
const BREITEN = [360, 390, 768, 1440, 1920];

/* Angaben, die nirgends mehr auftauchen dürfen. Der Wert ist die Liste der
   Seiten, auf denen sie ausnahmsweise erlaubt sind. */
const VERALTET = {
  'Moses': [], 'Monis': [], 'Naccum': [],       // frühere Schreibweisen
  '45163460': [],                                // alte Rufnummer
  'solvera-sales.de': [],                        // alte Domain
  'kontakt.php': [],                             // entfernter Serverteil
  'Nürnberg': [],                                // aufgegebener Standort
  'Wachhausstra': ['impressum.html', 'datenschutz.html'],  // nur wo Pflicht
};

const NUR_VORSCHAU = ['vorschau.html', 'Solvera-Sales-Website.html'];

function chromiumSuchen() {
  const kandidaten = [
    process.env.CHROMIUM_PFAD,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  ].filter(Boolean);
  for (const k of kandidaten) if (fs.existsSync(k)) return k;
  const basis = '/opt/pw-browsers';
  if (fs.existsSync(basis)) {
    for (const eintrag of fs.readdirSync(basis)) {
      const p = path.join(basis, eintrag, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function playwrightLaden() {
  const orte = ['playwright-core', 'playwright',
                path.join(WURZEL, 'node_modules', 'playwright-core')];
  for (const o of orte) {
    try { return require(o); } catch (e) { /* weiter suchen */ }
  }
  return null;
}

function tagBilanz(quelle) {
  const schief = [];
  for (const tag of ['div', 'section', 'article', 'form', 'ul', 'li', 'p', 'span']) {
    const auf = (quelle.match(new RegExp('<' + tag + '\\b', 'g')) || []).length;
    const zu  = (quelle.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    if (auf !== zu) schief.push(tag + ' ' + (auf > zu ? '+' : '') + (auf - zu));
  }
  return schief;
}

(async () => {
  const pw = playwrightLaden();
  if (!pw) {
    console.error('playwright-core nicht gefunden. Installieren mit:\n' +
                  '  npm install --no-save playwright-core');
    process.exit(2);
  }
  const browserPfad = chromiumSuchen();
  if (!browserPfad) {
    console.error('Kein Chromium gefunden. Pfad über CHROMIUM_PFAD setzen.');
    process.exit(2);
  }

  const seiten = fs.readdirSync(WURZEL)
    .filter(f => f.endsWith('.html') && !NUR_VORSCHAU.includes(f))
    .sort();

  const browser = await pw.chromium.launch({ executablePath: browserPfad });
  let fehlerhaft = 0;

  for (const datei of seiten) {
    const quelle = fs.readFileSync(path.join(WURZEL, datei), 'utf8');
    const seite = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const skriptfehler = [], fremdanfragen = [];
    seite.on('pageerror', e => skriptfehler.push(String(e)));
    seite.on('request', r => {
      const u = r.url();
      if (!u.startsWith('file:') && !u.startsWith('data:')) fremdanfragen.push(u);
    });

    await seite.goto('file://' + path.join(WURZEL, datei));
    await seite.waitForTimeout(350);

    const bilder = await seite.evaluate(() =>
      [...document.images].filter(i => !i.complete || i.naturalWidth === 0).length);

    const ueberlauf = [];
    for (const breite of BREITEN) {
      await seite.setViewportSize({ width: breite, height: 900 });
      await seite.waitForTimeout(180);
      const b = await seite.evaluate(() => document.documentElement.scrollWidth);
      if (b > breite + 1) ueberlauf.push(breite + '→' + b);
    }

    const toteAnker = await seite.evaluate(() =>
      [...document.querySelectorAll('a[href^="#"]')]
        .map(a => a.getAttribute('href'))
        .filter(h => h.length > 1 && !document.querySelector(h)));

    const suche = await seite.evaluate(() => {
      const wert = (sel, at) => { const e = document.querySelector(sel); return e ? e.getAttribute(at) : null; };
      let ungueltig = 0;
      [...document.querySelectorAll('script[type="application/ld+json"]')]
        .forEach(x => { try { JSON.parse(x.textContent); } catch (e) { ungueltig++; } });
      return {
        titel: document.title.length,
        beschreibung: (wert('meta[name=description]', 'content') || '').length,
        h1: document.querySelectorAll('h1').length,
        ohneAlt: [...document.images].filter(i => i.getAttribute('alt') === null).length,
        ungueltig,
        indexierbar: !(wert('meta[name=robots]', 'content') || '').includes('noindex'),
      };
    });

    const reste = Object.entries(VERALTET)
      .filter(([wort, erlaubt]) => quelle.includes(wort) && !erlaubt.includes(datei))
      .map(([wort]) => wort);

    const probleme = [
      skriptfehler.length && 'Skriptfehler: ' + skriptfehler[0].slice(0, 60),
      fremdanfragen.length && 'fremde Anfrage: ' + fremdanfragen[0].slice(0, 50),
      bilder && bilder + ' Bilder fehlen',
      ueberlauf.length && 'waagerechtes Scrollen ' + ueberlauf.join(', '),
      toteAnker.length && 'tote Sprungmarke ' + toteAnker.join(', '),
      tagBilanz(quelle).length && 'Tags: ' + tagBilanz(quelle).join(', '),
      reste.length && 'veraltet: ' + reste.join(', '),
      suche.ungueltig && suche.ungueltig + ' ungültige Strukturdaten',
      suche.h1 !== 1 && suche.h1 + ' H1-Überschriften',
      suche.ohneAlt && suche.ohneAlt + ' Bilder ohne alt',
      suche.indexierbar && suche.titel > 60 && 'Titel ' + suche.titel + ' Zeichen',
      suche.indexierbar && suche.beschreibung > 160 && 'Beschreibung ' + suche.beschreibung + ' Zeichen',
    ].filter(Boolean);

    if (probleme.length) fehlerhaft++;
    console.log((probleme.length ? '✗ ' : '✓ ') + datei.replace('.html', '').padEnd(22) +
                (probleme.join('  ·  ') || 'sauber'));
    await seite.close();
  }

  await browser.close();
  console.log('\n' + seiten.length + ' Seiten geprüft · beanstandet: ' + fehlerhaft);
  process.exit(fehlerhaft ? 1 : 0);
})();
