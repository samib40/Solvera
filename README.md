# Solvera Sales GmbH – Website

Statische Website für die Solvera Sales GmbH (Karlsruhe · Berlin · Nürnberg).
Kein Build-Schritt, kein Framework, keine externen Requests – einfach hochladen und läuft.

---

## ⚠️ Vor dem Livegang erledigen

| # | Was | Wo |
|---|-----|-----|
| 1 | **HRB-Nummer** eintragen (Amtsgericht Karlsruhe steht schon) | `impressum.html` |
| 2 | **USt-IdNr.** eintragen | `impressum.html` |
| 3 | **Hosting-Anbieter** (Name + Anschrift) eintragen | `datenschutz.html`, Abschnitt 6 |
| 4 | **Energie Plus**: vollständigen Firmennamen und Anschrift eintragen | `datenschutz.html`, Abschnitt 7 |
| 5 | **Datenschutzbeauftragter**: benennen oder Abschnitt 2 löschen | `datenschutz.html` |
| 6 | Nicht genutzte **Analyse-Dienste** aus Abschnitt 5 streichen | `datenschutz.html` |
| 7 | Gelbe Hinweiskästen entfernen | `impressum.html`, `datenschutz.html` |
| 8 | Formular-Endpoints eintragen (sonst nur E-Mail-Fallback) | `assets/js/config.js` |
| 9 | Tracking-IDs eintragen – erst dann erscheint der Cookie-Banner | `assets/js/config.js` |
| 10 | Angaben zur Förderung prüfen und Datum aktualisieren | `photovoltaik.html`, `#foerderung` |
| 10a | Anzahl der Vertriebspartner aktuell halten (derzeit 57) | `index.html`, `ueber-uns.html`, `photovoltaik-firmen.html` |
| 11 | Partner-Logos erst nach schriftlicher Freigabe einsetzen | `photovoltaik.html`, `#partner` |
| 12 | `datePosted` / `validThrough` der Stellenanzeige aktualisieren | `bewerben.html`, JSON-LD im `<head>` |

## Seitenstruktur

Schwerpunkt der Website ist die Gewinnung von Vertriebspartnern. Die Navigation
lautet **Start · Bewerben · Photovoltaikanlage · Firmenkunden · Über uns**;
„Bewerben" ist als helle Schaltfläche hervorgehoben. Alle Angaben zur Position
stehen gebündelt auf `bewerben.html` und sind dort über eine Sprungmarken-Leiste
erreichbar. Der Photovoltaik-Rechner sitzt am Ende der Photovoltaik-Seite.

Eine Telefonnummer steht bewusst nur noch im Impressum und in der
Datenschutzerklärung – dort ist sie gesetzlich vorgeschrieben. Alle Wege auf der
Website führen über die Bewerbung oder WhatsApp.

| Datei | Inhalt | In der Navigation |
|-------|--------|-------------------|
| `index.html` | Start: Vergütung, Tätigkeit in vier Schritten, Standorte, Entwicklung | Start |
| `ueber-uns.html` | Unternehmensprofil, Geschäftsmodell, Team mit Fotos, Standorte | Über uns (letzter Punkt) |
| `photovoltaik.html` | Vorteile, staatliche Förderung, Umwelt und Wirtschaft, die sieben Qualitätskriterien, Partner, Photovoltaik-Rechner, Hinweis für Firmenkunden | Photovoltaikanlage |
| `bewerben.html` | Vergütung mit Rechner, Rahmenbedingungen, Entwicklungsmodell, Standorte kompakt, Ausbildung, Ablauf, Bewerbungsformular, zwölf häufige Fragen | Bewerben (hervorgehoben) |
| `photovoltaik-firmen.html` | Angebot für Photovoltaik-Fachbetriebe, Anfrageformular | Firmenkunden |
| `impressum.html` | Pflichtangaben nach § 5 DDG | Fußzeile |
| `datenschutz.html` | Datenschutzerklärung nach DSGVO | Fußzeile |
| `404.html` | Fehlerseite | – |
| `vorschau.html` | Alle Seiten in einer Datei, mit Ansichtswechsler – nicht hochladen | – |
| `Solvera-Sales-Website.html` | Alle Seiten in einer Datei, zum Weitergeben – nicht hochladen | – |

