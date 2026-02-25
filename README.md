# Outil candidature

Prototype front (HTML/CSS/JS) pour :
- créer un compte avec un formulaire court,
- collecter ensuite les préférences de recherche d'emploi via une pop-up pas à pas,
- afficher un aperçu du résultat final sauvegardé.

## État actuel

Cette version est **UI only** (pas de backend ni base de données intégrée dans cette PR).

Roadmap validée :
1. PR UI (celle-ci).
2. PR SQLite (fichier DB + structure SQL).
3. PR backend PHP (création compte + continuation avec réseaux sociaux).

## Lancer localement

```bash
python3 -m http.server 4173
```

Puis ouvrir <http://localhost:4173>.

## Parcours utilisateur

1. Création rapide du compte.
2. Ouverture automatique d'une pop-up de finalisation de profil.
3. Une question par écran avec barre de progression et bouton retour (sauf sur la première étape).
4. Enregistrement final dans `localStorage` sous la clé `candidateProfile`.
5. Affichage d'un bloc **"Résultat possible"** montrant le JSON enregistré.
