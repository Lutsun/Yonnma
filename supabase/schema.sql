-- Yonnma — schéma de base de données
--
-- À exécuter dans l'éditeur SQL de ton projet Supabase (Project > SQL Editor
-- > New query), ou via `supabase db push` si tu utilises la CLI plus tard.
--
-- Architecture volontairement simple : 6 tables.
--   operators   -> les réseaux de transport (Tata AFTU, Dakar Dem Dikk, ...)
--   lines       -> les lignes de bus (ex: "Ligne 40", "B1")
--   stops       -> les arrêts, avec leur position GPS (PostGIS)
--   line_stops  -> l'ordre des arrêts sur chaque ligne
--   users       -> les comptes Yonnma (téléphone + nom, pas de mot de passe)
--   user_trips  -> les trajets recherchés / enregistrés par un utilisateur

-- 1. PostGIS gère tout ce qui est géographique : distances, "arrêt le plus
--    proche", tracés de ligne. Supabase l'a déjà intégré, on l'active juste.
create extension if not exists postgis;

-- 2. Réseaux de transport --------------------------------------------------
create table if not exists operators (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- "Dakar Dem Dikk"
  short_name text not null unique,  -- "DDD"
  color text not null,              -- couleur pour l'afficher sur la carte
  created_at timestamptz not null default now()
);

-- 3. Lignes -----------------------------------------------------------------
create table if not exists lines (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators (id) on delete cascade,
  code text not null,                -- "B1", "Ligne 40"
  name text not null,                -- "Petersen ↔ Préfecture de Guédiawaye"
  color text,                        -- couleur spécifique (sinon celle de l'opérateur)
  created_at timestamptz not null default now()
);

create index if not exists lines_operator_id_idx on lines (operator_id);
create unique index if not exists lines_operator_code_idx on lines (operator_id, code);

-- 4. Arrêts -------------------------------------------------------------
create table if not exists stops (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,         -- "Place de la Nation"
  location geography(point, 4326) not null,
  created_at timestamptz not null default now()
);

-- Index géographique : indispensable pour les requêtes "arrêts proches de moi"
create index if not exists stops_location_idx on stops using gist (location);

-- 5. Ordre des arrêts sur chaque ligne ---------------------------------
create table if not exists line_stops (
  line_id uuid not null references lines (id) on delete cascade,
  stop_id uuid not null references stops (id) on delete cascade,
  sequence int not null,             -- 1, 2, 3... position sur la ligne
  primary key (line_id, sequence)
);

create index if not exists line_stops_stop_id_idx on line_stops (stop_id);

-- Vue pratique : le tracé complet de chaque ligne, reconstruit à partir de
-- ses arrêts dans l'ordre (une LineString PostGIS). Permet de dessiner
-- chaque ligne sur la carte sans dupliquer la donnée.
create or replace view line_paths as
select
  l.id as line_id,
  l.code,
  l.name,
  st_makeline(array_agg(s.location::geometry order by ls.sequence)) as path
from lines l
join line_stops ls on ls.line_id = l.id
join stops s on s.id = ls.stop_id
group by l.id, l.code, l.name;

-- Fonction : arrêts les plus proches d'un point donné (position de
-- l'utilisateur), triés par distance. C'est ce que l'écran d'accueil
-- appelle pour afficher les arrêts autour de soi.
create or replace function nearby_stops(
  lat double precision,
  lng double precision,
  radius_meters int default 1500
)
returns table (
  id uuid,
  name text,
  latitude double precision,
  longitude double precision,
  distance_meters double precision,
  lines text[]
)
language sql
stable
as $$
  select
    s.id,
    s.name,
    st_y(s.location::geometry) as latitude,
    st_x(s.location::geometry) as longitude,
    st_distance(s.location, st_setsrid(st_point(lng, lat), 4326)::geography) as distance_meters,
    coalesce(
      (select array_agg(l.code order by l.code)
       from line_stops ls
       join lines l on l.id = ls.line_id
       where ls.stop_id = s.id),
      '{}'
    ) as lines
  from stops s
  where st_dwithin(s.location, st_setsrid(st_point(lng, lat), 4326)::geography, radius_meters)
  order by distance_meters asc;
$$;

-- 6. Utilisateurs -------------------------------------------------------
-- Connexion par téléphone + code SMS uniquement (voir services/auth.ts) —
-- pas de mot de passe, pas d'e-mail requis.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,        -- format international, ex: +221771234567
  full_name text not null,
  city text,
  created_at timestamptz not null default now()
);

-- 7. Trajets recherchés / enregistrés par un utilisateur -----------------
create table if not exists user_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  origin_label text not null,
  origin_location geography(point, 4326) not null,
  destination_label text not null,
  destination_location geography(point, 4326) not null,
  is_saved boolean not null default false,   -- true = "Maison", "Travail"... enregistré exprès
  created_at timestamptz not null default now()
);

create index if not exists user_trips_user_id_idx on user_trips (user_id);

-- 8. Sécurité (Row Level Security) ---------------------------------------
-- Les données de transport (lignes, arrêts) sont publiques en lecture.
-- Les données utilisateur sont privées.
alter table operators enable row level security;
alter table lines enable row level security;
alter table stops enable row level security;
alter table line_stops enable row level security;
alter table users enable row level security;
alter table user_trips enable row level security;

create policy "Lecture publique des opérateurs" on operators for select using (true);
create policy "Lecture publique des lignes" on lines for select using (true);
create policy "Lecture publique des arrêts" on stops for select using (true);
create policy "Lecture publique des arrêts de ligne" on line_stops for select using (true);

-- ⚠️ Comme l'app utilise sa propre connexion téléphone+SMS (et non Supabase
-- Auth), on ne peut pas encore filtrer "l'utilisateur courant" avec auth.uid().
-- Ces policies restent ouvertes pour le moment — à resserrer quand l'app
-- passera par Supabase Auth (téléphone) ou un jeton signé côté serveur.
create policy "Lecture des utilisateurs (temporaire)" on users for select using (true);
create policy "Création de compte (temporaire)" on users for insert with check (true);
create policy "Mise à jour de compte (temporaire)" on users for update using (true);

create policy "Lecture des trajets (temporaire)" on user_trips for select using (true);
create policy "Création de trajet (temporaire)" on user_trips for insert with check (true);
create policy "Suppression de trajet (temporaire)" on user_trips for delete using (true);
