# Outil candidature

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
