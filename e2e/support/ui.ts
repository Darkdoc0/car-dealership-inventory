import { expect, type Page } from '@playwright/test';

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Signs in and waits until the vehicle list has loaded. */
export async function signInToShop(page: Page, email: string, password: string) {
  await signIn(page, email, password);
  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
}

/** Searches the vehicle list (shop or admin) by make, which is how tests find only their own cars. */
export async function searchByMake(page: Page, make: string) {
  await page.getByLabel('Make').fill(make);
  await page.getByRole('button', { name: 'Search' }).click();
}

export const vehicleCard = (page: Page, name: string) => page.getByRole('article', { name });
