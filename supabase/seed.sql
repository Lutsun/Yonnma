-- Yonnma — données de démarrage (réelles)
--
-- Sources : sites officiels Sunu BRT (sunubrt.sn) et Dakar Dem Dikk
-- (demdikk.sn/reseau-urbain-dakar), pages de lignes AFTU référencées par
-- Moovit/TransitRun, coordonnées vérifiées via OpenStreetMap (Nominatim).
--
-- Un petit nombre d'arrêts de la ligne B1 (Scat Urbam, Cardinal Hyacinthe
-- Thiandoum, Police des Parcelles, Croisement 22, Ndingala, Dalal Jam,
-- Liberté 1) n'ont pas de fiche OpenStreetMap dédiée : leur position a été
-- estimée par interpolation entre les arrêts voisins connus, en suivant
-- l'ordre officiel de la ligne. À corriger dès qu'un relevé GPS réel est
-- disponible.
--
-- Cars rapides et Ndiaga Ndiaye n'ont pas de lignes numérotées officielles
-- (réseau informel, sans horaires fixes) : ils sont donc présents comme
-- opérateurs mais sans lignes pour l'instant.
--
-- À exécuter après schema.sql, dans l'éditeur SQL Supabase.

-- 1. Opérateurs ------------------------------------------------------------
insert into operators (name, short_name, color) values
  ('Sunu BRT', 'BRT', '#00A99D'),
  ('Dakar Dem Dikk', 'DDD', '#1D4ED8'),
  ('Tata AFTU', 'AFTU', '#F59E0B'),
  ('Cars rapides', 'Car rapide', '#FBBF24'),
  ('Ndiaga Ndiaye', 'Ndiaga Ndiaye', '#6B7280')
on conflict do nothing;

-- 2. Arrêts ------------------------------------------------------------
insert into stops (name, location) values
  ('Petersen (Papa Gueye Fall)', st_setsrid(st_point(-17.4413132, 14.6758838), 4326)),
  ('Grande Mosquée', st_setsrid(st_point(-17.4424605, 14.6782131), 4326)),
  ('Place de la Nation', st_setsrid(st_point(-17.4482726, 14.6942894), 4326)),
  ('Dial Diop', st_setsrid(st_point(-17.4535223, 14.6994005), 4326)),
  ('Grand Dakar', st_setsrid(st_point(-17.4541088, 14.7054642), 4326)),
  ('Liberté 1', st_setsrid(st_point(-17.4614890, 14.7084630), 4326)),
  ('Sacré Cœur', st_setsrid(st_point(-17.4688689, 14.7114619), 4326)),
  ('Liberté 5', st_setsrid(st_point(-17.4640285, 14.7210269), 4326)),
  ('Liberté 6', st_setsrid(st_point(-17.4591751, 14.7262978), 4326)),
  ('Khar Yalla', st_setsrid(st_point(-17.4526828, 14.7314881), 4326)),
  ('Scat Urbam', st_setsrid(st_point(-17.4499230, 14.7370480), 4326)),
  ('Cardinal Hyacinthe Thiandoum', st_setsrid(st_point(-17.4471630, 14.7426080), 4326)),
  ('Grand Médine', st_setsrid(st_point(-17.4444035, 14.7481682), 4326)),
  ('Police des Parcelles', st_setsrid(st_point(-17.4424210, 14.7519150), 4326)),
  ('Croisement 22', st_setsrid(st_point(-17.4404380, 14.7556610), 4326)),
  ('Parcelles Assainies', st_setsrid(st_point(-17.4384546, 14.7594072), 4326)),
  ('Ndingala', st_setsrid(st_point(-17.4261850, 14.7655140), 4326)),
  ('Golf Sud', st_setsrid(st_point(-17.4139148, 14.7716198), 4326)),
  ('Dalal Jam', st_setsrid(st_point(-17.4088140, 14.7742920), 4326)),
  ('Golf Nord', st_setsrid(st_point(-17.4037138, 14.7769634), 4326)),
  ('Préfecture de Guédiawaye', st_setsrid(st_point(-17.3868755, 14.7719567), 4326)),
  ('Place Leclerc', st_setsrid(st_point(-17.4278024, 14.6720230), 4326)),
  ('Sandaga', st_setsrid(st_point(-17.4377179, 14.6699219), 4326)),
  ('Palais de Justice', st_setsrid(st_point(-17.4438206, 14.6703514), 4326)),
  ('Ouakam', st_setsrid(st_point(-17.4850662, 14.7247367), 4326)),
  ('Gare de Dakar', st_setsrid(st_point(-17.4336834, 14.6764636), 4326)),
  ('Yoff Village', st_setsrid(st_point(-17.4681490, 14.7603583), 4326)),
  ('Grand Mbao', st_setsrid(st_point(-17.3166792, 14.7312408), 4326)),
  ('Stade Léopold Sédar Senghor', st_setsrid(st_point(-17.4519140, 14.7467717), 4326)),
  ('Rufisque', st_setsrid(st_point(-17.2738440, 14.7164170), 4326))
