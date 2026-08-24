# Yonnma

**Yonnma** est une application mobile qui accompagne les usagers dans leurs déplacements quotidiens à Dakar, en leur proposant les meilleurs itinéraires à travers les transports publics sénégalais :

- 🚌 Tata AFTU
- 🚌 Dakar Dem Dikk
- 🚐 Ndiaga Ndiaye
- 🚐 Cars rapides

L'objectif : rendre le transport en commun sénégalais **simple à comprendre et à utiliser**, y compris pour les usagers peu à l'aise avec la technologie — pas de jargon, pas d'étapes inutiles, une interface directe.

## Fonctionnalités

- **Connexion par numéro de téléphone** — un code reçu par SMS, sans mot de passe ni e-mail à retenir
- **Écran d'accueil avec carte en direct** — la position de l'utilisateur, les arrêts de bus autour de lui et les lignes qui les desservent
- **Recherche d'itinéraire** — "Où voulez-vous aller ?" en un seul champ
- Base de données de lignes et d'arrêts réels de Dakar (BRT, Dakar Dem Dikk, Tata AFTU)

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
  (modals)/                détail d'un arrêt/bus
components/auth/        Composants d'interface réutilisables
constants/theme.ts       Couleurs, typographies, espacements — le design system
services/                Accès aux données (auth, transport, client Supabase)
store/                  État global (session utilisateur)
types/                  Types TypeScript partagés
utils/                  Fonctions utilitaires (validation de numéro, ...)
supabase/
  schema.sql              Schéma de la base (tables + fonctions PostGIS)
  seed.sql                 Données réelles de démarrage (lignes et arrêts de Dakar)
```

## Base de données

Le schéma (`supabase/schema.sql`) est volontairement simple : six tables (`operators`, `lines`, `stops`, `line_stops`, `users`, `user_trips`) plus une fonction PostGIS, `nearby_stops(lat, lng)`, qui renvoie les arrêts les plus proches d'un point ainsi que les lignes qui les desservent.

Les données de démarrage (`supabase/seed.sql`) sont **réelles**, pas inventées : la ligne B1 complète du BRT de Dakar, plusieurs lignes Dakar Dem Dikk et Tata AFTU, avec des coordonnées GPS vérifiées.

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

Dans l'éditeur SQL de ton projet Supabase, exécute dans l'ordre `supabase/schema.sql` puis `supabase/seed.sql`.

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
