// =========================================================================
//  Solvera Akademie – Meldungen per E-Mail an den Admin
//  -------------------------------------------------------------------------
//  Wird von einem Database Webhook aufgerufen, sobald in der Tabelle
//  "meldungen" eine neue Zeile entsteht (neue Registrierung, Video
//  abgeschlossen, Stufe abgeschlossen) und schickt sie per E-Mail weiter.
//
//  Versand über Resend (resend.com, Server in der EU wählbar).
//  Benötigte Secrets (Supabase → Edge Functions → Secrets):
//    RESEND_API_KEY   API-Schlüssel aus dem Resend-Konto
//    MELDUNG_AN       Empfänger, z. B. info@solvera-sales.com
//    MELDUNG_VON      Absender mit bestätigter Domain,
//                     z. B. "Solvera Akademie <akademie@solvera-sales.com>"
//    WEBHOOK_GEHEIMNIS  beliebige lange Zeichenkette; derselbe Wert steht im
//                     Webhook als HTTP-Header "x-geheimnis"
//    MELDUNG_ARTEN    optional, z. B. "registrierung,stufe" – dann kommen nur
//                     diese Arten per Mail (Standard: alle)
// =========================================================================

const BETREFF: Record<string, string> = {
  registrierung: 'Neue Registrierung in der Akademie',
  abgeschlossen: 'Video abgeschlossen',
  stufe: 'Stufe abgeschlossen',
};

Deno.serve(async (req) => {
  if (req.headers.get('x-geheimnis') !== Deno.env.get('WEBHOOK_GEHEIMNIS')) {
    return new Response('nicht erlaubt', { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const zeile = body?.record;
  if (!zeile || body?.type !== 'INSERT') return new Response('ignoriert');

  const arten = (Deno.env.get('MELDUNG_ARTEN') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (arten.length && !arten.includes(zeile.art)) return new Response('Art nicht abonniert');

  const zeit = new Date(zeile.erstellt_am || Date.now()).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
  const text = `${zeile.text}\n\n${zeit}\n\nÜbersicht aller Partner: im Admin-Bereich der Akademie.`;

  const antwort = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('MELDUNG_VON'),
      to: [Deno.env.get('MELDUNG_AN')],
      subject: `Akademie: ${BETREFF[zeile.art] || 'Neue Meldung'}`,
      text,
    }),
  });

  if (!antwort.ok) {
    console.error('Resend:', antwort.status, await antwort.text());
    return new Response('Versand fehlgeschlagen', { status: 502 });
  }
  return new Response('ok');
});
