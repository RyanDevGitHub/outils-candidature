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


Prototype front (HTML/CSS/JS) pour :
- créer un compte avec un formulaire court,
- collecter ensuite les préférences de recherche d'emploi via une pop-up pas à pas,
- afficher un aperçu du résultat final sauvegardé.

## État actuel

Cette version est **UI only** (pas de backend applicatif encore branché dans cette PR).

Roadmap validée :
1. PR UI.
2. PR SQLite (celle-ci: structure de base pour `User`).
3. PR backend PHP (création compte + continuation avec réseaux sociaux).

## Lancer localement (front)

```bash
python3 -m http.server 4173
```

Puis ouvrir <http://localhost:4173>.

## Initialiser la base SQLite

Cette PR ajoute une base SQLite pour l'entité `users`.

```bash
php scripts/init_db.php
```

Cela crée `db/app.sqlite` et applique `db/schema.sql`.

## Modèle actuel: User

Table `users`:
- `id` (PK autoincrémentée)
- `full_name`
- `email` (unique)
- `password_hash` (obligatoire pour `auth_provider = email`)
- `auth_provider` (`email`, `google`, `github`, `apple`)
- `provider_user_id` (identifiant social)
- `created_at`, `updated_at`

## Parcours utilisateur

1. Création rapide du compte.
2. Ouverture automatique d'une pop-up de finalisation de profil.
3. Une question par écran avec barre de progression et bouton retour (sauf sur la première étape).
4. Enregistrement final dans `localStorage` sous la clé `candidateProfile`.
5. Affichage d'un bloc **"Résultat possible"** montrant le JSON enregistré.
