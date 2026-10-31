-- =========================================================================
--  Solvera Akademie – Datenbank einrichten
--  -------------------------------------------------------------------------
--  Einmal komplett im Supabase-Dashboard ausführen:
--  Projekt → SQL Editor → New query → diesen Inhalt einfügen → Run.
--
--  Das Skript ist wiederholbar: Ein zweiter Lauf ändert nichts an
--  vorhandenen Konten, Lektionen oder Fortschritten.
--
--  ► Admin-Adressen: Wer sich mit einer der Adressen in ADMIN_EMAILS
--    (Funktion neues_konto weiter unten) registriert, wird automatisch
--    Admin und sofort freigeschaltet.
-- =========================================================================


-- ---------- 1. Tabellen --------------------------------------------------

-- Ein Profil je Konto. Wird beim Registrieren automatisch angelegt.
create table if not exists public.profile (
  id                 uuid primary key references auth.users (id) on delete cascade,
  email              text not null,
  vorname            text not null default '',
  nachname           text not null default '',
  telefon            text not null default '',
  region             text not null default '',
  rolle              text not null default 'partner' check (rolle in ('partner', 'admin')),
  status             text not null default 'wartend' check (status in ('wartend', 'aktiv', 'gesperrt')),
  erstellt_am        timestamptz not null default now(),
  letzte_aktivitaet  timestamptz
);

-- Lektionen des Ausbildungsplans in drei Stufen.
create table if not exists public.lektionen (
  id               uuid primary key default gen_random_uuid(),
  stufe            text not null check (stufe in ('starter', 'fortgeschritten', 'profi')),
  reihenfolge      int  not null default 1,
  titel            text not null,
  beschreibung     text not null default '',
  inhalt           text not null default '',   -- Lernpunkte, ein Punkt je Zeile
  video_url        text not null default '',
  dauer_min        int  not null default 0,
  veroeffentlicht  boolean not null default true,
  erstellt_am      timestamptz not null default now()
);

-- Wochenschulungen, Ansagen und Termine (z. B. Teams-Meetings).
create table if not exists public.beitraege (
  id               uuid primary key default gen_random_uuid(),
  art              text not null check (art in ('woche', 'ansage', 'termin')),
  titel            text not null,
  text             text not null default '',
  video_url        text not null default '',
  termin_am        timestamptz,
  termin_dauer_min int  not null default 60,
  meeting_link     text not null default '',
  angeheftet       boolean not null default false,
  veroeffentlicht  boolean not null default true,
  erstellt_am      timestamptz not null default now()
);

-- Wer hat welches Video wie weit angesehen. inhalt_id zeigt auf eine
-- Lektion oder einen Beitrag (Wochenschulung).
create table if not exists public.fortschritt (
  nutzer_id         uuid not null references public.profile (id) on delete cascade,
  inhalt_id         uuid not null,
  art               text not null check (art in ('lektion', 'beitrag')),
  prozent           int  not null default 0 check (prozent between 0 and 100),
  sekunden          int  not null default 0,
  begonnen_am       timestamptz not null default now(),
  abgeschlossen_am  timestamptz,
  aktualisiert_am   timestamptz not null default now(),
  primary key (nutzer_id, inhalt_id)
);

-- Meldungen für den Admin: neue Registrierung, Video abgeschlossen ...
create table if not exists public.meldungen (
  id           bigint generated always as identity primary key,
  art          text not null,          -- registrierung | abgeschlossen | stufe
  nutzer_id    uuid references public.profile (id) on delete cascade,
  inhalt_id    uuid,
  text         text not null,
  gelesen      boolean not null default false,
  erstellt_am  timestamptz not null default now()
);

-- Zusagen zu Terminen („Ich bin dabei“).
create table if not exists public.zusagen (
  nutzer_id    uuid not null references public.profile (id) on delete cascade,
  beitrag_id   uuid not null references public.beitraege (id) on delete cascade,
  erstellt_am  timestamptz not null default now(),
  primary key (nutzer_id, beitrag_id)
);

