// =========================================================================
//  Solvera Akademie – Abgleich mit dem Horizon CRM
//  -------------------------------------------------------------------------
//  Meldet sich mit hinterlegten Zugangsdaten im CRM an, holt die Leads der
//  letzten Tage und zählt je Partner („Erstellt von“) und Tag die Leads und
//  Stornos. Gespeichert werden NUR diese Zahlen (Tabelle crm_zahlen), keine
//  Kundendaten.
//
//  Aufruf (POST, JSON-Body):
//    { "modus": "pruefen" }   zeigt Felder, Status-Werte und Namen aus dem CRM
//                             (ohne Kundendaten), speichert nichts
//    { "modus": "abgleich" }  zählt und speichert (Standard)
//    { "tage": 90 }           Zeitraum, Standard 90 Tage
//
//  Erlaubt für: angemeldete Admins der Akademie (Authorization: Bearer <Token>)
//  oder den nächtlichen Zeitplan (Header x-geheimnis = ABGLEICH_GEHEIMNIS).
//
//  Secrets (Supabase → Edge Functions → Secrets):
//    CRM_EMAIL, CRM_PASSWORT   Zugangsdaten für das Horizon CRM
//    CRM_URL                   optional, Standard https://energieplus.horizoncrm.de
//    ABGLEICH_GEHEIMNIS        beliebige lange Zeichenkette für den Zeitplan
//  SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase selbst bereit.
// =========================================================================

