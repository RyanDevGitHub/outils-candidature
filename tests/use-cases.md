# Use cases utilisateur détectés (depuis le code)

## Authentification et session

1. **Accéder à la page de connexion** via `/` ou `/login`.
2. **Accéder à la page d'inscription** via `/signup`.
3. **Basculer connexion ↔ inscription** via les liens de navigation entre les deux pages.
4. **Démarrer une inscription par e-mail** (nom complet + e-mail) avec envoi d'un code de vérification.
5. **Démarrer une connexion par e-mail** (e-mail uniquement) avec envoi d'un code de vérification pour un compte existant.
6. **Valider le code de vérification e-mail** pour ouvrir une session et être redirigé vers `/home`.
7. **Restaurer automatiquement une session existante côté pages auth** (`/` ou `/login`) si cookie `authToken` valide, avec redirection vers `/home`.
8. **Restaurer une session côté `/home`** via `auth.session` ; sinon suppression du cookie et redirection vers `/`.
9. **Empêcher l'accès direct à `/home`** si aucun cookie d'authentification n'est présent (redirection serveur vers `/`).
10. **Démarrer OAuth Google** depuis les boutons "Continuer avec Google" des pages connexion/inscription.

## Dashboard et expérience Home

11. **Afficher un message de bienvenue** après restauration de session sur `/home`.
12. **Afficher/masquer le modal de complétion profil** selon `hasCompletedProfile`.
13. **Compléter le profil en 7 étapes** dans le modal (contrat, régions, étude, durée, expérience, date, catégorie).
14. **Bloquer la progression si une étape n'est pas renseignée** avec message d'erreur.
15. **Naviguer entre les étapes du modal** avec boutons Retour / Suivant / Terminer.
16. **Utiliser les raccourcis de date** (Aujourd'hui, Dans 2 semaines, Dans 1 mois).
17. **Sauvegarder le profil** via `profile.save` en fin de modal.
18. **Afficher un toast de succès après sauvegarde profil** (stocké dans `sessionStorage`).
19. **Naviguer dans les panneaux dashboard** via la sidebar (Offres du jour, Dashboard KPI, Suivi candidatures, Profil utilisateur).
20. **Afficher 404** pour les routes front non reconnues.
