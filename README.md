# Solvera Sales – Website

Statische Website für Solvera Sales (Inhaber Sami Bssiss), Teams deutschlandweit.
Kein Build-Schritt, kein Framework, kein Server, keine externen Requests.
Läuft unverändert auf GitHub Pages.

---

## ⚠️ Vor dem Livegang erledigen

| # | Was | Wo |
|---|-----|-----|
| 1 | Rechtsform ist ein **Einzelunternehmen** (Inhaber Sami Bssiss). Ändert sich das, Impressum und Datenschutzerklärung (Abschnitt 1) anpassen | `impressum.html`, `datenschutz.html` |
| 2 | **USt-IdNr.** eintragen, sobald erteilt | `impressum.html` |
| 4 | Nicht genutzte **Analyse-Dienste** aus Abschnitt 5 streichen | `datenschutz.html` |
| 5 | Tracking-IDs eintragen – erst dann erscheint der Cookie-Banner | `assets/js/config.js` |
| 6 | Angaben zur Förderung prüfen und Datum aktualisieren | `photovoltaik.html`, `#foerderung` |
| 7 | Anzahl der Vertriebspartner aktuell halten (derzeit 38) | `index.html`, `ueber-uns.html`, `photovoltaik-firmen.html` |
| 8 | Partner-Logos erst nach schriftlicher Freigabe einsetzen | `photovoltaik.html`, `#partner` |
| 9 | `datePosted` / `validThrough` der Stellenanzeige aktualisieren | `bewerben.html`, JSON-LD im `<head>` |
| 10 | Optional: Formulardienst anbinden – siehe „Formulare" | `assets/js/config.js` |

**Erledigt:** Hosting (GitHub Pages) und Fachpartner Energie Plus stehen in der
Datenschutzerklärung, ein Datenschutzbeauftragter ist nicht erforderlich.

## Seitenstruktur

Schwerpunkt der Website ist die Gewinnung von Vertriebspartnern. Die Navigation
lautet **Start · Bewerben · Photovoltaikanlage · Firmenkunden · Über uns**;
„Bewerben" ist als helle Schaltfläche hervorgehoben. Alle Angaben zur Position
stehen gebündelt auf `bewerben.html` und sind dort über eine Sprungmarken-Leiste
erreichbar. Der Photovoltaik-Rechner sitzt am Ende der Photovoltaik-Seite.

Die Telefonnummer steht im Impressum und in der Datenschutzerklärung (dort
gesetzlich vorgeschrieben) und als Anruf-Knopf auf `bewerben.html` – oben neben
dem WhatsApp-Knopf und im Kasten „Rückfragen vorab?“.

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

## Solvera Akademie (Schulungsbereich für Vertriebspartner)

`akademie.html` ist ein geschützter Bereich, in dem neue Vertriebspartner ausgebildet
werden. Verlinkt ist er in der Fußzeile jeder Seite als „Partner-Login (Akademie)“;
er trägt `noindex` und steht in `robots.txt` auf `Disallow`.

**Für Partner:** Registrieren → Freischaltung abwarten → Lektionen in drei Stufen
(Starter, Fortgeschritten, Profi) abarbeiten. Die nächste Stufe öffnet sich erst, wenn
die vorige abgeschlossen ist. Unter „Neuigkeiten“ stehen Wochenschulungen, Ansagen und
Termine (z. B. Teams-Meetings) mit „Teilnehmen“, „Ich bin dabei“ und Kalender-Datei.

**Für den Admin** (zusätzliche Menüpunkte):

| Bereich | Inhalt |
|---------|--------|
| Partner | Neue Registrierungen freischalten oder ablehnen, Tabelle aller Partner mit Stufe, Fortschritt, gesehenen Wochenschulungen und letzter Aktivität, Suche, Filter, CSV-Export. Klick auf einen Partner zeigt jede Lektion mit Datum. |
| Inhalte | Lektionen, Wochenschulungen, Ansagen und Termine anlegen, ändern, als Entwurf speichern, anheften, löschen. Zeigt, wie viele Partner etwas gesehen bzw. zugesagt haben. |
| Meldungen | „X hat sich registriert“, „X hat ‚Lektion‘ abgeschlossen“, „X hat Stufe Starter abgeschlossen“. Zähler im Menü, Abfrage jede Minute, auf Wunsch Desktop-Hinweis. Per E-Mail: siehe Schritt 6. |

