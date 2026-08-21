<?php
/* =========================================================================
   Solvera Sales GmbH – Formularempfang

   Nimmt die drei Formulare der Website entgegen, prueft die Angaben und
   stellt sie per E-Mail an die im Abschnitt EINSTELLUNGEN hinterlegte
   Adresse zu. Anschliessend wird auf die passende Dankeseite geleitet.

   Es werden keine Daten gespeichert und keine fremden Dienste eingebunden:
   die Angaben verlassen den eigenen Server nur als E-Mail an die eigene
   Adresse. Das haelt die Verarbeitung datenschutzrechtlich einfach.

   Voraussetzung: PHP 7.4 oder neuer mit aktiver mail()-Funktion. Das ist
   bei praktisch jedem Webhosting-Paket der Fall (Strato, IONOS, All-Inkl,
   Hetzner, Mittwald und andere).

   Einbindung: Datei in dasselbe Verzeichnis wie index.html legen. Mehr ist
   nicht noetig – assets/js/config.js verweist bereits hierher.
   ========================================================================= */

/* --------------------------------------------------------------- EINSTELLUNGEN */

$EMPFAENGER = 'info@solvera-sales.de';

/* Absenderadresse. MUSS zur eigenen Domain gehoeren, sonst stufen viele
   Postfaecher die Nachricht als Spam ein oder lehnen sie ab. */
$ABSENDER = 'website@solvera-sales.de';
$ABSENDER_NAME = 'Solvera Sales Website';

/* Groesste zulaessige Anhangsgroesse in Megabyte */
$MAX_MB = 5;

/* Fruehestens erlaubter Abstand zwischen zwei Sendungen derselben
   IP-Adresse, in Sekunden. 0 schaltet die Sperre ab. */
$SPERRE_SEKUNDEN = 20;

/* Formularart => [ Betreff, Dankeseite ] */
$ARTEN = array(
    'bewerbung' => array('Neue Bewerbung als Vertriebspartner',            'danke.html'),
    'firmen'    => array('Neue Anfrage eines Photovoltaik-Fachbetriebs',   'danke-firmen.html'),
    'lead'      => array('Neue Anfrage über den Photovoltaik-Rechner',     'danke-beratung.html'),
);

/* Lesbare Beschriftungen. Felder, die hier nicht stehen, werden mit ihrem
   technischen Namen ausgegeben. */
$BESCHRIFTUNGEN = array(
    'vorname' => 'Vorname', 'nachname' => 'Nachname', 'name' => 'Name',
    'email' => 'E-Mail', 'telefon' => 'Telefon', 'plz' => 'PLZ',
    'standort' => 'Standort', 'start' => 'Gewünschter Start',
    'erfahrung' => 'Vertriebserfahrung', 'nachricht' => 'Nachricht',
    'firma' => 'Unternehmen', 'ansprechpartner' => 'Ansprechpartner',
    'position' => 'Position', 'region' => 'Region',
    'menge' => 'Lead-Bedarf pro Monat',
    'haus' => 'Gebäudetyp', 'dach' => 'Dachausrichtung',
    'stromkosten' => 'Stromkosten pro Monat',
    'extras' => 'Zusätzlich geplant',
    'anlage_kwp' => 'Empfohlene Anlagengröße (kWp)',
    'speicher_kwh' => 'Empfohlener Speicher (kWh)',
    'ersparnis_jahr' => 'Ersparnis pro Jahr (EUR)',
    'ertrag_kwh' => 'Stromertrag pro Jahr (kWh)',
    'autarkie' => 'Autarkiegrad (%)',
    'amortisation' => 'Amortisation (Jahre)',
    'datenschutz' => 'Datenschutzerklärung akzeptiert',
    'einwilligung' => 'Datenschutzerklärung akzeptiert',
    'lebenslauf' => 'Lebenslauf',
    'seite' => 'Abgesendet auf Seite',
);

/* Technische Felder, die nicht in die E-Mail gehoeren */
$INTERN = array('website', 'formular', '_subject', 'art');

