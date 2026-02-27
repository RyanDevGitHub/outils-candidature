const { test, expect } = require('@playwright/test');

const API = 'http://127.0.0.1:4173/api.php';

function uniqueEmail(prefix = 'e2e') {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

async function createUserAndToken(request, email = uniqueEmail('seed')) {
  const fullName = 'Utilisateur E2E';

  const start = await request.post(`${API}?action=auth.email.start`, {
    data: { fullName, email },
  });
  expect(start.ok()).toBeTruthy();
  const startData = await start.json();

  const verify = await request.post(`${API}?action=auth.email.verify`, {
    data: { email, code: startData.debugCode },
  });
  expect(verify.ok()).toBeTruthy();

  const verifyData = await verify.json();
  return { fullName, email, token: verifyData.token };
}

test('Accès direct à /home sans session redirige vers /', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
});

test('Navigation entre pages auth (connexion <-> inscription)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Créer un compte' }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { name: 'Créer un compte' })).toBeVisible();

  await page.getByRole('link', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
});

test('Connexion e-mail via code pour un utilisateur existant', async ({ page, request }) => {
  const user = await createUserAndToken(request, uniqueEmail('existing'));

  await page.goto('/');
  await page.getByLabel('E-mail').fill(user.email);
  await page.getByRole('button', { name: 'Envoyer un code de vérification' }).click();

  const message = page.locator('#message');
  await expect(message).toContainText('Code envoyé. (dev:');
  const codeText = (await message.textContent()) || '';
  const match = codeText.match(/dev:\s*(\d{6})/);
  expect(match).toBeTruthy();

  await page.getByLabel('Code reçu par e-mail').fill(match[1]);
  await page.getByRole('button', { name: 'Valider le code' }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('#home-message')).toContainText('Bienvenue');
});

test('Utilisateur avec session valide est redirigé de / vers /home', async ({ page, request, context }) => {
  const user = await createUserAndToken(request, uniqueEmail('redirect'));

  await context.addCookies([
    {
      name: 'authToken',
      value: user.token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  await page.goto('/');
  await expect(page).toHaveURL(/\/home$/);
});

test('Navigation sidebar dashboard + affichage message de bienvenue', async ({ page, request, context }) => {
  const user = await createUserAndToken(request, uniqueEmail('dash'));
  await request.post(`${API}?action=profile.save`, {
    data: {
      token: user.token,
      profile: {
        contractType: 'CDI',
        regions: ['Île-de-France'],
        educationLevel: 'Bac+5',
        duration: '1 an',
        experience: 'Junior (0-2 ans)',
        startDate: '2026-02-01',
        companyCategory: 'Startup',
      },
    },
  });

  await context.addCookies([
    {
      name: 'authToken',
      value: user.token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  await page.goto('/home');

  await expect(page.locator('#home-message')).toContainText(`Bienvenue ${user.fullName}`);
  await expect(page.locator('[data-dashboard-panel="offres-du-jour"]')).toBeVisible();

  await page.getByRole('link', { name: 'Dashboard KPI' }).click();
  await expect(page.locator('[data-dashboard-panel="kpi-dashboard"]')).toBeVisible();

  await page.getByRole('link', { name: 'Suivi candidatures' }).click();
  await expect(page.locator('[data-dashboard-panel="suivi-candidatures"]')).toBeVisible();

  await page.getByRole('link', { name: 'Profil utilisateur' }).click();
  await expect(page.locator('[data-dashboard-panel="profil-utilisateur"]')).toBeVisible();
});

test('Modal profil affiche une erreur si on avance sans répondre', async ({ page, request, context }) => {
  const user = await createUserAndToken(request, uniqueEmail('validation'));

  await context.addCookies([
    {
      name: 'authToken',
      value: user.token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  await page.goto('/home');
  await expect(page.locator('#profile-modal')).toBeVisible();

  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.locator('#home-message')).toContainText('Merci de répondre à la question avant de continuer.');
});

test('Complétion complète du profil (7 étapes) puis succès', async ({ page, request, context }) => {
  const user = await createUserAndToken(request, uniqueEmail('complete-flow'));

  await context.addCookies([
    {
      name: 'authToken',
      value: user.token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  await page.goto('/home');
  await expect(page.locator('#profile-modal')).toBeVisible();

  await page.getByRole('button', { name: 'CDI' }).click();
  await page.getByRole('button', { name: 'Suivant' }).click();

  await page.locator('#step-input.region-select').selectOption([{ label: 'Île-de-France' }, { label: 'Occitanie' }]);
  await page.getByRole('button', { name: 'Suivant' }).click();

  await page.locator('#step-input').selectOption('Bac+5');
  await page.getByRole('button', { name: 'Suivant' }).click();

  await page.locator('#step-input').selectOption('1 an');
  await page.getByRole('button', { name: 'Suivant' }).click();

  await page.locator('#step-input').selectOption('Senior (6+ ans)');
  await page.getByRole('button', { name: 'Suivant' }).click();

  await page.getByRole('button', { name: 'Dans 2 semaines' }).click();
  await page.getByRole('button', { name: 'Suivant' }).click();

  await page.locator('#step-input').selectOption('Startup');
  await page.getByRole('button', { name: 'Terminer' }).click();

  await expect(page.locator('#profile-modal')).toBeHidden();
  await expect(page.locator('#home-message')).toContainText('Profil complété avec succès');
});

test('Bouton Google déclenche le flux OAuth côté interface', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuer avec Google' }).click();

  await expect(page).toHaveURL(/api\.php\?action=oauth\.google\.start/);
  await expect(page.locator('body')).toContainText('OAuth Google non configuré');
});