**Wie „angesehen“ gemessen wird:** Gezählt werden die Sekunden, die tatsächlich
abgespielt wurden – Vorspulen zählt nicht. Erledigt ist eine Lektion erst, wenn das
Video **komplett** gesehen wurde (`config.js`, `akademie.abschlussAbProzent: 100`).
Selbst abhaken können Partner nichts. Deshalb sind nur messbare Videos erlaubt:
hochgeladene Videos, YouTube, Vimeo und direkte `.mp4`-Links. Eine Lektion lässt sich
nur mit Video veröffentlichen; die zehn Startlektionen sind Entwürfe, bis ein Video
drin ist.

### Demo-Modus

Solange in `assets/js/config.js` unter `akademie` nichts eingetragen ist, läuft die
Akademie im Demo-Modus mit Beispieldaten – alles bleibt im eigenen Browser.
Zugänge: `partner@demo.de` und `admin@demo.de`, Passwort `demo1234`. **Nicht für echte
Partner verwenden:** Jeder sähe nur seine eigenen Browserdaten.

### Einrichtung (einmalig, ca. 20 Minuten)

Konten und Fortschritte liegen bei [Supabase](https://supabase.com) (kostenloser Tarif
reicht für deutlich über hundert Partner).

1. **Projekt anlegen:** Auf supabase.com registrieren → *New project* → Region
   eine Region in der EU wählen (das Projekt läuft in **West EU, Irland**), Datenbank-Passwort sicher notieren.
2. **Datenbank einrichten:** In `supabase/einrichtung.sql` stehen unter `ADMIN_EMAILS`
   die Admin-Adressen (derzeit info@solvera-sales.com, info@solvera-sales.de und info@solvera-immobilien.de). Dann im Dashboard *SQL Editor → New query* den
   ganzen Inhalt einfügen und *Run*. Legt Tabellen, Rechte, Automatik und die zehn
   Startlektionen an.
3. **Adressen eintragen:** *Authentication → URL Configuration*
   * *Site URL*: `https://solvera-sales.com/akademie.html`
   * *Redirect URLs*: dieselbe Adresse und, solange die Domain noch nicht läuft,
     `https://samib40.github.io/Solvera/akademie.html`
   Dorthin führen die Links aus der Bestätigungs- und der Passwort-Mail.
4. **Schlüssel eintragen:** *Project Settings → API* → *Project URL* und den
   *anon public*-Schlüssel in `assets/js/config.js` unter `akademie` eintragen,
   committen, pushen. Der Demo-Hinweis verschwindet dann.
5. **Selbst registrieren** mit der Adresse aus Schritt 2 – dieses Konto ist sofort Admin.
   Danach unter *Inhalte* die Videos zu den Lektionen hochladen und jede Lektion
   veröffentlichen (Haken „Veröffentlicht“).
6. **Für eigene Videos auf den Pro-Tarif wechseln** (*Organization → Billing*, rund
   25 $ im Monat, aktuelle Preise auf supabase.com/pricing). Der kostenlose Tarif
   erlaubt nur Dateien bis 50 MB und 1 GB Speicher. Danach unter
   *Storage → Settings* die *Upload file size limit* auf z. B. 2 GB setzen.