/* --------------------------------------------------------------- HILFSMITTEL */

/** Antwortet je nach Aufrufer als JSON oder als Weiterleitung. */
function antworten($erfolg, $text, $ziel = null)
{
    $willJson = (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'json') !== false)
        || (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'fetch');

    if ($willJson) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($erfolg ? 200 : 400);
        echo json_encode(array('ok' => $erfolg, 'text' => $text, 'weiter' => $ziel),
            JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($erfolg && $ziel) {
        header('Location: ' . $ziel, true, 303);
        exit;
    }

    http_response_code($erfolg ? 200 : 400);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><meta charset="utf-8"><title>Solvera Sales</title>'
       . '<body style="background:#0b0b0d;color:#eee;font:16px/1.6 system-ui;padding:48px">'
       . '<p>' . htmlspecialchars($text, ENT_QUOTES, 'UTF-8') . '</p>'
       . '<p><a style="color:#c0a16b" href="index.html">Zurück zur Startseite</a></p>';
    exit;
}

/** Entfernt Zeilenumbrueche, damit niemand eigene Kopfzeilen einschleusen kann. */
function kopfzeile_sicher($wert)
{
    return trim(str_replace(array("\r", "\n", "\0", '%0a', '%0d'), ' ', (string) $wert));
}

/** Liest die uebergebenen Felder – gleich ob als Formular oder als JSON. */
function eingang_lesen()
{
    if (!empty($_POST)) {
        return $_POST;
    }
    $roh = file_get_contents('php://input');
    if ($roh === '' || $roh === false) {
        return array();
    }
    $daten = json_decode($roh, true);
    return is_array($daten) ? $daten : array();
}

/* --------------------------------------------------------------- ABLAUF */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    antworten(false, 'Dieses Formular nimmt nur abgesendete Daten entgegen.');
}

$daten = eingang_lesen();

/* 1. Spam-Falle: das unsichtbare Feld darf nicht ausgefuellt sein.
      Automaten fuellen es aus. Wir melden Erfolg, senden aber nichts. */
if (!empty($daten['website'])) {
    $art = isset($daten['art']) ? (string) $daten['art'] : 'lead';
    $ziel = isset($ARTEN[$art]) ? $ARTEN[$art][1] : 'danke.html';
    antworten(true, 'Vielen Dank.', $ziel);
}

/* 2. Formularart bestimmen */
$art = isset($daten['art']) ? (string) $daten['art'] : '';
if (!isset($ARTEN[$art])) {
    $art = 'lead';
}
list($betreff, $dankeseite) = $ARTEN[$art];

/* 3. Pflichtangaben pruefen */
$email = isset($daten['email']) ? trim((string) $daten['email']) : '';
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    antworten(false, 'Bitte geben Sie eine gültige E-Mail-Adresse an.');
}

$name = trim(
    (isset($daten['vorname']) ? $daten['vorname'] . ' ' : '') .
    (isset($daten['nachname']) ? $daten['nachname'] : '') .
    (isset($daten['name']) && !isset($daten['vorname']) ? $daten['name'] : '')
);
if ($name === '') {
    $name = $email;
}

/* 4. Einfache Sperre gegen Massenversand */
if ($SPERRE_SEKUNDEN > 0) {
    $kennung = sha1(($_SERVER['REMOTE_ADDR'] ?? '') . '|solvera');
    $merker = sys_get_temp_dir() . '/solvera-' . $kennung;
    if (is_file($merker) && (time() - filemtime($merker)) < $SPERRE_SEKUNDEN) {
        antworten(false, 'Ihre Anfrage wurde bereits übermittelt. Bitte warten Sie einen Moment.');
    }
    @touch($merker);
}