create index if not exists fortschritt_inhalt_idx on public.fortschritt (inhalt_id);
create index if not exists meldungen_zeit_idx     on public.meldungen (erstellt_am desc);
create index if not exists lektionen_ordnung_idx  on public.lektionen (stufe, reihenfolge);


-- ---------- 2. Hilfsfunktionen für die Rechte ----------------------------
-- security definer, damit die Prüfung nicht selbst an den Zeilenrechten
-- der Tabelle profile hängen bleibt.

create or replace function public.ist_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profile
                 where id = auth.uid() and rolle = 'admin' and status = 'aktiv');
$$;

create or replace function public.ist_aktiv() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profile
                 where id = auth.uid() and status = 'aktiv');
$$;


-- ---------- 3. Automatik -------------------------------------------------

-- Neues Konto → Profil anlegen und Admin benachrichtigen.
create or replace function public.neues_konto() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ADMIN_EMAILS constant text[] := array['info@solvera-sales.com', 'info@solvera-immobilien.de'];  -- ◄ Admin-Adressen
  ist_chef boolean := lower(new.email) = any (ADMIN_EMAILS);
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profile (id, email, vorname, nachname, telefon, region, rolle, status)
  values (new.id, new.email,
          coalesce(m->>'vorname', ''), coalesce(m->>'nachname', ''),
          coalesce(m->>'telefon', ''), coalesce(m->>'region', ''),
          case when ist_chef then 'admin' else 'partner' end,
          case when ist_chef then 'aktiv' else 'wartend' end)
  on conflict (id) do nothing;

  if not ist_chef then
    insert into public.meldungen (art, nutzer_id, text)
    values ('registrierung', new.id,
            trim(coalesce(m->>'vorname', '') || ' ' || coalesce(m->>'nachname', ''))
            || ' hat sich registriert und wartet auf Freischaltung.');
  end if;
  return new;
end $$;

drop trigger if exists bei_neuem_konto on auth.users;
create trigger bei_neuem_konto after insert on auth.users
  for each row execute function public.neues_konto();

-- Partner dürfen Rolle und Status nicht selbst ändern.
create or replace function public.profil_schuetzen() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.ist_admin() then
    new.rolle  := old.rolle;
    new.status := old.status;
    new.email  := old.email;
  end if;
  return new;
end $$;

drop trigger if exists profil_schutz on public.profile;
create trigger profil_schutz before update on public.profile
  for each row execute function public.profil_schuetzen();

-- Fortschritt geht nie zurück: Prozent nur nach oben, ein Abschluss bleibt.
-- Eine Lektion ohne Video kann nicht abgeschlossen werden.
create or replace function public.fortschritt_festhalten() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.art = 'lektion' and new.prozent >= 100
     and exists (select 1 from public.lektionen where id = new.inhalt_id and video_url = '') then
    new.prozent := 99;
  end if;
  if tg_op = 'UPDATE' then
    new.prozent          := greatest(old.prozent, new.prozent);
    new.sekunden         := greatest(old.sekunden, new.sekunden);
    new.begonnen_am      := old.begonnen_am;
    new.abgeschlossen_am := coalesce(old.abgeschlossen_am, new.abgeschlossen_am);
  end if;
  if new.prozent >= 100 and new.abgeschlossen_am is null then
    new.abgeschlossen_am := now();
  end if;
  new.aktualisiert_am := now();
  return new;
end $$;

drop trigger if exists fortschritt_regeln on public.fortschritt;
create trigger fortschritt_regeln before insert or update on public.fortschritt
  for each row execute function public.fortschritt_festhalten();

-- Abschluss → Meldung an den Admin (und Stufen-Meldung, wenn komplett).
create or replace function public.abschluss_melden() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wer         text;
  was         text;
  welche      text;
  gesamt      int;
  erledigt    int;
  stufenname  text;
