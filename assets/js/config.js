/* =========================================================================
   Solvera Sales – zentrale Konfiguration
   -------------------------------------------------------------------------
   HIER werden alle Einstellungen gepflegt. Kein anderer Code muss angefasst
   werden, wenn sich Kontaktdaten, Formularziele oder Rechenwerte aendern.
   ========================================================================= */

window.SOLVERA = {

  /* ---------------------------------------------------------------------
     1. FORMULAR-ZIELE
     ---------------------------------------------------------------------
     Die Website laeuft auf GitHub Pages. Dort liegen nur fertige Dateien,
     es gibt kein Programm, das ein Formular entgegennehmen koennte. Ein
     Formular kann seine Daten deshalb nicht von selbst verschicken.

     SOLANGE HIER NICHTS EINGETRAGEN IST, funktioniert die Seite trotzdem:
     Nach dem Absenden bekommt der Besucher seine Angaben sauber
     aufbereitet und schickt sie mit einem Klick per E-Mail oder WhatsApp –
     oder kopiert sie. Das kommt ohne fremde Dienste aus und ist damit
     datenschutzrechtlich unproblematisch.

     BEQUEMER wird es mit einem Formulardienst. Dann laeuft der Versand im
     Hintergrund und der Besucher landet direkt auf der Dankeseite. Dafuer
     hier die Adresse eintragen, an die gesendet werden soll, zum Beispiel:

       Formspree     'https://formspree.io/f/xxxxxxxx'
       Web3Forms     'https://api.web3forms.com/submit'   (Zugangsschluessel
                     zusaetzlich als verstecktes Feld access_key im Formular)
       FormSubmit    'https://formsubmit.co/ajax/info@solvera-sales.de'
       Eigene Loesung  jede Adresse, die POST mit JSON annimmt
                       (Make, Zapier, n8n, Cloudflare Worker ...)

     WICHTIG vor dem Einschalten: Mit dem Anbieter muss ein Vertrag zur
     Auftragsverarbeitung nach Art. 28 DSGVO geschlossen und der Dienst in
     der Datenschutzerklaerung genannt werden. Sitzt der Anbieter ausserhalb
     der EU, ist zusaetzlich die Grundlage der Uebermittlung anzugeben.
     Solange das nicht geklaert ist, diese Felder leer lassen.
     --------------------------------------------------------------------- */
  endpoints: {
    lead:       '',   // Anfragen aus dem Photovoltaik-Rechner
    bewerbung:  '',   // Bewerbungen von Vertriebspartnern
    firmen:     ''    // Anfragen von Photovoltaik-Fachbetrieben
  },

  /* Seite, auf der der Besucher nach dem Absenden landet.
     Gilt nur, wenn oben eine Adresse eingetragen ist. */
  danke: {
    lead:       'danke-beratung.html',
    bewerbung:  'danke.html',
    firmen:     'danke-firmen.html'
  },

  /* Empfaenger der Formulare und Kontaktdaten der Website */
  kontakt: {
    email:    'info@solvera-sales.de',
    telefon:  '+4917645163460',
    whatsapp: '4917645163460',   // internationale Schreibweise, ohne + und ohne Leerzeichen
    firma:    'Solvera Sales GmbH'
  },

  /* ---------------------------------------------------------------------
     1b. TRACKING & COOKIE-EINWILLIGUNG
     ---------------------------------------------------------------------
     WICHTIG: Tracking wird ausschliesslich nach ausdruecklicher Einwilligung
     des Besuchers geladen (Art. 6 Abs. 1 lit. a DSGVO, § 25 TDDDG).
     Solange hier keine ID eingetragen ist, wird der Cookie-Banner gar nicht
     erst angezeigt – die Seite bleibt dann vollstaendig trackingfrei.

     Google Analytics 4:  Mess-ID aus dem GA4-Konto, Format "G-XXXXXXXXXX"
     Meta-Pixel:          Pixel-ID aus dem Meta Business Manager, nur Ziffern
     TikTok-Pixel:        Pixel-ID aus dem TikTok Ads Manager
     --------------------------------------------------------------------- */
  tracking: {
    ga4:    '',   // z. B. 'G-XXXXXXXXXX'
    meta:   '',   // z. B. '1234567890123456'
    tiktok: '',   // z. B. 'CXXXXXXXXXXXXXXXXXXX'

    /* Speicherdauer der Einwilligungsentscheidung in Tagen */
    speicherdauerTage: 182
  },

  /* ---------------------------------------------------------------------
     1c. SOCIAL MEDIA
     ---------------------------------------------------------------------
     Sobald ein Profil steht, hier die vollstaendige URL eintragen – das
     passende Symbol erscheint dann automatisch in der Fusszeile und im
     Mobilmenue. Leere Felder werden uebersprungen, es entstehen also keine
     toten Links. Reihenfolge der Anzeige = Reihenfolge in dieser Liste.
     --------------------------------------------------------------------- */
  social: {
    instagram: '',   // z. B. 'https://www.instagram.com/solvera.sales'
    tiktok:    '',   // z. B. 'https://www.tiktok.com/@solvera.sales'
    linkedin:  '',   // z. B. 'https://www.linkedin.com/company/solvera-sales'
    facebook:  '',   // z. B. 'https://www.facebook.com/solverasales'
    youtube:   ''    // z. B. 'https://www.youtube.com/@solverasales'
  },

  /* ---------------------------------------------------------------------
     2. RECHENWERTE DES PV-RECHNERS
     ---------------------------------------------------------------------
     Marktueblichen Durchschnittswerte. Bei Bedarf hier anpassen – die
     Ergebnisse im Rechner aktualisieren sich automatisch.
     --------------------------------------------------------------------- */
  calc: {
    strompreis:        0.35,   // EUR je kWh (Haushaltsstrom)
    strompreisSteigung: 0.02,  // angenommene jaehrliche Steigerung (2 %)
    einspeiseverguetung: 0.0786, // EUR je kWh (Teileinspeisung)
    ertragProKwp:      950,    // kWh je kWp und Jahr (Deutschland-Mittel)
    kostenProKwp:      1500,   // EUR Investition je kWp (schluesselfertig)
    kostenProKwhSpeicher: 700, // EUR je kWh Speicherkapazitaet
    kostenWallbox:     1400,   // EUR fuer Wallbox inkl. Installation
    eigenverbrauchOhneSpeicher: 0.30, // Anteil des Ertrags, der selbst genutzt wird
    eigenverbrauchMitSpeicher:  0.65,
    mehrbedarfWallbox:    2500, // kWh Mehrverbrauch pro Jahr
    mehrbedarfWaermepumpe: 3500,
    co2ProKwh:         0.38,   // kg CO2 je kWh Netzstrom (Strommix DE)
    betrachtungszeitraum: 25,  // Jahre
    kwpMin: 3,
    kwpMax: 100
  },

  /* ---------------------------------------------------------------------
     3. VERDIENST-RECHNER (Karriereseite)
     --------------------------------------------------------------------- */
  provision: {
    proLead: 70,        // EUR je qualifiziertem Lead
    tageProMonat: 20    // uebliche Einsatztage pro Monat
  }
};