```
assets/
├── css/style.css          Design-System (Farben, Komponenten, Responsive)
├── js/config.js           ► ZENTRALE KONFIGURATION – hier alles einstellen
├── js/consent.js          Cookie-Banner, lädt Tracking erst nach Einwilligung
├── js/main.js             Header, Navigation, Scroll-Animationen, FAQ
├── js/forms.js            Validierung + Versand aller Formulare
├── js/calculator.js       Photovoltaik-Rechner (Startseite)
├── js/earnings.js         Provisions-Rechner (Karriereseite)
└── img/                   Logo (PNG, freigestellt), Favicons und vier Teamfotos

tools/
└── vorschau-bauen.py      Erzeugt vorschau.html aus den Einzeldateien
```

---

## Formulare anbinden

Alle drei Formulare (PV-Rechner, Bewerbung, Firmenanfrage) laufen über dieselbe Logik.
Ziel wird in **`assets/js/config.js`** eingetragen:

```js
endpoints: {
  lead:      'https://formspree.io/f/xxxxxxxx',   // PV-Rechner
  bewerbung: 'https://formspree.io/f/yyyyyyyy',   // Bewerbungen
  firmen:    'https://formspree.io/f/zzzzzzzz'    // Photovoltaik-Firmen
}
```

**Mit Formspree (empfohlen, ohne eigenen Server):**
1. Konto auf [formspree.io](https://formspree.io) anlegen
2. Pro Formular ein neues Formular erstellen → Endpoint-URL kopieren
3. URLs oben eintragen, Datei speichern, hochladen

**Alternativen:** Jede URL, die einen `POST` mit JSON annimmt, funktioniert –
z. B. Make, Zapier, n8n, HubSpot oder ein eigenes Backend.

**Solange nichts eingetragen ist**, öffnet sich beim Absenden automatisch das
E-Mail-Programm des Besuchers mit allen ausgefüllten Daten. Die Seite ist also
auch ohne Konfiguration nutzbar – aber die Abbruchquote ist deutlich höher.

> **Hinweis zum Lebenslauf-Upload:** Dateianhänge unterstützt Formspree erst in
> den kostenpflichtigen Tarifen. Ohne Upgrade kommt die Bewerbung an, die Datei
> jedoch nicht. Wer keinen Bezahltarif möchte, entfernt das Upload-Feld
> (`.file-drop`) aus `bewerben.html`.

---

## Vorschau und Weitergabe

Die Website besteht aus mehreren Dateien und braucht zum Anschauen normalerweise
einen Server. Ein Skript packt sie deshalb in jeweils eine einzige Datei:

```bash
python3 tools/vorschau-bauen.py
```

Daraus entstehen zwei Dateien im Projektordner:

| Datei | Zweck |
|-------|-------|
| `vorschau.html` | **Zum Prüfen.** Oben eine Leiste, mit der sich zwischen Desktop-, Tablet- und Handy-Ansicht umschalten lässt. |
| `Solvera-Sales-Website.html` | **Zum Weitergeben** über WhatsApp, E-Mail oder USB-Stick. Zeigt nur die Website, ohne Leiste; Teamfotos in kleinerer Auflösung, damit die Datei kompakt bleibt. |

Beide funktionieren per Doppelklick – ohne Server, ohne Internetverbindung und
ohne Anmeldung. Stylesheet, Skripte und Bilder liegen eingebettet in der Datei,
gemeinsame Bestandteile jeweils nur einmal.

> Beide Dateien tragen `noindex` und gehören nicht auf den Server. Dort werden
> die einzelnen Seiten hochgeladen.

---

## Farben ändern

Die gesamte Farbwelt steckt in **einem** Block ganz oben in
`assets/css/style.css` (`:root`). Wer dort die Werte tauscht, färbt die ganze
Website um – es gibt keine fest verdrahteten Farben im Rest der Datei.

```css
--brass:       #c0a16b;   /* gedecktes Messing – Akzent, Symbole, Zahlen */
--brass-light: #dcc394;   /* heller, für Verläufe                        */
--brass-deep:  #8a6f42;   /* dunkler, für Verlaufsenden                  */
--btn-fill:    #f5f4f2;   /* Hauptschaltflächen: Platin auf Schwarz      */
```

Das Messing ist bewusst sparsam eingesetzt: Es färbt Symbole, Kennzahlen, Rahmen
und Ziffern, aber keine großen Flächen. Die Hauptschaltflächen sind hell auf
dunklem Grund – das erzeugt den Kontrast, ohne dass die Seite bunt wirkt.

Wer Farben ändert, sollte den Kontrast gegen `--bg` prüfen: Mindestwert 4,5:1 für
normalen Text, 3:1 für große Überschriften. Alle aktuellen Werte erfüllen WCAG AA.

Das Logo liegt als freigestelltes PNG unter `assets/img/`:

```
logo-mark.png        Bildmarke (S mit Pfeil), transparent
logo-wortmarke.png   Schriftzug SOLVERA SALES, transparent
favicon-32.png       Browser-Symbol
favicon-180.png      Symbol für Startbildschirm auf Mobilgeräten
```

Liegt das Logo später als Vektordatei (SVG) vor, lassen sich diese Dateien
eins zu eins ersetzen – die Klassen `.brand-mark` und `.brand-wort` steuern
nur die Höhe.

---

## Tracking und Cookie-Banner

Tracking wird **ausschließlich nach ausdrücklicher Einwilligung** geladen
(§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO). Vorher wird kein Skript eines
Drittanbieters eingebunden und kein Analyse-Cookie gesetzt.

IDs eintragen in `assets/js/config.js`:

```js
tracking: {
  ga4:    'G-XXXXXXXXXX',        // Google Analytics 4 – Mess-ID
  meta:   '1234567890123456',    // Meta-Pixel-ID
  tiktok: ''                     // leer lassen = nicht aktiv
}
```

* **Solange alle drei Felder leer sind, erscheint der Cookie-Banner nicht** und
  die Website ist vollständig trackingfrei.
* Sobald mindestens eine ID eingetragen ist, erscheint der Banner beim ersten Besuch.
* Die Entscheidung wird 182 Tage im Local Storage gespeichert
  (Schlüssel `solvera-consent`), danach wird erneut gefragt.
* Widerruf jederzeit über „Cookie-Einstellungen" im Seitenfuß.

> **Pflicht:** Wenn du einen Dienst aktivierst, muss er auch in der
> Datenschutzerklärung (Abschnitt 5) stehen – und jeder Dienst, den du *nicht*
> nutzt, muss dort gestrichen werden.

---

## WhatsApp-Bewerbung

Die WhatsApp-Buttons zeigen auf `wa.me/4917645163460` mit vorformulierter Nachricht.
Nummer ändern in `assets/js/config.js` unter `kontakt.whatsapp` **und** in den
`href`-Attributen der `.wa-btn`-Links in `bewerben.html`.

---

## Inhalte pflegen

**Rechenwerte des PV-Rechners** (Strompreis, Einspeisevergütung, Kosten je kWp …)
stehen gesammelt in `assets/js/config.js` unter `calc`. Ändern sich Marktpreise,
genügt eine Anpassung dort – der Rechner übernimmt sie automatisch.

**Provision** (aktuell 70 € pro qualifiziertem Lead) steht ebenfalls in
`config.js` unter `provision.proLead`. Achtung: In den Fließtexten steht der
Betrag zusätzlich ausgeschrieben – bei einer Änderung mit
`grep -rn "70 €" *.html` alle Stellen mitziehen.

**Qualitätskriterien** (sieben Punkte auf `photovoltaik.html#leads` und
`photovoltaik-firmen.html`) stammen aus der Vorgabe des Fachpartners. Ändert der
Partner seine Kriterien, müssen beide Listen angepasst werden.

**Kennzahlen** auf Start- und Bewerbungsseite sind direkt im HTML hinterlegt.
Der Wert im Attribut `data-count` wird beim Scrollen hochgezählt:

```html
<div class="stat"><div class="v"><span data-count="25">25</span></div> …
```

---

## Teamfotos austauschen

Alle Teamfotos liegen im Format **3:4** (600×800 px, dazu eine kleine Fassung
mit 300×400 px für Mobilgeräte) unter `assets/img/`:

```
team-sami-bssiss.jpg     team-sami-bssiss@small.jpg
team-oskar-teschke.jpg   team-oskar-teschke@small.jpg
team-monis-manai.jpg     team-monis-manai@small.jpg
team-marc-naccum.jpg     team-marc-naccum@small.jpg
```

Für ein neues Gesicht (z. B. die Teamleitung Nürnberg) beide Größen anlegen und
eine bestehende `<article class="team-card">` in `index.html` kopieren. Damit die
Reihe einheitlich wirkt, sollte der Kopf bei allen Fotos etwa gleich groß sein und
oben rund ein Zehntel der Bildhöhe Luft haben.

---

## Social Media verlinken

Die Symbole in der Fußzeile erscheinen **automatisch**, sobald in
`assets/js/config.js` unter `social` eine Profil-URL eingetragen wird:

```js
social: {
  instagram: 'https://www.instagram.com/…',
  tiktok:    'https://www.tiktok.com/@…',
  linkedin:  '', facebook: '', youtube: ''
}
```

Leere Felder werden übersprungen – es entstehen also keine toten Links. Sind
alle Felder leer, wird die Symbolzeile gar nicht erst angezeigt.

---

## Veröffentlichen

Die Website ist rein statisch. Es gibt keinen Build-Schritt – die Dateien werden
so hochgeladen, wie sie im Repository liegen.

**Klassischer Webspace (IONOS, Strato, All-Inkl …)**
Alle Dateien und den Ordner `assets/` per FTP in das Web-Wurzelverzeichnis
(meist `httpdocs/` oder `html/`) legen. Fertig.

**GitHub Pages**
Repository → *Settings* → *Pages* → Branch auswählen, Ordner `/ (root)`.
Die Datei `.nojekyll` liegt bereits bei und verhindert die Jekyll-Verarbeitung.
Eigene Domain unter *Custom domain* eintragen.

**Netlify / Vercel**
Repository verbinden, Build-Command leer lassen, Publish-Directory `/`.

Nach dem Livegang: In `sitemap.xml`, `robots.txt` und den `<link rel="canonical">`
sowie `og:url`-Tags aller Seiten steht `https://www.solvera-sales.de/`.
Bei abweichender Domain diese Adresse überall ersetzen.

---

## Technische Hinweise

* **Keine externen Requests.** Schriften sind Systemschriften, Icons sind inline-SVG,
  Grafiken sind CSS-Gradienten. Dadurch lädt die Seite sehr schnell und es ist
  **kein Cookie-Banner erforderlich** – solange kein Tracking ergänzt wird.
* **Barrierefreiheit.** Skip-Link, Fokus-Ringe, `aria`-Attribute an Navigation und
  Akkordeon, `prefers-reduced-motion` wird respektiert. Alle Textfarben erfüllen
  den WCAG-AA-Kontrast.
* **Spam-Schutz.** Jedes Formular enthält ein unsichtbares Honeypot-Feld (`website`).
  Ausgefüllte Einsendungen werden verworfen.
* **Browser.** Getestet für aktuelle Versionen von Chrome, Firefox, Safari und Edge
  (Desktop und Mobil).

---

© Solvera Sales GmbH