begin
  if new.abgeschlossen_am is null
     or (tg_op = 'UPDATE' and old.abgeschlossen_am is not null) then
    return new;
  end if;

  select trim(vorname || ' ' || nachname) into wer from public.profile where id = new.nutzer_id;
  update public.profile set letzte_aktivitaet = now() where id = new.nutzer_id;

  if new.art = 'lektion' then
    select titel, stufe into was, welche from public.lektionen where id = new.inhalt_id;
  else
    select titel into was from public.beitraege where id = new.inhalt_id;
  end if;

  insert into public.meldungen (art, nutzer_id, inhalt_id, text)
  values ('abgeschlossen', new.nutzer_id, new.inhalt_id,
          coalesce(wer, 'Ein Partner') || ' hat „' || coalesce(was, 'ein Video') || '“ abgeschlossen.');

  if welche is not null then
    select count(*) into gesamt from public.lektionen where stufe = welche and veroeffentlicht and video_url <> '';
    select count(*) into erledigt
      from public.fortschritt f join public.lektionen l on l.id = f.inhalt_id
     where f.nutzer_id = new.nutzer_id and l.stufe = welche and l.veroeffentlicht and l.video_url <> ''
       and f.abgeschlossen_am is not null;
    if gesamt > 0 and erledigt >= gesamt then
      stufenname := case welche when 'starter' then 'Starter'
                                when 'fortgeschritten' then 'Fortgeschritten'
                                else 'Profi' end;
      insert into public.meldungen (art, nutzer_id, text)
      values ('stufe', new.nutzer_id,
              coalesce(wer, 'Ein Partner') || ' hat die Stufe ' || stufenname || ' vollständig abgeschlossen.');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists abschluss_meldung on public.fortschritt;
create trigger abschluss_meldung after insert or update on public.fortschritt
  for each row execute function public.abschluss_melden();

-- Letzte Aktivität auch beim bloßen Anschauen mitschreiben.
create or replace function public.aktivitaet_merken() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profile set letzte_aktivitaet = now() where id = new.nutzer_id;
  return new;
end $$;

drop trigger if exists aktivitaet on public.fortschritt;
create trigger aktivitaet after insert or update on public.fortschritt
  for each row execute function public.aktivitaet_merken();


-- ---------- 4. Zeilenrechte (Row Level Security) -------------------------

alter table public.profile     enable row level security;
alter table public.lektionen   enable row level security;
alter table public.beitraege   enable row level security;
alter table public.fortschritt enable row level security;
alter table public.meldungen   enable row level security;
alter table public.zusagen     enable row level security;

-- Profile: jeder sieht sich selbst, der Admin sieht alle.
drop policy if exists profil_lesen   on public.profile;
drop policy if exists profil_aendern on public.profile;
drop policy if exists profil_loeschen on public.profile;
create policy profil_lesen   on public.profile for select using (id = auth.uid() or public.ist_admin());
create policy profil_aendern on public.profile for update using (id = auth.uid() or public.ist_admin());
create policy profil_loeschen on public.profile for delete using (public.ist_admin());

-- Lektionen und Beiträge: lesen nur freigeschaltete Partner, pflegen nur der Admin.
drop policy if exists lektion_lesen  on public.lektionen;
drop policy if exists lektion_pflege on public.lektionen;
create policy lektion_lesen  on public.lektionen for select
  using ((veroeffentlicht and public.ist_aktiv()) or public.ist_admin());
create policy lektion_pflege on public.lektionen for all
  using (public.ist_admin()) with check (public.ist_admin());

drop policy if exists beitrag_lesen  on public.beitraege;
drop policy if exists beitrag_pflege on public.beitraege;
create policy beitrag_lesen  on public.beitraege for select
  using ((veroeffentlicht and public.ist_aktiv()) or public.ist_admin());
