# Rapport de couverture E2E Playwright

## Base analysée

- Use cases de référence: `tests/use-cases.md`
- Tests existants au départ: `tests/e2e/main-flows.spec.js`

## Couverture actuelle (avant ajout)

### Déjà couvert par `main-flows.spec.js`

- Inscription e-mail + vérification code + redirection vers home.
- Restauration de session via token déjà présent.
- Affichage conditionnel du modal selon profil incomplet/complet.
- Sélection multi-régions dans l'étape correspondante du modal.

### Non couvert au départ

- Accès aux routes `/`, `/login`, `/signup` et navigation entre pages auth.
- Connexion e-mail pour **utilisateur existant** (flux `auth.email.login.start`).
- Garde de route `/home` sans authentification (redirection vers `/`).
- Redirection depuis `/` ou `/login` vers `/home` si authentifié (cookie valide).
- Message de bienvenue sur le dashboard.
- Validation d'erreur lorsqu'une étape du modal est vide.
- Parcours complet des 7 étapes du modal + sauvegarde + message succès.
- Navigation des panneaux du dashboard via sidebar.
- Déclenchement du flux OAuth Google depuis l'UI.

## Tests ajoutés pour combler les manques

Nouveaux scénarios dans `tests/e2e/additional-coverage.spec.js`:

1. Redirection `/home` -> `/` sans cookie.
2. Navigation entre pages auth (`/`, `/signup`, retour `/`).
3. Connexion e-mail pour utilisateur existant.
4. Redirection automatique `/` -> `/home` avec cookie valide.
5. Dashboard: message de bienvenue + navigation des panneaux sidebar.
6. Modal profil: erreur si étape vide.
7. Modal profil: parcours complet 7 étapes + sauvegarde + toast succès.
8. Déclenchement OAuth Google depuis le bouton UI.

## Résultat attendu après ajout

- Couverture fonctionnelle E2E alignée avec les use cases actuellement implémentés côté front + API exposée à l'interface.
