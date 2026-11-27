-- =========================================================================
--  Solvera Akademie – Erweiterung: Abgleich mit dem Horizon CRM
--  -------------------------------------------------------------------------
--  Einmal im SQL Editor ausführen, NACH erweiterung-dashboard.sql.
--  Wiederholbar.
--
--  Die Edge Function "crm-abgleich" meldet sich mit den in Supabase
--  hinterlegten Zugangsdaten im CRM an, zählt Leads und Stornos je Partner
--  und Tag und schreibt NUR diese Zahlen in crm_zahlen. Kundendaten werden
--  nicht gespeichert.
-- =========================================================================

-- Name des Partners im CRM („Erstellt von“), falls er vom Akademie-Namen abweicht
alter table public.profile add column if not exists crm_name text not null default '';

create table if not exists public.crm_zahlen (
  nutzer_id        uuid not null references public.profile (id) on delete cascade,
  datum            date not null,
  leads            int  not null default 0,
  stornos          int  not null default 0,
  aktualisiert_am  timestamptz not null default now(),
  primary key (nutzer_id, datum)
);

-- Verteilung je Tag: {"status": {"Qualifiziert": 3, …}, "pv_status": {…}, "call_status": {…}}
alter table public.crm_zahlen add column if not exists werte jsonb not null default '{}'::jsonb;

create table if not exists public.crm_abgleiche (
  id                bigint generated always as identity primary key,
  zeit              timestamptz not null default now(),
  ok                boolean not null,
  leads             int not null default 0,
  zugeordnet        int not null default 0,
  nicht_zugeordnet  jsonb not null default '{}'::jsonb,   -- CRM-Name → Anzahl Leads
  meldung           text not null default ''
);

-- Einstellungen, z. B. welche CRM-Status als Storno zählen
create table if not exists public.einstellungen (
  schluessel  text primary key,
  wert        jsonb not null default '{}'::jsonb
);

alter table public.crm_zahlen    enable row level security;
alter table public.crm_abgleiche enable row level security;
alter table public.einstellungen enable row level security;

drop policy if exists crm_zahlen_lesen on public.crm_zahlen;
create policy crm_zahlen_lesen on public.crm_zahlen for select using (nutzer_id = auth.uid() or public.ist_admin());
drop policy if exists crm_abgleiche_lesen on public.crm_abgleiche;
create policy crm_abgleiche_lesen on public.crm_abgleiche for select using (public.ist_admin());
drop policy if exists einstellungen_admin on public.einstellungen;
create policy einstellungen_admin on public.einstellungen for all using (public.ist_admin()) with check (public.ist_admin());

grant select on public.crm_zahlen, public.crm_abgleiche to authenticated;
grant select, insert, update, delete on public.einstellungen to authenticated;
revoke all on public.crm_zahlen, public.crm_abgleiche, public.einstellungen from anon;