create policy beitrag_pflege on public.beitraege for all
  using (public.ist_admin()) with check (public.ist_admin());

-- Fortschritt: eigener schreiben (nur wenn freigeschaltet), Admin liest alles.
drop policy if exists fortschritt_lesen    on public.fortschritt;
drop policy if exists fortschritt_anlegen  on public.fortschritt;
drop policy if exists fortschritt_aendern  on public.fortschritt;
create policy fortschritt_lesen   on public.fortschritt for select
  using (nutzer_id = auth.uid() or public.ist_admin());
create policy fortschritt_anlegen on public.fortschritt for insert
  with check (nutzer_id = auth.uid() and public.ist_aktiv());
create policy fortschritt_aendern on public.fortschritt for update
  using (nutzer_id = auth.uid() and public.ist_aktiv());

-- Meldungen: nur der Admin.
drop policy if exists meldung_admin on public.meldungen;
create policy meldung_admin on public.meldungen for all
  using (public.ist_admin()) with check (public.ist_admin());

-- Zusagen: eigene setzen und zurückziehen, Admin sieht alle.
drop policy if exists zusage_lesen   on public.zusagen;
drop policy if exists zusage_setzen  on public.zusagen;
drop policy if exists zusage_loeschen on public.zusagen;
create policy zusage_lesen   on public.zusagen for select using (nutzer_id = auth.uid() or public.ist_admin());
create policy zusage_setzen  on public.zusagen for insert with check (nutzer_id = auth.uid() and public.ist_aktiv());
create policy zusage_loeschen on public.zusagen for delete using (nutzer_id = auth.uid());


-- Zugriffsrechte für angemeldete Nutzer. Nötig, wenn beim Anlegen des
-- Projekts „Automatically expose new tables“ abgewählt wurde; schadet
-- sonst nicht. Wer was sehen darf, regeln die Zeilenrechte oben.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.profile, public.lektionen, public.beitraege,
     public.fortschritt, public.meldungen, public.zusagen
  to authenticated;
revoke all on public.profile, public.lektionen, public.beitraege,
              public.fortschritt, public.meldungen, public.zusagen
  from anon;
grant execute on function public.ist_admin(), public.ist_aktiv() to authenticated;


-- ---------- 4b. Privater Videospeicher ----------------------------------
-- Hochgeladene Schulungsvideos liegen im Bucket "videos". Er ist NICHT
-- öffentlich: Abspielen geht nur über eine zeitlich begrenzte Adresse, die
-- die Akademie für angemeldete, freigeschaltete Partner erzeugt.
-- Obergrenze je Datei: 2 GB (im Pro-Tarif; im kostenlosen Tarif gelten 50 MB).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 2147483648,
        array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists video_ansehen on storage.objects;
drop policy if exists video_hochladen on storage.objects;
drop policy if exists video_aendern on storage.objects;
drop policy if exists video_loeschen on storage.objects;
create policy video_ansehen   on storage.objects for select
  using (bucket_id = 'videos' and public.ist_aktiv());
create policy video_hochladen on storage.objects for insert
  with check (bucket_id = 'videos' and public.ist_admin());
create policy video_aendern   on storage.objects for update
  using (bucket_id = 'videos' and public.ist_admin());
create policy video_loeschen  on storage.objects for delete
  using (bucket_id = 'videos' and public.ist_admin());


-- ---------- 5. Startinhalte ----------------------------------------------
-- Ein Grundgerüst des Ausbildungsplans, angelegt als ENTWÜRFE: Partner
-- sehen eine Lektion erst, wenn im Admin-Bereich ein Video hochgeladen und
-- sie veröffentlicht wurde. Läuft nur, solange es noch keine Lektion gibt.

