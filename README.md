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

## Initialiser et lancer le projet

```bash
python3 -m http.server 4173
php -S localhost:8000 -t public
```

Puis ouvrir <http://127.0.0.1:4173/index.html>.

## Flows authentification

1. **Création de compte** (`index.html`) : nom + e-mail, puis code de vérification.
2. **Connexion** (`login.html`) : e-mail uniquement, puis code de vérification.
3. **Connexion instantanée** : si `authToken` existe en `localStorage` et est valide, redirection automatique vers `home.html`.
4. **OAuth Google** : disponible depuis les pages d'inscription et de connexion.

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
- `POST /public/api.php?action=auth.email.login.start`
- `POST /public/api.php?action=auth.email.verify`
- `POST /public/api.php?action=auth.session`
- `GET /public/api.php?action=oauth.google.start`
- `GET /public/api.php?action=oauth.google.callback`
