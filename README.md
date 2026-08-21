# Solvera Sales GmbH – Website

Statische Website für die Solvera Sales GmbH (Karlsruhe · Berlin · Nürnberg).
Kein Build-Schritt, kein Framework, keine externen Requests – einfach hochladen und läuft.

---

## ⚠️ Vor dem Livegang erledigen

| # | Was | Wo |
|---|-----|-----|
| 1 | Geschäftsführer, Amtsgericht, HRB-Nummer, USt-IdNr. eintragen | `impressum.html` |
| 2 | Gelben Hinweiskasten entfernen | `impressum.html`, `datenschutz.html` |
| 3 | Hosting-Anbieter + Partnerfirmen (Name/Anschrift) eintragen | `datenschutz.html` |
| 4 | Formular-Endpoints eintragen (sonst nur E-Mail-Fallback) | `assets/js/config.js` |
| 5 | Schreibweise des Firmennamens prüfen (Solvera / Solviera) | alle Dateien |
| 6 | Erfolgszahlen aktuell halten | `index.html`, Abschnitt `#erfolge` |
| 7 | Partner-Logos erst nach schriftlicher Freigabe einsetzen | `index.html`, Abschnitt `#partner` |
| 8 | `datePosted` / `validThrough` der Stellenanzeige aktualisieren | `karriere.html`, JSON-LD im `<head>` |

---

## Seitenstruktur

| Datei | Inhalt |
|-------|--------|
| `index.html` | Startseite: PV-Rechner (Hero), Was sind PV-Leads, Ablauf, Erfolge, Partner, Über uns, Standorte, Karriere, Bewerbungsformular |
| `karriere.html` | Recruiting: Provisions-Rechner, Angebot, Ausbildung, Aufstieg, offene Positionen, FAQ, Bewerbungsformular |
| `pv-firmen.html` | B2B: Leistung, Qualitätsstandard, Ablauf, Regionen, Anfrageformular |
| `impressum.html` | Pflichtangaben nach § 5 DDG |
| `datenschutz.html` | Datenschutzerklärung nach DSGVO |
| `404.html` | Fehlerseite |

```
assets/
├── css/style.css          Design-System (Farben, Komponenten, Responsive)
├── js/config.js           ► ZENTRALE KONFIGURATION – hier alles einstellen
├── js/main.js             Header, Navigation, Scroll-Animationen, FAQ
├── js/forms.js            Validierung + Versand aller Formulare
├── js/calculator.js       Photovoltaik-Rechner (Startseite)
├── js/earnings.js         Provisions-Rechner (Karriereseite)
└── img/                   Logo und Favicon (SVG)
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
> (`.file-drop`) aus `index.html` und `karriere.html`.

---

## Inhalte pflegen

**Rechenwerte des PV-Rechners** (Strompreis, Einspeisevergütung, Kosten je kWp …)
stehen gesammelt in `assets/js/config.js` unter `calc`. Ändern sich Marktpreise,
genügt eine Anpassung dort – der Rechner übernimmt sie automatisch.

**Provision** (aktuell 70 € pro qualifiziertem Lead) steht ebenfalls in
`config.js` unter `provision.proLead`. Achtung: In den Fließtexten von
`index.html` und `karriere.html` steht der Betrag zusätzlich ausgeschrieben –
bei einer Änderung dort mit ändern.

**Kennzahlen** auf der Startseite (`#erfolge`) sind in `index.html` hinterlegt.
Der Wert im Attribut `data-count` wird beim Scrollen hochgezählt:

```html
<div class="stat"><div class="v"><span data-count="25">25</span></div> …
```

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
  Akkordeon, `prefers-reduced-motion` wird respektiert.
* **Spam-Schutz.** Jedes Formular enthält ein unsichtbares Honeypot-Feld (`website`).
  Ausgefüllte Einsendungen werden verworfen.
* **Browser.** Getestet für aktuelle Versionen von Chrome, Firefox, Safari und Edge
  (Desktop und Mobil).

---

© Solvera Sales GmbH