const CRM = (Deno.env.get('CRM_URL') || 'https://energieplus.horizoncrm.de').replace(/\/+$/, '');
const SB = Deno.env.get('SUPABASE_URL')!;
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-geheimnis',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const antwort = (daten: unknown, status = 200) =>
  new Response(JSON.stringify(daten), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ---------- Datenbank (mit Dienstschlüssel, umgeht die Zeilenrechte) ----------
async function db(pfad: string, opt: { methode?: string; daten?: unknown; prefer?: string } = {}) {
  const r = await fetch(`${SB}/rest/v1/${pfad}`, {
    method: opt.methode || 'GET',
    headers: {
      apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json',
      ...(opt.prefer ? { Prefer: opt.prefer } : {}),
    },
    body: opt.daten === undefined ? undefined : JSON.stringify(opt.daten),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Datenbank ${r.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function berechtigt(req: Request): Promise<boolean> {
  const geheim = Deno.env.get('ABGLEICH_GEHEIMNIS');
  if (geheim && req.headers.get('x-geheimnis') === geheim) return true;
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const u = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: SR, Authorization: auth } });
  if (!u.ok) return false;
  const nutzer = await u.json();
  const p = await db(`profile?select=rolle,status&id=eq.${nutzer.id}`);
  return !!(p && p[0] && p[0].rolle === 'admin' && p[0].status === 'aktiv');
}

// ---------- CRM ----------
async function crmAnmelden(): Promise<string> {
  const email = Deno.env.get('CRM_EMAIL'), passwort = Deno.env.get('CRM_PASSWORT');
  if (!email || !passwort) throw new Error('CRM_EMAIL und CRM_PASSWORT sind in Supabase nicht hinterlegt.');
  const r = await fetch(`${CRM}/api/login/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password: passwort }),
  });
  const j = await r.json().catch(() => ({}));
  const token = j?.data?.token;
  if (!r.ok || !token) throw new Error('Anmeldung im CRM fehlgeschlagen: ' + (j?.message || `Status ${r.status}`));
  return token;
}

// Die Antwort der Liste kann unterschiedlich verpackt sein – alle üblichen Formen abdecken
function listeAus(j: any): any[] {
  const d = j?.data ?? j;
  for (const k of ['results', 'items', 'leads', 'rows', 'data']) if (Array.isArray(d?.[k])) return d[k];
  return Array.isArray(d) ? d : [];
}

async function alleLeads(token: string, ab: string): Promise<any[]> {
  const alle: any[] = [];
  const groesse = 200;
  for (let seite = 1; seite <= 200; seite++) {
    const url = `${CRM}/api/leads/?page=${seite}&page_size=${groesse}&date_from=${ab}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    if (!r.ok) throw new Error(`Leads konnten nicht geladen werden (Status ${r.status}).`);
    const liste = listeAus(await r.json());
    alle.push(...liste);
    if (liste.length < groesse) break;
  }
  return alle;
}

const DATUMSFELDER = ['erstellt', 'created_at', 'erstellt_am', 'created', 'datum'];
const STATUSFELDER = ['status', 'pv_status', 'wp_status', 'call_status', 'lead_type'];

function datumVon(lead: any): string | null {
  for (const f of DATUMSFELDER) {
    const v = lead?.[f];
    if (!v) continue;
    const s = String(v);
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);   // 26.11.2026
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}
const erstellerVon = (lead: any) => String(lead?.erstellt_von_name ?? lead?.erstellt_von ?? '').trim();
const klein = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// ---------- Ablauf ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!(await berechtigt(req))) return antwort({ ok: false, meldung: 'Nicht erlaubt.' }, 401);
    const body = await req.json().catch(() => ({}));
    const modus = body.modus === 'pruefen' ? 'pruefen' : 'abgleich';
    const tage = Math.min(365, Math.max(1, Number(body.tage) || 90));
    const ab = new Date(Date.now() - (tage - 1) * 86400000).toISOString().slice(0, 10);

    const token = await crmAnmelden();
    const leads = await alleLeads(token, ab);

    if (modus === 'pruefen') {
      // Nur Strukturinformationen, keine Kundendaten
      const werte: Record<string, Record<string, number>> = {};
      for (const f of STATUSFELDER) werte[f] = {};
      const ersteller: Record<string, number> = {};
      for (const l of leads) {
        for (const f of STATUSFELDER) {
          if (l?.[f] === undefined || l?.[f] === null || l?.[f] === '') continue;
          const v = String(l[f]); werte[f][v] = (werte[f][v] || 0) + 1;
        }
        const e = erstellerVon(l) || '(ohne Namen)'; ersteller[e] = (ersteller[e] || 0) + 1;
      }
      return antwort({
        ok: true, modus, ab, anzahl: leads.length,
        felder: leads[0] ? Object.keys(leads[0]).sort() : [],
        datumErkannt: leads.filter((l) => datumVon(l)).length,
        werte, ersteller,
      });
    }

    // Storno-Regeln: Liste von "feld=wert"
    const einst = await db('einstellungen?select=wert&schluessel=eq.crm_storno');
    const regeln: string[] = (einst?.[0]?.wert?.regeln as string[]) || [];
    const istStorno = (l: any) => regeln.some((r) => {
      const [f, ...rest] = r.split('='); return String(l?.[f] ?? '') === rest.join('=');
    });

    // CRM-Namen den Partnern zuordnen: zuerst crm_name, sonst „Vorname Nachname“
    const profile = await db('profile?select=id,vorname,nachname,crm_name&rolle=eq.partner');
    const zuordnung = new Map<string, string>();
    for (const p of profile) {
      zuordnung.set(klein(`${p.vorname} ${p.nachname}`), p.id);
      if (p.crm_name) zuordnung.set(klein(p.crm_name), p.id);
    }

    const zahlen = new Map<string, { nutzer_id: string; datum: string; leads: number; stornos: number }>();
    const fehlt: Record<string, number> = {};
    let zugeordnet = 0;
    for (const l of leads) {
      const name = erstellerVon(l);
      const id = zuordnung.get(klein(name));
      const tag = datumVon(l);
      if (!id || !tag) { const k = name || '(ohne Namen)'; fehlt[k] = (fehlt[k] || 0) + 1; continue; }
      zugeordnet++;
      const k = `${id}|${tag}`;
      const z = zahlen.get(k) || { nutzer_id: id, datum: tag, leads: 0, stornos: 0 };
      z.leads++; if (istStorno(l)) z.stornos++;
      zahlen.set(k, z);
    }

    // Zeitraum ersetzen: alte Zahlen löschen, neue schreiben
    await db(`crm_zahlen?datum=gte.${ab}`, { methode: 'DELETE' });
    const zeilen = [...zahlen.values()];
    for (let i = 0; i < zeilen.length; i += 500) {
      await db('crm_zahlen', { methode: 'POST', daten: zeilen.slice(i, i + 500) });
    }

    const meldung = regeln.length ? '' : 'Noch keine Storno-Status gewählt – Stornos werden als 0 gezählt.';
    await db('crm_abgleiche', { methode: 'POST', daten: {
      ok: true, leads: leads.length, zugeordnet, nicht_zugeordnet: fehlt, meldung } });
    return antwort({ ok: true, modus, ab, leads: leads.length, zugeordnet, nicht_zugeordnet: fehlt, meldung });
  } catch (e) {
    const meldung = e instanceof Error ? e.message : String(e);
    try { await db('crm_abgleiche', { methode: 'POST', daten: { ok: false, meldung } }); } catch { /* egal */ }
    return antwort({ ok: false, meldung }, 500);
  }
});