7. **E-Mail bei jeder Meldung (optional, empfohlen):**
   1. Konto bei [Resend](https://resend.com) anlegen, Domain `solvera-sales.com`
      bestätigen, API-Schlüssel erzeugen.
   2. Supabase *Edge Functions → Deploy a new function → Via Editor*, Name
      `meldung-per-mail`, Inhalt von `supabase/functions/meldung-per-mail/index.ts`
      einfügen, deployen. In den Einstellungen der Funktion *Verify JWT* ausschalten
      (die Funktion prüft stattdessen einen eigenen geheimen Header).
   3. *Edge Functions → Secrets*: `RESEND_API_KEY`, `MELDUNG_AN`
      (z. B. `info@solvera-sales.com`), `MELDUNG_VON`
      (z. B. `Solvera Akademie <akademie@solvera-sales.com>`), `WEBHOOK_GEHEIMNIS`
      (lange Zufallszeichenkette). Wer nicht jede abgeschlossene Lektion als Mail
      will: `MELDUNG_ARTEN` = `registrierung,stufe`.
   4. *Database → Webhooks → Create*: Tabelle `meldungen`, Ereignis *Insert*, Typ
      *Supabase Edge Functions* → `meldung-per-mail`, HTTP-Header
      `x-geheimnis` mit dem Wert aus `WEBHOOK_GEHEIMNIS`.
8. **E-Mails an Partner zuverlässig machen:** Supabase verschickt Bestätigungs- und
   Passwort-Mails ab Werk nur in sehr kleiner Zahl pro Stunde. Unter
   *Authentication → Emails → SMTP Settings* den eigenen Versand eintragen (Resend
   bietet dafür SMTP-Zugangsdaten). Dort lassen sich auch die Mail-Texte auf Deutsch
   umstellen.
9. **Datenschutz:** Im Supabase-Dashboard (*Organization → Legal Documents*) den
   Vertrag zur Auftragsverarbeitung abschließen, ebenso mit Resend. Abschnitt 11 der
   Datenschutzerklärung beschreibt die Akademie bereits – bei abweichenden Diensten
   anpassen.

### Videos

**Hochladen:** *Inhalte* → Lektion oder Wochenschulung öffnen → **„Video hochladen“** →
Datei wählen → warten bis 100 % → **Speichern**. Geht auch vom Handy.

**Schutz vor Weitergabe:**

* Die Videos liegen im privaten Speicher-Bucket `videos`. Es gibt keine öffentliche
  Adresse; abspielen dürfen nur angemeldete, freigeschaltete Partner (geregelt in der
  Datenbank, nicht nur in der Oberfläche).
* Jede Wiedergabe bekommt eine eigene Adresse, die nach **3 Stunden verfällt**. Ein
  herauskopierter Link ist danach wertlos.
* Kein Download-Knopf, kein Rechtsklick-Menü, kein Bild-im-Bild.
* Optional: **Name und E-Mail des Zuschauers** halbtransparent im Bild
  (`config.js`, `akademie.wasserzeichen: true`). Derzeit ausgeschaltet.
* Gesperrte Partner kommen sofort an kein Video mehr.

Bildschirmaufnahmen verhindert nur DRM (wie bei Netflix), und auch das nicht auf jedem
Gerät; Abfilmen mit einem zweiten Handy verhindert nichts.

**Dateigröße:** Am besten MP4 in 720p oder 1080p. Ein 10-Minuten-Video vom Handy hat
oft 500 MB bis 1 GB; exportiert in 720p (z. B. mit dem kostenlosen HandBrake,
Voreinstellung „Fast 720p30“) sind es meist 80–150 MB. Kleinere Dateien laden bei den
Partnern unterwegs schneller und schonen das Datenvolumen des Tarifs.

**Kosten grob überschlagen:** 40 Partner × 10 Lektionen × 120 MB ≈ 48 GB
Datenverkehr für eine komplette Ausbildungsrunde, dazu je Wochenschulung etwa 5 GB.
Das liegt innerhalb dessen, was im Pro-Tarif enthalten ist.

Weiterhin möglich: statt hochzuladen einen YouTube- oder Vimeo-Link eintragen. Solche
Links lassen sich aber weitergeben.

### Wissenswert

* Rechte regelt die Datenbank selbst (Row Level Security): Partner sehen nur ihre
  eigenen Daten und Inhalte erst nach Freischaltung, nur der Admin sieht alle.
* Ein gesperrter Partner kommt nicht mehr an die Inhalte. Ein Konto endgültig löschen:
  Supabase *Authentication → Users* – Profil und Fortschritt verschwinden mit.
* Weitere Admins: im SQL Editor
  `update public.profile set rolle = 'admin' where email = '…';`
* Die Messung läuft im Browser. Gegen Vorspulen und Überspringen ist sie sicher,
  gegen gezielte Manipulation durch Programmierkundige, die die Schnittstelle von
  Hand ansprechen, nicht vollständig.
* Die Akademie ist nicht Teil von `vorschau.html`; zum Ansehen `akademie.html` direkt öffnen.

| Datei | Zweck |
|-------|-------|
| `akademie.html` | Seite der Akademie |
| `assets/css/akademie.css` | zusätzliche Gestaltung |
| `assets/js/akademie.js` | Oberfläche, Ansichten, Admin-Bereich |
| `assets/js/akademie-daten.js` | Anbindung an Supabase bzw. Demo-Daten |
| `assets/js/akademie-video.js` | Player, Wasserzeichen und Messung für hochgeladene Videos, YouTube, Vimeo |
| `supabase/einrichtung.sql` | Datenbank, Rechte, Meldungen, Startlektionen |
| `supabase/functions/meldung-per-mail/` | E-Mail-Versand der Meldungen |

---

## Formulare

Alle drei Formulare (Photovoltaik-Rechner, Bewerbung, Firmenanfrage) laufen über
dieselbe Logik in `assets/js/forms.js`.

### Ohne Server – so funktioniert es

GitHub Pages liefert nur fertige Dateien aus. Dort läuft kein Programm, das ein
Formular entgegennehmen könnte – ein Formular kann seine Daten also nicht von
selbst verschicken. Die Seite löst das so:

1. Der Besucher füllt aus und klickt auf Absenden.
2. Der Browser prüft die Eingaben und stellt daraus eine fertige Nachricht zusammen.
3. Der Besucher bekommt sie angezeigt und schickt sie mit einem Klick ab –
   **per E-Mail**, **per WhatsApp** oder indem er den Text **kopiert**.

Das ist die Voreinstellung. Sie braucht keinen Vertrag, keinen Dienstleister und
kein Konto, setzt keine Cookies und sendet nichts an Dritte – die Angaben
verlassen den Browser erst, wenn der Besucher sich für einen Weg entscheidet.

### Optional: Versand im Hintergrund

Bequemer wird es mit einem Formulardienst: Dann geht die Anfrage direkt raus und
der Besucher landet auf der Dankeseite. Dafür in `assets/js/config.js` eintragen,
wohin gesendet werden soll:

```js
endpoints: {
  lead:      'https://formspree.io/f/xxxxxxxx',   // Photovoltaik-Rechner
  bewerbung: 'https://formspree.io/f/yyyyyyyy',   // Bewerbungen
  firmen:    'https://formspree.io/f/zzzzzzzz'    // Photovoltaik-Fachbetriebe
}
```

Es funktioniert jede Adresse, die einen `POST` mit JSON annimmt – Formspree,
Web3Forms, FormSubmit, Make, Zapier, n8n oder ein eigener Cloudflare Worker.

Ist ein Ziel eingetragen, aber nicht erreichbar, fällt die Seite von selbst auf
den Weg über E-Mail und WhatsApp zurück. Der Besucher steht also nie vor einer
Fehlermeldung.

> **Vorher klären:** Mit dem Anbieter muss ein Vertrag zur Auftragsverarbeitung
> nach Art. 28 DSGVO geschlossen und der Dienst in der Datenschutzerklärung
> genannt werden – bei Bewerberdaten besonders wichtig. Sitzt der Anbieter
> außerhalb der EU, gehört die Grundlage der Übermittlung dazu. Solange das
> nicht geklärt ist: Felder leer lassen, die Seite funktioniert auch so.

### Dankeseiten

`danke.html` (Bewerbung), `danke-firmen.html` und `danke-beratung.html`. Sie
werden nur angesteuert, wenn oben ein Ziel eingetragen ist. Alle drei tragen
`noindex`.

### Lebenslauf

Das Upload-Feld wurde entfernt: Ohne Server lässt sich kein Anhang übertragen,
und ein Feld, das stillschweigend nichts tut, ist schlimmer als keines. Unter dem
Formular steht stattdessen der Hinweis, Unterlagen formlos per E-Mail
nachzureichen.

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
wappen-panther-hell.svg    Wappen mit den zwei Panthern, Vektorgrafik, Gold für Hell
wappen-panther-dunkel.svg  dasselbe mit hellerem Gold für die dunkle Darstellung
```

Das Wappen wurde aus dem Foto der Goldprägung als Vektorgrafik nachgezeichnet
und bleibt dadurch in jeder Größe scharf. Liefert der Designer eine eigene
SVG-Datei, beide Dateien damit ersetzen.

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

**Aktiv ist derzeit nur Google Analytics 4** (Mess-ID `G-QN5MY3MVJ6`). Meta- und
TikTok-Pixel sind leer und deshalb auch aus der Datenschutzerklärung gestrichen.

Zusätzlich zu den Seitenaufrufen zählt `consent.js` diese Ereignisse (nur nach
Einwilligung; zu finden in Google Analytics unter Berichte → Interaktion → Ereignisse):

| Ereignis | Wann |
|----------|------|
| `klick_bewerben` | Klick auf einen Link zu `bewerben.html` oder `#formular` |
| `klick_whatsapp` | Klick auf einen WhatsApp-Knopf |
| `klick_anruf` | Klick auf die Telefonnummer |
| `klick_email` | Klick auf die E-Mail-Adresse |
| `klick_firmenkunden` | Klick auf einen Link zu `photovoltaik-firmen.html` |
| `klick_knopf` | jeder andere Knopf (`.btn`), mit dessen Text |
| `bewerbung_abgeschickt` | Bewerbungsformular vollständig ausgefüllt und abgeschickt |
| `firmenanfrage_abgeschickt` | Anfrage von Firmenkunden abgeschickt |
| `beratungsanfrage_abgeschickt` | Anfrage aus dem Photovoltaik-Rechner abgeschickt |
| `rechner_genutzt` | Vergütungsrechner einmal je Seitenaufruf bewegt |

Jedes Ereignis trägt die Seite (`seite`), Klicks zusätzlich `link_text` und
`link_ziel`. Formularinhalte werden nicht übertragen.

---

## WhatsApp-Bewerbung

Die WhatsApp-Schaltflächen zeigen auf `wa.me/491725843019` mit vorformulierter
Nachricht. Dieselbe Nummer nutzt auch der Versandkasten unter den Formularen.

Beim Wechsel der Nummer sind diese Stellen zu ändern:

| Wo | Was |
|----|-----|
| `assets/js/config.js` | `kontakt.telefon` und `kontakt.whatsapp` |
| `bewerben.html` | `href` der beiden `.wa-btn`-Links, dazu zwei Anruf-Knöpfe (`tel:`-Link und Text) |
| `impressum.html`, `datenschutz.html` | Rufnummer im Text und im `tel:`-Link |

Auf den übrigen Seiten steht bewusst keine Rufnummer – der Kontakt läuft über
„Jetzt bewerben", E-Mail und WhatsApp.

---

## Inhalte pflegen

**Rechenwerte des PV-Rechners** (Strompreis, Einspeisevergütung, Kosten je kWp …)
stehen gesammelt in `assets/js/config.js` unter `calc`. Ändern sich Marktpreise,
genügt eine Anpassung dort – der Rechner übernimmt sie automatisch.

**Provision** (aktuell 70 € pro qualifiziertem Lead, dazu 200 € bei Abschluss und
weitere 200 €, wenn eine Wärmepumpe verbaut wird) steht ebenfalls in `config.js`
unter `provision`: `proLead`, `proAbschluss`, `abschlussquote` (derzeit 0.10),
`proWaermepumpe` und `waermepumpenquote` (derzeit 0.05). Der Vergütungsrechner
rechnet beide Boni mit diesen Quoten ein. Achtung: In den Fließtexten stehen die
Beträge und die Quote zusätzlich ausgeschrieben – bei einer Änderung mit
`grep -rn -e "70 €" -e "200 €" -e "470 €" -e "400 €" -e "10 %" -e "5 %" *.html` alle Stellen mitziehen,
auch die festen Beispielrechnungen (10 Leads × 15 Tage = 15.000 €).

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
team-moenes-manai.jpg     team-moenes-manai@small.jpg
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

## Veröffentlichen und eigene Domain

Die Website ist rein statisch. Es gibt keinen Build-Schritt – die Dateien werden
so genommen, wie sie im Repository liegen.

### GitHub Pages einschalten

Repository → **Settings → Pages** → als Quelle den Branch wählen, in dem die
Dateien liegen, Ordner `/ (root)`. Die Datei `.nojekyll` liegt bereits bei; ohne
sie würde GitHub Ordner mit Unterstrich ignorieren.

### Eigene Domain verbinden

1. Domain registrieren (vorgesehen ist `solvera-sales.com`).
2. Beim Domain-Anbieter im DNS eintragen:

   | Typ | Name | Wert |
   |-----|------|------|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `samib40.github.io` |

3. In **Settings → Pages → Custom domain** die Domain eintragen und speichern.
   GitHub legt dann selbst eine Datei `CNAME` im Repository an.
4. **Enforce HTTPS** anhaken, sobald das Zertifikat da ist. Das dauert nach dem
   DNS-Eintrag meist Minuten bis wenige Stunden.

> Die Datei `CNAME` nicht von Hand anlegen, solange die Domain nicht registriert
> ist. Sonst leitet GitHub Pages auf eine Domain um, die es noch nicht gibt –
> und `samib40.github.io/Solvera/` ist nicht mehr erreichbar.

### Andere Hoster

Auf klassischem Webspace (IONOS, Strato, All-Inkl) alle Dateien und den Ordner
`assets/` per FTP ins Wurzelverzeichnis legen. Bei Netlify oder Vercel das
Repository verbinden, Build-Command leer lassen, Publish-Directory `/`.

### Nach dem Umzug

In `sitemap.xml`, `robots.txt` sowie in den `canonical`- und `og:url`-Angaben
aller Seiten steht `https://solvera-sales.com/`. Bei abweichender Domain
diese Adresse überall ersetzen.

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

© Solvera Sales
