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

## Variables d'environnement (OAuth Google)

```bash
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."
export GOOGLE_REDIRECT_URI="http://127.0.0.1:8000/public/api.php?action=oauth.google.callback"
export FRONTEND_URL="http://127.0.0.1:8000/index.html"
```

Sans ces variables, le flux Google renvoie une erreur explicite côté API.

## Flux email passwordless

1. Le front appelle `POST /public/api.php?action=auth.email.start` avec `fullName` + `email`.
2. Le backend génère un code 6 chiffres, l'enregistre hashé, tente un envoi e-mail et loggue dans `storage/logs/mail.log`.
3. Le front appelle `POST /public/api.php?action=auth.email.verify` avec `email` + `code`.
4. Si valide, le backend retourne un token de session.
5. Le front stocke ce token en `localStorage` (`authToken`) pour éviter de redemander un code au prochain passage.

## Endpoints backend

- `POST /public/api.php?action=auth.email.start`
- `POST /public/api.php?action=auth.email.verify`
- `POST /public/api.php?action=auth.session`
- `GET /public/api.php?action=oauth.google.start`
- `GET /public/api.php?action=oauth.google.callback`
