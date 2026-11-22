import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL ?? 'demo@greenforce.dev';
const password = process.env.E2E_PASSWORD;

const pdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);

test.skip(!password, 'Set E2E_PASSWORD to the demo account password');

test('German documentation: address → requirements → evidence → materials → passport', async ({
  page,
  request,
}) => {
  // Start from the seeded state so the journey is repeatable.
  await request.post('/api/v1/auth/login', { data: { email, password } });
  const reset = await request.post('/api/v1/demo/reset');
  expect([204, 404]).toContain(reset.status());
  // The request fixture shares the browser context's cookies; sign out so the UI sign-in is exercised.
  await page.context().clearCookies();

  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

  // 1–2. Address search and property intelligence.
  await page.getByRole('link', { name: 'New project' }).first().click();
  await page.getByRole('radio', { name: 'Germany' }).click();
  await page.getByLabel('Search address').fill('karl-marx');
  await page.getByRole('button', { name: /Karl-Marx-Allee 12/ }).click();
  await expect(page.getByText('Heritage review area (demo)')).toBeVisible();
  await expect(page.getByText(/GF-DE-/).first()).toBeVisible();
  await page.getByLabel('Project name').fill('Berlin renovation — E2E');
  await page.getByRole('button', { name: 'Create project & continue to setup' }).click();

  // 3. Project setup.
  await expect(page.getByRole('heading', { name: 'Berlin renovation — E2E' })).toBeVisible();
  await page.getByLabel('Project nature').selectOption('major_renovation');
  await page.getByLabel('Building class (Gebäudeklasse)').selectOption('GK3');
  await page.getByLabel('Funding route').selectOption('private');
  await page.getByLabel('Application date').fill('2026-02-10');
  await page.getByLabel('Gross floor area').fill('2600');
  await page.getByRole('button', { name: 'Save setup' }).click();
  await expect(page.getByText('Saved — requirements re-evaluated.')).toBeVisible();

  // 4–5. Requirements and verdicts.
  await page.getByRole('link', { name: /Requirements/ }).click();
  await expect(page.getByText('Germany demonstration documentation pack (2024+)').first()).toBeVisible();
  const fire = page.locator('#DE-FIRE');
  await expect(fire.getByText('Proof missing')).toBeVisible();
  await expect(fire.getByText(/GK3 in Berlin/)).toBeVisible();

  // 6. Evidence upload.
  await page
    .getByRole('link', { name: /Evidence/ })
    .first()
    .click();
  const fireEvidence = page.locator('#DE-FIRE');
  await fireEvidence.getByLabel('File for Fire strategy report').setInputFiles({
    name: 'fire-strategy.pdf',
    mimeType: 'application/pdf',
    buffer: pdf,
  });
  await fireEvidence.getByRole('button', { name: 'Upload' }).first().click();
  await expect(fireEvidence.getByText('fire-strategy.pdf')).toBeVisible();
  await expect(fireEvidence.getByText('Proof in progress')).toBeVisible();

  // 10. Materials → link as evidence.
  await page.getByRole('link', { name: 'Materials & suppliers' }).click();
  const insulation = page.locator('section', { hasText: 'Mineral wool board CI' });
  await insulation.getByRole('button', { name: 'Select for project' }).click();
  await expect(insulation.getByRole('button', { name: 'Remove from project' })).toBeVisible();
  await page
    .getByRole('link', { name: /Evidence/ })
    .first()
    .click();
  await page
    .getByLabel('Selected material for Insulation product classification')
    .selectOption({ label: 'Mineral wool board CI — EPD EPD-DE-DEMO-3305' });
  await page.locator('#DE-FIRE').getByRole('button', { name: 'Link' }).click();
  await expect(page.getByText('Mineral wool board CI — product data.json')).toBeVisible();

  // 7. Passport.
  await page.getByRole('link', { name: 'Passport' }).click();
  await expect(page.getByRole('heading', { name: 'Compliance Passport' })).toBeVisible();
  await page.getByLabel('Version note').fill('Submitted to local Bauaufsicht');
  await page.getByRole('button', { name: 'Issue version' }).click();
  await expect(page.getByRole('button', { name: /Version 1/ })).toBeVisible();
  await expect(page.getByText('The latest issued version matches the live record.')).toBeVisible();
});
