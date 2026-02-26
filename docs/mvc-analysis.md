# Analyse de l'architecture actuelle et projection MVC

## Structure actuelle

- **Entrées UI (front)** : `index.html`, `login.html`, `home.html`.
- **Scripts front** : `app.js`, `login.js`, `home.js`.
- **Point d'entrée API** : `public/api.php`.
- **Support backend** : `backend/config.php`, `backend/db.php`, `backend/helpers.php`, `backend/mailer.php`.
- **Données** : schéma SQL dans `db/schema.sql`, base SQLite référencée via `backend/config.php`.

## Répartition actuelle des responsabilités

### Logique métier
- Côté front : orchestration des parcours d'inscription/connexion/profil (`app.js`, `login.js`, `home.js`).
- Côté back : validation, flux d'authentification, gestion des sessions et OAuth concentrés dans `public/api.php`.

### Accès aux données
- Mélangé dans `public/api.php` (requêtes SQL directes pour users, tokens, oauth, profils).
- Connexion PDO centralisée dans `backend/db.php`.

### Affichage / interface
- HTML + CSS (`*.html`, `styles.css`).
- Manipulation DOM/UX dans les scripts front (`app.js`, `login.js`, `home.js`).

## Cible MVC

### Model
- Centraliser les accès BDD et transformations liées aux données utilisateurs, tokens, codes email, profils et états OAuth.

### Controller
- Déplacer l'orchestration des cas d'usage API (actions `auth.*`, `profile.*`, `oauth.*`) vers des contrôleurs dédiés.

### View
- UI web existante (`*.html`) + rendu de réponses JSON/redirect côté API dans une couche View dédiée.
- Les scripts front conservent uniquement la logique de présentation et d'interaction écran.

## Plan de migration (sans changement fonctionnel)

1. Créer l'arborescence MVC sans déplacer de logique.
2. Déplacer le routage métier API vers des Controllers.
3. Extraire toutes les requêtes SQL des Controllers vers les Models.
4. Laisser dans les Views uniquement le rendu (JSON, redirections, DOM) et supprimer la logique métier résiduelle côté interface.
