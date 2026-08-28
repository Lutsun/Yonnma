# Yonnma

**Yonnma** est une application mobile qui accompagne les usagers dans leurs déplacements quotidiens à Dakar, en leur proposant les meilleurs itinéraires à travers les transports publics sénégalais :

- 🚌 Tata AFTU
- 🚌 Dakar Dem Dikk
- 🚐 Ndiaga Ndiaye
- 🚐 Cars rapides

L'objectif : rendre le transport en commun sénégalais **simple à comprendre et à utiliser**, y compris pour les usagers peu à l'aise avec la technologie — pas de jargon, pas d'étapes inutiles, une interface directe.

## Fonctionnalités

- **Connexion par numéro de téléphone** — un code reçu par SMS, sans mot de passe ni e-mail à retenir. Vraie authentification Supabase Auth (pas de comptes faits main) : sessions sécurisées, rafraîchissement automatique, et permissions filtrées par utilisateur (Row Level Security via `auth.uid()`)
- **Écran d'accueil avec carte en direct** — la position de l'utilisateur, les arrêts de bus autour de lui et les lignes qui les desservent
- **Planificateur d'itinéraire (fonctionnalité principale)** — l'utilisateur indique un point de départ et une destination ; Yonnma calcule le meilleur trajet à travers le réseau réel : lignes à emprunter, correspondances, arrêt où descendre, temps estimé et coût estimé (voir `services/routing.ts`)
- Base de données de lignes et d'arrêts réels de Dakar (BRT, Dakar Dem Dikk, Tata AFTU) — plusieurs dizaines de lignes et d'arrêts

## Stack technique

| Brique | Choix | Rôle |
|---|---|---|
| App mobile | [Expo](https://expo.dev) (React Native) + TypeScript | iOS / Android à partir d'une seule base de code |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) | navigation par fichiers |
| Carte & position | `react-native-maps`, `expo-location` | carte en direct, position de l'utilisateur |
| Base de données | [Supabase](https://supabase.com) (PostgreSQL + [PostGIS](https://postgis.net)) | lignes, arrêts, itinéraires, utilisateurs ; PostGIS gère tout ce qui est géographique (distances, arrêt le plus proche, tracés de ligne) |
| Style | `NativeWind` / Tailwind + design system maison (`constants/theme.ts`) | interface cohérente, vert de la marque, formes arrondies |

## Structure du projet

```
app/                    Écrans (Expo Router)
  (auth)/                 connexion, code SMS, création de profil
  (tabs)/                  accueil (carte), routes, assistant, favoris, profil
  (modals)/                détail d'un arrêt/bus, planificateur d'itinéraire
components/auth/        Composants d'interface réutilisables
constants/theme.ts       Couleurs, typographies, espacements — le design system
services/                Accès aux données (auth, transport, client Supabase, planificateur d'itinéraire)
store/                  État global (session utilisateur)
types/                  Types TypeScript partagés
utils/                  Fonctions utilitaires (validation de numéro, ...)
supabase/
  schema.sql              Schéma de la base (tables + fonctions PostGIS)
  seed.sql                 Données réelles de démarrage (lignes et arrêts de Dakar)
  migrate_to_auth.sql      Migration ponctuelle (ancienne table `users` faite main -> Supabase Auth)
```

## Base de données

Le schéma (`supabase/schema.sql`) est volontairement simple : sept tables (`operators`, `lines`, `stops`, `line_stops`, `profiles`, `user_trips`, `favorite_lines`) plus des fonctions PostGIS — dont `nearby_stops(lat, lng)` (arrêts les plus proches d'un point) et `get_route_graph()`, qui renvoie tout le réseau (lignes + arrêts dans l'ordre + tarifs) en un seul appel : c'est ce que le planificateur d'itinéraire utilise pour construire son graphe de trajet et calculer le meilleur chemin (algorithme de Dijkstra, `services/routing.ts`).

`profiles` ne stocke que les infos propres à Yonnma (nom, ville) — les comptes eux-mêmes sont de vrais comptes **Supabase Auth** (téléphone + code SMS), pas une table maison. Chaque table sensible (`profiles`, `user_trips`, `favorite_lines`) est protégée par des policies Row Level Security basées sur `auth.uid()` : un utilisateur ne peut lire ou modifier que ses propres données.

Les données de démarrage (`supabase/seed.sql`) sont **réelles**, pas inventées : la ligne B1 complète du BRT de Dakar, et une trentaine de lignes Dakar Dem Dikk et Tata AFTU (numéros, parcours et tarifs vérifiés via demdikk.sn, aftu-senegal.org et Moovit), avec des coordonnées GPS.

## Démarrage

Prérequis : Node.js, un compte [Supabase](https://supabase.com), et pour tester sur simulateur/appareil : Xcode (iOS) et/ou Android Studio.

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# puis renseigner EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY
# (Project Settings > API dans ton projet Supabase)
```

Configuration Supabase :

1. Si tu reviens d'une ancienne version du projet (table `users` faite main) : exécute d'abord `supabase/migrate_to_auth.sql` une seule fois. Sur un projet Supabase tout neuf, passe directement à l'étape 2.
2. Dans l'éditeur SQL, exécute dans l'ordre `supabase/schema.sql` puis `supabase/seed.sql`.
3. Dans le dashboard Supabase : **Authentication > Providers > Phone**, active le provider "Phone". Sans fournisseur SMS payant configuré, ajoute des **Test Phone Numbers** (numéro + code fixe, ex. `+221700000001` / `123456`) pour te connecter et tester gratuitement — l'authentification reste 100 % réelle (vrais comptes, vrais tokens), seuls ces numéros peuvent recevoir un code. Pour envoyer de vrais SMS à de vrais numéros sénégalais, configure un fournisseur SMS (Twilio, Vonage...) dans le même écran.

```bash
# Lancer le serveur de développement
npx expo start

# Ou builder directement sur simulateur
npx expo run:ios
npx expo run:android
```

## Licence

MIT

---

Projet réalisé dans le cadre d'un mémoire de fin d'études.