/* 5. Text der E-Mail zusammenstellen */
$zeilen = array();
foreach ($daten as $feld => $wert) {
    if (in_array($feld, $INTERN, true) || $wert === '' || $wert === null) {
        continue;
    }
    if (is_array($wert)) {
        $wert = implode(', ', $wert);
    }
    $titel = isset($BESCHRIFTUNGEN[$feld]) ? $BESCHRIFTUNGEN[$feld] : $feld;
    $zeilen[] = $titel . ': ' . trim((string) $wert);
}

$text = $betreff . "\n"
      . str_repeat('=', mb_strlen($betreff, 'UTF-8')) . "\n\n"
      . implode("\n", $zeilen) . "\n\n"
      . "-- \n"
      . "Eingegangen am " . date('d.m.Y \u\m H:i') . " Uhr\n"
      . "IP-Adresse: " . ($_SERVER['REMOTE_ADDR'] ?? 'unbekannt') . "\n"
      . "Gesendet über das Formular auf solvera-sales.de\n";

/* 6. Anhang, falls ein Lebenslauf mitgeschickt wurde */
$anhang = null;
if (!empty($_FILES['lebenslauf']['tmp_name']) && $_FILES['lebenslauf']['error'] === UPLOAD_ERR_OK) {
    $datei = $_FILES['lebenslauf'];
    if ($datei['size'] > $MAX_MB * 1024 * 1024) {
        antworten(false, 'Die angehängte Datei ist größer als ' . $MAX_MB . ' MB.');
    }
    $erlaubt = array('pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png');
    $endung = strtolower(pathinfo($datei['name'], PATHINFO_EXTENSION));
    if (!in_array($endung, $erlaubt, true)) {
        antworten(false, 'Bitte senden Sie den Lebenslauf als PDF, Word-Datei oder Bild.');
    }
    $anhang = array(
        'name' => preg_replace('/[^A-Za-z0-9._-]/', '_', basename($datei['name'])),
        'inhalt' => file_get_contents($datei['tmp_name']),
    );
}

/* 7. Nachricht aufbauen und senden */
$absenderName = kopfzeile_sicher($ABSENDER_NAME);
$kopf = array(
    'From: =?UTF-8?B?' . base64_encode($absenderName) . '?= <' . $ABSENDER . '>',
    'Reply-To: =?UTF-8?B?' . base64_encode(kopfzeile_sicher($name)) . '?= <' . kopfzeile_sicher($email) . '>',
    'MIME-Version: 1.0',
);

if ($anhang === null) {
    $kopf[] = 'Content-Type: text/plain; charset=UTF-8';
    $kopf[] = 'Content-Transfer-Encoding: base64';
    $koerper = chunk_split(base64_encode($text));
} else {
    $grenze = '=_solvera_' . bin2hex(random_bytes(12));
    $kopf[] = 'Content-Type: multipart/mixed; boundary="' . $grenze . '"';
    $koerper =
        "--" . $grenze . "\r\n"
      . "Content-Type: text/plain; charset=UTF-8\r\n"
      . "Content-Transfer-Encoding: base64\r\n\r\n"
      . chunk_split(base64_encode($text)) . "\r\n"
      . "--" . $grenze . "\r\n"
      . "Content-Type: application/octet-stream; name=\"" . $anhang['name'] . "\"\r\n"
      . "Content-Transfer-Encoding: base64\r\n"
      . "Content-Disposition: attachment; filename=\"" . $anhang['name'] . "\"\r\n\r\n"
      . chunk_split(base64_encode($anhang['inhalt'])) . "\r\n"
      . "--" . $grenze . "--";
}

$betreffKopf = '=?UTF-8?B?' . base64_encode(kopfzeile_sicher($betreff . ' – ' . $name)) . '?=';

$gesendet = @mail(
    $EMPFAENGER,
    $betreffKopf,
    $koerper,
    implode("\r\n", $kopf),
    '-f' . $ABSENDER
);

if (!$gesendet) {
    antworten(false, 'Der Versand ist technisch fehlgeschlagen. '
        . 'Bitte schreiben Sie uns direkt an ' . $EMPFAENGER . '.');
}

antworten(true, 'Vielen Dank für Ihre Nachricht.', $dankeseite);
