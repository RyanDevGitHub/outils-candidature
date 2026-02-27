# Audit responsive global (mobile-first)

## Portée analysée

Pages accessibles identifiées via le routeur et les vues backend :

- `/` : Connexion (`backend/View/index.html`)
- `/signup` : Création de compte (`backend/View/signup/index.html`)
- `/home` : Dashboard + modal profil (`backend/View/home/index.html`)
- fallback 404 (`backend/View/404/index.html`)

## Layouts principaux

- **Layout auth** : `main.container > section.card.auth-card`
- **Layout dashboard** : `main.dashboard-layout` avec `aside.dashboard-sidebar` + `section.dashboard-content`
- **Layout modal profil** : `section.modal > .modal-card`

## Composants réutilisés

- `card`, `auth-card`
- `subtitle`, `message`
- Styles de formulaires globaux (`input`, `select`, `button`, `fieldset`)
- Navigation sidebar (`sidebar-nav`)
- Cartes KPI (`kpi-grid`, `kpi-card`)

## Problèmes responsive constatés avant refactor

1. **Approche desktop-first**
   - Plusieurs styles de base orientés desktop avec fallback `@media (max-width: 920px)`.
2. **Navigation dashboard peu tactile en mobile**
   - Sidebar en colonne desktop par défaut, puis conversion mobile en media query inversée.
3. **Actions modal peu adaptées aux petits écrans**
   - Boutons `Retour/Suivant` alignés en ligne même en largeur réduite.
4. **Risque d’overflow horizontal**
   - Dashboard avec paddings/gabarits plus généreux en base.
5. **Lisibilité / densité mobile**
   - Espacements et dimensions orientés desktop pour cartes et dashboard home.

## Correctifs appliqués (mobile-first)

- Base mobile par défaut sur les layouts `.dashboard-layout` et `.dashboard-home .dashboard-layout`.
- Breakpoints progressifs ajoutés :
  - `@media (min-width: 640px)` (tablette petite)
  - `@media (min-width: 768px)` (tablette)
  - `@media (min-width: 921px)` (desktop)
- Navigation sidebar tactile en mobile (liens en flex-wrap + hauteur min 44px).
- Form controls fluides (`width: 100%`) pour limiter les débordements.
- Modal mobile améliorée :
  - ancrage bas d’écran en mobile,
  - `max-height` + scroll interne,
  - actions en pile sur mobile, en 2 colonnes dès tablette.
- Réduction des paddings/rayons en base mobile puis enrichissement en desktop.
- Prévention overflow global : `body { overflow-x: hidden; }`.

## Impacts fonctionnels

- Aucun changement de logique métier JS/PHP.
- Aucune route modifiée.
- Aucun test E2E modifié.
