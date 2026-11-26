-- =========================================================================
--  Solvera Akademie – Erweiterung: Leistungs-Dashboard und Mitteilungen
--  -------------------------------------------------------------------------
--  Einmal im Supabase-Dashboard ausführen (SQL Editor → New query → Run),
--  NACH einrichtung.sql. Wiederholbar, ändert vorhandene Daten nicht.
--
--  Neu:
--    tagesberichte       Türen je Tag: nicht angetroffen, angetroffen ohne
--                        Abschluss, Abschlüsse (geklingelt = Summe)
--    bewertungen         Stärken/Schwächen-Werte je Partner (FIFA-Karte)
--    mitteilungen        Hinweise, die bei Partnern als Fenster aufpoppen
--    mitteilung_gelesen  Wer hat gelesen, wer hat was geantwortet
-- =========================================================================

-- ---------- Tagesberichte ------------------------------------------------
create table if not exists public.tagesberichte (
  nutzer_id          uuid not null references public.profile (id) on delete cascade,
  datum              date not null,
  nicht_angetroffen  int  not null default 0 check (nicht_angetroffen >= 0),
  angetroffen_ohne   int  not null default 0 check (angetroffen_ohne >= 0),
  abschluesse        int  not null default 0 check (abschluesse >= 0),
  notiz              text not null default '',
  aktualisiert_am    timestamptz not null default now(),
  primary key (nutzer_id, datum)
);
create index if not exists tagesberichte_datum_idx on public.tagesberichte (datum);

-- ---------- Bewertungen (FIFA-Karte) -------------------------------------
-- werte: {"eroeffnung": 70, "bedarf": 65, "einwand": 60, "abschluss": 72,
--         "wissen": 80, "disziplin": 85}  (je 1–99)
create table if not exists public.bewertungen (
  nutzer_id        uuid primary key references public.profile (id) on delete cascade,
  werte            jsonb not null default '{}'::jsonb,
  staerken         text  not null default '',
  schwaechen       text  not null default '',
  aktualisiert_am  timestamptz not null default now()
);

-- ---------- Mitteilungen -------------------------------------------------
create table if not exists public.mitteilungen (
  id                  uuid primary key default gen_random_uuid(),
  art                 text not null default 'info' check (art in ('info', 'schulung', 'powerwoche', 'anfrage')),
  titel               text not null,
  text                text not null default '',
  an_alle             boolean not null default true,
  empfaenger          uuid[] not null default '{}',
  antwort_erwuenscht  boolean not null default false,
  erstellt_am         timestamptz not null default now()
);

create table if not exists public.mitteilung_gelesen (
  mitteilung_id  uuid not null references public.mitteilungen (id) on delete cascade,
  nutzer_id      uuid not null references public.profile (id) on delete cascade,
  gelesen_am     timestamptz not null default now(),
  antwort        text not null default '',
  primary key (mitteilung_id, nutzer_id)
);

-- ---------- Automatik ----------------------------------------------------
create or replace function public.zeitstempel() returns trigger
language plpgsql as $$
begin new.aktualisiert_am := now(); return new; end $$;

drop trigger if exists tagesbericht_zeit on public.tagesberichte;
create trigger tagesbericht_zeit before insert or update on public.tagesberichte
  for each row execute function public.zeitstempel();
drop trigger if exists bewertung_zeit on public.bewertungen;
create trigger bewertung_zeit before insert or update on public.bewertungen
  for each row execute function public.zeitstempel();

-- Antwort auf eine Mitteilung → Meldung an den Admin
create or replace function public.antwort_melden() returns trigger
language plpgsql security definer set search_path = public as $$
declare wer text; was text;
begin
  if new.antwort = '' or (tg_op = 'UPDATE' and old.antwort = new.antwort) then return new; end if;
  select trim(vorname || ' ' || nachname) into wer from public.profile where id = new.nutzer_id;
  select titel into was from public.mitteilungen where id = new.mitteilung_id;
  insert into public.meldungen (art, nutzer_id, inhalt_id, text)
  values ('antwort', new.nutzer_id, new.mitteilung_id,
          coalesce(wer, 'Ein Partner') || ' hat auf „' || coalesce(was, 'eine Mitteilung') || '“ geantwortet: '
          || left(new.antwort, 300));
  return new;
end $$;

drop trigger if exists antwort_meldung on public.mitteilung_gelesen;
create trigger antwort_meldung after insert or update on public.mitteilung_gelesen
  for each row execute function public.antwort_melden();

-- ---------- Zeilenrechte -------------------------------------------------
alter table public.tagesberichte      enable row level security;
alter table public.bewertungen        enable row level security;
alter table public.mitteilungen       enable row level security;
alter table public.mitteilung_gelesen enable row level security;

drop policy if exists bericht_lesen   on public.tagesberichte;
drop policy if exists bericht_anlegen on public.tagesberichte;
drop policy if exists bericht_aendern on public.tagesberichte;
drop policy if exists bericht_loeschen on public.tagesberichte;
create policy bericht_lesen    on public.tagesberichte for select using (nutzer_id = auth.uid() or public.ist_admin());
create policy bericht_anlegen  on public.tagesberichte for insert with check ((nutzer_id = auth.uid() and public.ist_aktiv()) or public.ist_admin());
create policy bericht_aendern  on public.tagesberichte for update using ((nutzer_id = auth.uid() and public.ist_aktiv()) or public.ist_admin());
create policy bericht_loeschen on public.tagesberichte for delete using (public.ist_admin());

drop policy if exists bewertung_lesen  on public.bewertungen;
drop policy if exists bewertung_pflege on public.bewertungen;
create policy bewertung_lesen  on public.bewertungen for select using (nutzer_id = auth.uid() or public.ist_admin());
create policy bewertung_pflege on public.bewertungen for all using (public.ist_admin()) with check (public.ist_admin());

drop policy if exists mitteilung_lesen  on public.mitteilungen;
drop policy if exists mitteilung_pflege on public.mitteilungen;
create policy mitteilung_lesen  on public.mitteilungen for select
  using (public.ist_admin() or (public.ist_aktiv() and (an_alle or auth.uid() = any (empfaenger))));
create policy mitteilung_pflege on public.mitteilungen for all using (public.ist_admin()) with check (public.ist_admin());

drop policy if exists gelesen_lesen   on public.mitteilung_gelesen;
drop policy if exists gelesen_anlegen on public.mitteilung_gelesen;
drop policy if exists gelesen_aendern on public.mitteilung_gelesen;
create policy gelesen_lesen   on public.mitteilung_gelesen for select using (nutzer_id = auth.uid() or public.ist_admin());
create policy gelesen_anlegen on public.mitteilung_gelesen for insert with check (nutzer_id = auth.uid() and public.ist_aktiv());
create policy gelesen_aendern on public.mitteilung_gelesen for update using (nutzer_id = auth.uid() and public.ist_aktiv());

grant select, insert, update, delete
  on public.tagesberichte, public.bewertungen, public.mitteilungen, public.mitteilung_gelesen
  to authenticated;
revoke all on public.tagesberichte, public.bewertungen, public.mitteilungen, public.mitteilung_gelesen from anon;
