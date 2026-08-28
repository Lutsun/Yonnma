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

-- 4. Extension du réseau — beaucoup plus de lignes réelles ----------------
--
-- Numéros de ligne et grandes étapes de parcours confirmés via les sites
-- officiels (demdikk.sn/reseau-urbain-dakar, aftu-senegal.org) et des relevés
-- de terrain croisés (Moovit, TransitRun). Les arrêts intermédiaires entre
-- deux points connus (ex: UCAD, Colobane) sont positionnés à leur emplacement
-- réel sur la carte de Dakar ; certains tracés simplifient l'itinéraire
-- officiel (qui dessert parfois plus d'arrêts) sur ses étapes principales.
-- Tarifs : ~200 FCFA (Dakar Dem Dikk), ~250 FCFA (Tata AFTU), 400 FCFA (BRT,
-- déjà à jour) — sources Senego / bus-senegal.sn.

update lines set fare_fcfa = 400 where operator_id = (select id from operators where short_name = 'BRT');
update lines set fare_fcfa = 200 where operator_id = (select id from operators where short_name = 'DDD');
update lines set fare_fcfa = 250 where operator_id = (select id from operators where short_name = 'AFTU');

-- 4.1 Nouveaux arrêts --------------------------------------------------
insert into stops (name, location) values
  ('UCAD', st_setsrid(st_point(-17.4603, 14.6928), 4326)),
  ('Point E', st_setsrid(st_point(-17.4650, 14.6975), 4326)),
  ('Fann Hock', st_setsrid(st_point(-17.4700, 14.6890), 4326)),
  ('Mermoz', st_setsrid(st_point(-17.4780, 14.7040), 4326)),
  ('Dieuppeul', st_setsrid(st_point(-17.4550, 14.7080), 4326)),
  ('Castors', st_setsrid(st_point(-17.4470, 14.7060), 4326)),
  ('Colobane', st_setsrid(st_point(-17.4460, 14.6820), 4326)),
  ('Marché Fass', st_setsrid(st_point(-17.4497, 14.6912), 4326)),
  ('Marché Tilène', st_setsrid(st_point(-17.4400, 14.6790), 4326)),
  ('Corniche Ouest', st_setsrid(st_point(-17.4750, 14.6850), 4326)),
  ('Stade Demba Diop', st_setsrid(st_point(-17.4600, 14.7180), 4326)),
  ('Grand Yoff', st_setsrid(st_point(-17.4660, 14.7290), 4326)),
  ('Almadies', st_setsrid(st_point(-17.5160, 14.7440), 4326)),
  ('Ngor', st_setsrid(st_point(-17.5090, 14.7460), 4326)),
  ('Aéroport Léopold Sédar Senghor', st_setsrid(st_point(-17.4900, 14.7500), 4326)),
  ('Cambérène', st_setsrid(st_point(-17.4380, 14.7480), 4326)),
  ('Thiaroye', st_setsrid(st_point(-17.3700, 14.7580), 4326)),
  ('Pikine', st_setsrid(st_point(-17.3980, 14.7550), 4326)),
  ('Keur Massar', st_setsrid(st_point(-17.3180, 14.7770), 4326)),
  ('Nelson Mandela', st_setsrid(st_point(-17.4300, 14.6650), 4326)),
  ('Gueule Tapée', st_setsrid(st_point(-17.4520, 14.6870), 4326))
on conflict do nothing;

-- 4.2 Lignes Dakar Dem Dikk existantes, enrichies avec leurs vrais arrêts
-- intermédiaires (source : demdikk.sn/reseau-urbain-dakar).

delete from line_stops where line_id = (
  select l.id from lines l join operators o on o.id = l.operator_id
  where o.short_name = 'DDD' and l.code = 'Ligne 1'
);
with ln as (select id from lines where code = 'Ligne 1' and operator_id = (select id from operators where short_name = 'DDD')),
     ordered_stops (name, seq) as (
       values ('Parcelles Assainies', 1), ('Grand Yoff', 2), ('UCAD', 3),
              ('Marché Tilène', 4), ('Sandaga', 5), ('Place Leclerc', 6)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

delete from line_stops where line_id = (
  select l.id from lines l join operators o on o.id = l.operator_id
  where o.short_name = 'DDD' and l.code = 'Ligne 4'
);
with ln as (select id from lines where code = 'Ligne 4' and operator_id = (select id from operators where short_name = 'DDD')),
     ordered_stops (name, seq) as (
       values ('Liberté 5', 1), ('Dieuppeul', 2), ('Khar Yalla', 3),
              ('Point E', 4), ('Marché Fass', 5), ('Place Leclerc', 6)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

delete from line_stops where line_id = (
  select l.id from lines l join operators o on o.id = l.operator_id
  where o.short_name = 'DDD' and l.code = 'Ligne 7'
);
with ln as (select id from lines where code = 'Ligne 7' and operator_id = (select id from operators where short_name = 'DDD')),
     ordered_stops (name, seq) as (
       values ('Ouakam', 1), ('Mermoz', 2), ('UCAD', 3),
              ('Marché Tilène', 4), ('Palais de Justice', 5)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

-- 4.3 Nouvelles lignes Dakar Dem Dikk

with op as (select id from operators where short_name = 'DDD'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 8', 'Aéroport LSS ↔ Palais de Justice' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Aéroport Léopold Sédar Senghor', 1), ('Yoff Village', 2),
              ('Stade Léopold Sédar Senghor', 3), ('Point E', 4),
              ('UCAD', 5), ('Palais de Justice', 6)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'DDD'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 10', 'Liberté 5 ↔ Palais de Justice' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Liberté 5', 1), ('Stade Demba Diop', 2),
              ('Corniche Ouest', 3), ('Palais de Justice', 4)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'DDD'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 13', 'Dieuppeul ↔ Palais de Justice' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Dieuppeul', 1), ('Castors', 2), ('Gare de Dakar', 3), ('Palais de Justice', 4)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'DDD'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 18', 'Dieuppeul ↔ Centre-Ville' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Dieuppeul', 1), ('Colobane', 2), ('Gare de Dakar', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'DDD'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 23', 'Parcelles Assainies ↔ Palais de Justice' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Parcelles Assainies', 1), ('Liberté 6', 2), ('UCAD', 3), ('Palais de Justice', 4)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'DDD'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 121', 'Scat Urbam ↔ Place Leclerc' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Scat Urbam', 1), ('Liberté 6', 2), ('Place Leclerc', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'DDD'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 319', 'Liberté 6 ↔ Ouakam' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Liberté 6', 1), ('Ouakam', 2)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'DDD'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 501', 'Palais de Justice ↔ Place Leclerc' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Palais de Justice', 1), ('Nelson Mandela', 2), ('Place Leclerc', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

-- 4.4 Nouvelles lignes Tata AFTU

with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 5', 'Colobane ↔ Préfecture de Guédiawaye' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Colobane', 1), ('Gueule Tapée', 2), ('Pikine', 3), ('Préfecture de Guédiawaye', 4)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 24', 'Gueule Tapée ↔ Préfecture de Guédiawaye' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Gueule Tapée', 1), ('Golf Nord', 2), ('Préfecture de Guédiawaye', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 26', 'Parcelles Assainies ↔ Thiaroye' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Parcelles Assainies', 1), ('Thiaroye', 2)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 29', 'Petersen ↔ Cambérène' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Petersen (Papa Gueye Fall)', 1), ('Cambérène', 2)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 30', 'Préfecture de Guédiawaye ↔ Colobane' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Préfecture de Guédiawaye', 1), ('Colobane', 2)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 36', 'Ngor ↔ Préfecture de Guédiawaye' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Ngor', 1), ('Parcelles Assainies', 2), ('Préfecture de Guédiawaye', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 42', 'Ouakam ↔ Préfecture de Guédiawaye' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Ouakam', 1), ('Grand Yoff', 2), ('Préfecture de Guédiawaye', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 43', 'Ouakam ↔ Thiaroye' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Ouakam', 1), ('Grand Dakar', 2), ('Thiaroye', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 44', 'Ouakam ↔ Grand Mbao' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Ouakam', 1), ('Grand Yoff', 2), ('Grand Mbao', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 47', 'Colobane ↔ Almadies' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Colobane', 1), ('Grand Yoff', 2), ('Almadies', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 61', 'Ouakam ↔ Keur Massar' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Ouakam', 1), ('Grand Yoff', 2), ('Keur Massar', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

-- Tata AFTU — Ligne 65, UCAD ↔ Plateau (via Colobane)
with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 65', 'UCAD ↔ Plateau' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('UCAD', 1), ('Colobane', 2), ('Marché Tilène', 3), ('Sandaga', 4)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;

with op as (select id from operators where short_name = 'AFTU'),
     ln as (
       insert into lines (operator_id, code, name)
       select id, 'Ligne 67', 'Ouakam ↔ Rufisque' from op
       on conflict (operator_id, code) do nothing returning id
     ),
     ordered_stops (name, seq) as (
       values ('Ouakam', 1), ('Colobane', 2), ('Rufisque', 3)
     )
insert into line_stops (line_id, stop_id, sequence)
select ln.id, s.id, os.seq from ordered_stops os join stops s on s.name = os.name cross join ln;