insert into public.lektionen (stufe, reihenfolge, titel, beschreibung, inhalt, dauer_min, veroeffentlicht)
select * from (values
  ('starter', 1, 'Willkommen bei Solvera Sales',
   'Wer wir sind, wie der Ablauf funktioniert und was dich in den ersten Wochen erwartet.',
   E'Unser Geschäftsmodell: qualifizierte Termine für Photovoltaik-Fachbetriebe\nDeine Vergütung: 70 € je qualifiziertem Lead plus Boni\nWer dein Ansprechpartner ist und wie du ihn erreichst', 8),
  ('starter', 2, 'Photovoltaik-Grundlagen',
   'Das technische Basiswissen, das du an jeder Haustür brauchst – verständlich erklärt.',
   E'Wie eine PV-Anlage Strom erzeugt\nkWp, Ertrag, Eigenverbrauch und Speicher\nWarum sich eine Anlage für Eigenheimbesitzer rechnet', 15),
  ('starter', 3, 'Der qualifizierte Lead',
   'Welche Kriterien ein Kontakt erfüllen muss, damit er vergütet wird.',
   E'Die sieben Qualitätskriterien unseres Fachpartners\nTypische Fehler, die einen Lead ungültig machen\nSaubere Erfassung der Kundendaten', 10),
  ('starter', 4, 'Dein erster Tag an der Tür',
   'Auftreten, Kleidung, Gebietsplanung und die ersten Sätze.',
   E'Vorbereitung und Ausrüstung\nDer Einstieg in den ersten 10 Sekunden\nGebiete sinnvoll ablaufen', 12),
  ('fortgeschritten', 1, 'Gesprächsleitfaden im Detail',
   'Der komplette Ablauf vom Klingeln bis zum vereinbarten Termin.',
   E'Aufbau des Gesprächs in fünf Phasen\nBedarf erkennen mit den richtigen Fragen\nDen Termin verbindlich festmachen', 18),
  ('fortgeschritten', 2, 'Einwandbehandlung',
   'Die häufigsten Einwände und wie du souverän darauf reagierst.',
   E'„Kein Interesse“, „Zu teuer“, „Muss ich mit meinem Partner besprechen“\nEinwand oder Vorwand unterscheiden\nRuhig bleiben und nachfragen', 20),
  ('fortgeschritten', 3, 'Förderung und Wirtschaftlichkeit',
   'Aktuelle Förderprogramme und eine einfache Beispielrechnung für das Gespräch.',
   E'Einspeisevergütung und Eigenverbrauch\nFörderprogramme und Steuervorteile\nAmortisation verständlich erklären', 15),
  ('profi', 1, 'Abschlussstarke Gesprächsführung',
   'Fortgeschrittene Techniken für mehr Termine pro Tag.',
   E'Kaufsignale erkennen\nEmpfehlungen aktiv einholen\nDie eigene Quote messen und verbessern', 22),
  ('profi', 2, 'Selbstorganisation und Zahlen',
   'Wie Top-Partner ihre Woche planen und ihre Kennzahlen im Blick behalten.',
   E'Tages- und Wochenziele setzen\nKontakte, Gespräche, Leads: die Trichter-Rechnung\nMotivation über Wochen hochhalten', 14),
  ('profi', 3, 'Vom Partner zur Teamleitung',
   'Was es braucht, um selbst neue Partner einzuarbeiten und ein Team zu führen.',
   E'Neue Partner begleiten und ausbilden\nVorbild an der Tür sein\nDer Weg im Entwicklungsmodell von Solvera Sales', 16)
) as v(stufe, reihenfolge, titel, beschreibung, inhalt, dauer_min)
cross join (values (false)) as e(veroeffentlicht)
where not exists (select 1 from public.lektionen);

-- ---------- 6. Admin nachträglich festlegen (bei Bedarf) -----------------
-- Falls du dich schon VOR dem Anpassen von ADMIN_EMAILS registriert hast,
-- diese Zeile mit deiner Adresse ausführen:
--
--   update public.profile set rolle = 'admin', status = 'aktiv'
--    where email = 'deine@adresse.de';
