# Outil candidature

Prototype web (HTML/CSS/JS + PHP + SQLite) pour :
- créer un utilisateur par e-mail en mode **passwordless** (code de vérification),
- proposer la connexion sociale (**OAuth Google**),
- compléter ensuite un profil de recherche d'emploi en multi-étapes.

## Stack

- Front: HTML / CSS / JavaScript
- Back: PHP
- Base de données: SQLite

## Initialiser la base

```bash
php scripts/init_db.php
```

Cela crée `db/app.sqlite` et applique `db/schema.sql`.

## Lancer le projet (front + backend)

```bash
php -S 127.0.0.1:8000
```

Puis ouvrir <http://127.0.0.1:8000/index.html>.

## Nouveau flow Home

1. Depuis `index.html`, l'utilisateur saisit son nom + e-mail.
2. Le code est envoyé, puis redirection vers `home.html`.
3. Sur `home.html`, une **modal de vérification** s'ouvre pour saisir le code.
4. Après validation, le token est stocké en `localStorage` (`authToken`) et la modal profil s'ouvre.

## Variables d'environnement (OAuth Google)

```bash
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."
export GOOGLE_REDIRECT_URI="http://127.0.0.1:8000/public/api.php?action=oauth.google.callback"
export FRONTEND_URL="http://127.0.0.1:8000/home.html"
```

Sans ces variables, le flux Google renvoie une erreur explicite côté API.

## Endpoints backend

- `POST /public/api.php?action=auth.email.start`
- `POST /public/api.php?action=auth.email.verify`
- `POST /public/api.php?action=auth.session`
- `GET /public/api.php?action=oauth.google.start`
- `GET /public/api.php?action=oauth.google.callback`