on conflict do nothing;

-- 3. Lignes et leur tracé (arrêts dans l'ordre) --------------------------

-- Sunu BRT — Ligne B1 (omnibus), Petersen ↔ Préfecture de Guédiawaye, 21 arrêts
with op as (select id from operators where short_name = 'BRT'),
     ln as (
       insert into lines (operator_id, code, name, color)
       select id, 'B1', 'Petersen ↔ Préfecture de Guédiawaye', '#00A99D' from op
       on conflict (operator_id, code) do nothing
       returning id
     ),
     ordered_stops (name, seq) as (
       values
         ('Petersen (Papa Gueye Fall)', 1), ('Grande Mosquée', 2),
         ('Place de la Nation', 3), ('Dial Diop', 4), ('Grand Dakar', 5),
         ('Liberté 1', 6), ('Sacré Cœur', 7), ('Liberté 5', 8),
         ('Liberté 6', 9), ('Khar Yalla', 10), ('Scat Urbam', 11),
         ('Cardinal Hyacinthe Thiandoum', 12), ('Grand Médine', 13),
         ('Police des Parcelles', 14), ('Croisement 22', 15),
         ('Parcelles Assainies', 16), ('Ndingala', 17), ('Golf Sud', 18),
         ('Dalal Jam', 19), ('Golf Nord', 20), ('Préfecture de Guédiawaye', 21)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq
from ordered_stops os
join stops s on s.name = os.name
cross join ln;

-- Dakar Dem Dikk — Ligne 1, Parcelles Assainies ↔ Place Leclerc
with op as (select id from operators where short_name = 'DDD'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 1', 'Parcelles Assainies ↔ Place Leclerc' from op
       on conflict (operator_id, code) do nothing
       returning id
     ),
     ordered_stops (name, seq) as (
       values ('Parcelles Assainies', 1), ('Sandaga', 2), ('Place Leclerc', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

-- Dakar Dem Dikk — Ligne 4, Liberté 5 ↔ Place Leclerc
with op as (select id from operators where short_name = 'DDD'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 4', 'Liberté 5 ↔ Place Leclerc' from op
       on conflict (operator_id, code) do nothing
       returning id
     ),
     ordered_stops (name, seq) as (
       values ('Liberté 5', 1), ('Place Leclerc', 2)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

-- Dakar Dem Dikk — Ligne 7, Ouakam ↔ Palais de Justice
with op as (select id from operators where short_name = 'DDD'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 7', 'Ouakam ↔ Palais de Justice' from op
       on conflict (operator_id, code) do nothing
       returning id
     ),
     ordered_stops (name, seq) as (
       values ('Ouakam', 1), ('Palais de Justice', 2)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

-- Dakar Dem Dikk — Ligne 9, Liberté 6 ↔ Palais de Justice (via Sacré Cœur)
with op as (select id from operators where short_name = 'DDD'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 9', 'Liberté 6 ↔ Palais de Justice' from op
       on conflict (operator_id, code) do nothing
       returning id
     ),
     ordered_stops (name, seq) as (
       values ('Liberté 6', 1), ('Sacré Cœur', 2), ('Palais de Justice', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

-- Tata AFTU — Ligne 3, Yoff Village ↔ Gare de Dakar
with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 3', 'Yoff Village ↔ Gare de Dakar' from op
       on conflict (operator_id, code) do nothing
       returning id
     ),
     ordered_stops (name, seq) as (
       values ('Yoff Village', 1), ('Gare de Dakar', 2)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

-- Tata AFTU — Ligne 40, Grand Mbao ↔ Petersen
with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 40', 'Grand Mbao ↔ Petersen' from op
       on conflict (operator_id, code) do nothing
       returning id
     ),
     ordered_stops (name, seq) as (
       values ('Grand Mbao', 1), ('Petersen (Papa Gueye Fall)', 2)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

-- Tata AFTU — Ligne 63, Stade Léopold Sédar Senghor ↔ Rufisque
with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 63', 'Stade Léopold Sédar Senghor ↔ Rufisque' from op
       on conflict (operator_id, code) do nothing
       returning id
     ),
     ordered_stops (name, seq) as (
       values ('Stade Léopold Sédar Senghor', 1), ('Rufisque', 2)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;
