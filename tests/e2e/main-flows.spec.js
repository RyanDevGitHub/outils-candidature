const { test, expect } = require('@playwright/test');

const API = 'http://localhost:4173/api.php';

function uniqueEmail(prefix = 'e2e') {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

async function createUserAndToken(request, email = uniqueEmail('signup')) {
  const fullName = 'E2E User';

  const start = await request.post(`${API}?action=auth.email.start`, {
    data: { fullName, email },
  });
  expect(start.ok()).toBeTruthy();
  const startData = await start.json();
  const code = startData.debugCode;
  expect(code).toBeTruthy();

  const verify = await request.post(`${API}?action=auth.email.verify`, {
    data: { email, code },
  });
  expect(verify.ok()).toBeTruthy();
  const verifyData = await verify.json();

  return { email, fullName, token: verifyData.token };
}

test('Connexion via code puis navigation vers home', async ({ page }) => {
  const email = uniqueEmail('ui-signup');

  await page.goto('/index.html');
  await page.getByLabel('Nom complet').fill('Jean Testeur');
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Envoyer un code de vérification' }).click();

  await expect(page.locator('#verify-form')).toBeVisible();

  const message = page.locator('#message');
  await expect(message).toContainText('Code envoyé. (dev:');
  const codeText = (await message.textContent()) || '';
  const match = codeText.match(/dev:\s*(\d{6})/);
  expect(match).toBeTruthy();

  await page.getByLabel('Code reçu par e-mail').fill(match[1]);
  await page.getByRole('button', { name: 'Valider le code' }).click();

  await expect(page).toHaveURL(/home\.html$/);
  await expect(page.locator('#profile-modal')).toBeVisible();
});

test('Connexion via token redirige automatiquement vers home', async ({ page, request }) => {
  const user = await createUserAndToken(request);

  await page.goto('/login.html');
  await page.evaluate((token) => localStorage.setItem('authToken', token), user.token);
  await page.reload();

  await expect(page).toHaveURL(/home\.html$/);
});

test('Affichage conditionnel des modals de complétion de profil', async ({ page, request }) => {
  const incompleteUser = await createUserAndToken(request, uniqueEmail('incomplete'));

  await page.goto('/home.html');
  await page.evaluate((token) => localStorage.setItem('authToken', token), incompleteUser.token);
  await page.reload();

  await expect(page.locator('#profile-modal')).toBeVisible();

  const completeUser = await createUserAndToken(request, uniqueEmail('complete'));
  const saveProfile = await request.post(`${API}?action=profile.save`, {
    data: {
      token: completeUser.token,
      profile: {
        contractType: 'CDI',
        regions: ['Île-de-France'],
        educationLevel: 'Bac+5',
        duration: '1 an',
        experience: 'Junior (0-2 ans)',
        startDate: '2026-01-01',
        companyCategory: 'Startup',
      },
    },
  });
  expect(saveProfile.ok()).toBeTruthy();

  await page.goto('/home.html');
  await page.evaluate((token) => localStorage.setItem('authToken', token), completeUser.token);
  await page.reload();

  await expect(page.locator('#profile-modal')).toBeHidden();
});

test('Sélection de la région dans le modal de complétion', async ({ page, request }) => {
  const user = await createUserAndToken(request, uniqueEmail('region'));

  await page.goto('/home.html');
  await page.evaluate((token) => localStorage.setItem('authToken', token), user.token);
  await page.reload();

  await expect(page.locator('#profile-modal')).toBeVisible();
  await page.getByRole('button', { name: 'CDI' }).click();
  await page.getByRole('button', { name: 'Suivant' }).click();

  const regionsSelect = page.locator('#step-input.region-select');
  await expect(regionsSelect).toBeVisible();

  await regionsSelect.selectOption([
    { label: 'Île-de-France' },
    { label: 'Occitanie' },
  ]);

  await expect(page.locator('#step-input option:checked')).toHaveCount(2);
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.locator('#modal-question')).toContainText("niveau d'étude");
});


