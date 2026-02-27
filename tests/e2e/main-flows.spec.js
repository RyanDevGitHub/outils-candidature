const { test, expect } = require('@playwright/test');

const API = 'http://localhost:4173/api.php';

// Utilitaire pour générer des emails uniques
function uniqueEmail(prefix = 'e2e') {
  return `${prefix}.${Date.now()}@example.com`;
}

// Injecte le cookie directement dans le navigateur
async function setAuthCookie(context, token) {
  // On s'assure que c'est bien un tableau d'objets
  await context.addCookies([
    {
      name: 'authToken',
      value: token,
      domain: 'localhost', // Utilise domain au lieu de url pour tester
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 3600 * 24 * 30, // Expire dans 30 jours
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }
  ]);
}

// Crée un utilisateur via l'API pour les tests de navigation
async function createUserAndToken(request, email = uniqueEmail('signup')) {
  const start = await request.post(`${API}?action=auth.email.start`, {
    data: { fullName: 'Jean Testeur', email },
  });
  const { debugCode } = await start.json();

  const verify = await request.post(`${API}?action=auth.email.verify`, {
    data: { email, code: debugCode },
  });
  const { token } = await verify.json();
  return { email, token };
}

test('Inscription complète : Envoi code -> Vérification -> Redirection Home', async ({ page }) => {
  const email = uniqueEmail('ui-signup');

  await page.goto('/signup'); // Route définie dans ton index.php
  
  // Remplissage du formulaire d'inscription
  await page.getByLabel('Nom complet').fill('Jean Testeur');
  await page.locator('#signup-form').getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Envoyer un code de vérification' }).click();

  // On attend que le formulaire de code apparaisse
  await expect(page.locator('#verify-form')).toBeVisible();

  // Récupération du code de debug affiché dans le message
  const message = page.locator('#message');
  await expect(message).toContainText('Code envoyé. (dev:');
  const codeText = await message.textContent();
  const code = codeText.match(/\d{6}/)[0];

  // Validation du code
  await page.getByLabel('Code reçu par e-mail').fill(code);
  await page.getByRole('button', { name: 'Valider le code' }).click();

  // Le routeur doit nous envoyer sur /home
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('#profile-modal')).toBeVisible();
});

test('Le Guard PHP redirige /login vers /home si le cookie est présent', async ({ page, request, context }) => {
  const user = await createUserAndToken(request);
  await setAuthCookie(context, user.token);

  await page.goto('/'); // Tentative d'accès à la page de connexion
  await expect(page).toHaveURL(/\/home$/); // Redirection automatique par le Bouncer
});

test('Le Guard PHP bloque /home si le cookie est absent', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/$/); // Retour forcé vers login
});

test('Navigation dans le modal de profil sur /home', async ({ page, request, context }) => {
  const user = await createUserAndToken(request, uniqueEmail('profile'));
  await setAuthCookie(context, user.token);

  await page.goto('/home');
  await expect(page.locator('#profile-modal')).toBeVisible();

  // Test de l'interface du modal
  await page.getByRole('button', { name: 'CDI' }).click();
  await page.getByRole('button', { name: 'Suivant' }).click();
  
  await expect(page.locator('#modal-question')).toContainText('régions');
});