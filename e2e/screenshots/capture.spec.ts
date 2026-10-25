import path from 'path';
import { expect, test, type Page } from '@playwright/test';
import { signIn } from '../support/ui';

// Not a test of behaviour: it walks the demo data and saves the screenshots the README shows.
const DEMO_ADMIN = { email: 'admin@dealership.test', password: 'Admin-Passw0rd!' };
const DEMO_USER = { email: 'shopper@dealership.test', password: 'Shopper-Passw0rd!' };
const OUT = path.resolve(__dirname, '../../docs/screenshots');

const shot = (page: Page, name: string, fullPage = false) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });

test('README screenshots', async ({ page }) => {
  // Sign in
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await shot(page, 'sign-in');

  // Shopper: the vehicle list, including the sold-out vehicles whose button is disabled
  await signIn(page, DEMO_USER.email, DEMO_USER.password);
  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sold out' }).first()).toBeDisabled();
  await shot(page, 'shop', true);

  // Search by category and price range
  await page.getByLabel('Category').selectOption('suv');
  await page.getByLabel('Min price ($)').fill('20000');
  await page.getByLabel('Max price ($)').fill('60000');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('article').first()).toBeVisible();
  await shot(page, 'shop-search', true);

  // Phone width
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByRole('article').first()).toBeVisible();
  await shot(page, 'shop-mobile');
  await page.setViewportSize({ width: 1280, height: 800 });

  // Admin: the management table and the form with validation errors
  await page.getByRole('button', { name: 'Sign out' }).click();
  await signIn(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
  await page.getByRole('link', { name: 'Manage vehicles' }).click();
  await expect(page.getByRole('heading', { name: 'Manage vehicles' })).toBeVisible();
  await expect(page.getByRole('row').nth(1)).toBeVisible();
  await shot(page, 'admin-list', true);

  await page.getByRole('link', { name: 'Add vehicle' }).click();
  await page.getByRole('button', { name: 'Save vehicle' }).click();
  await expect(page.getByText('Make is required')).toBeVisible();
  await shot(page, 'admin-form', true);
});
