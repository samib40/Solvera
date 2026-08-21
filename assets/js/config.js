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
     Trage hier deine Formspree-Endpoints ein (kostenlos anlegen unter
     https://formspree.io  ->  New Form  ->  Endpoint kopieren).
     Beispiel: "https://formspree.io/f/xayzabcd"

     Solange die Felder leer sind, funktioniert die Seite trotzdem: die
     Formulare oeffnen dann automatisch das E-Mail-Programm des Besuchers
     mit allen ausgefuellten Daten (Fallback, siehe forms.js).

     Statt Formspree kann hier auch jede andere URL stehen, die POST mit
     JSON annimmt (eigenes Backend, Make, Zapier, HubSpot, n8n ...).
     --------------------------------------------------------------------- */
  endpoints: {
    lead:       '',   // Anfragen aus dem PV-Rechner
    bewerbung:  '',   // Bewerbungen von Vertriebspartnern
    firmen:     ''    // Anfragen von Photovoltaik-Fachbetrieben
  },

  /* Empfaenger fuer den E-Mail-Fallback (wenn oben nichts eingetragen ist) */
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
