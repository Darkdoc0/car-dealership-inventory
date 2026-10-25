import { expect, test } from '@playwright/test';
import { PASSWORD, registerUser, uniqueEmail } from '../support/api';
import { signIn, signInToShop } from '../support/ui';

test.describe('registration and sign-in', () => {
  test('a visitor is sent to the sign-in page and can reach the registration form', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.getByRole('link', { name: 'Create an account' }).click();
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  });

  test('a new user registers, lands on the vehicle list signed in, and can sign out and back in', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/register');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Manage vehicles' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await signInToShop(page, email, PASSWORD);
    await expect(page.getByText(email)).toBeVisible();
  });

  test('the session survives a page reload', async ({ page, request }) => {
    const { email, password } = await registerUser(request);
    await signInToShop(page, email, password);

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  test('a wrong password shows the server message and keeps the user on the sign-in page', async ({ page, request }) => {
    const { email } = await registerUser(request);

    await signIn(page, email, 'Wrong-Password-1');

    await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('registering an email that already exists is refused with a clear message', async ({ page, request }) => {
    const { email } = await registerUser(request);

    await page.goto('/register');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('alert')).toHaveText('Email already registered');
  });

  test('the registration form catches a short password before contacting the server', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Email').fill(uniqueEmail());
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Confirm password').fill('short');

    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('alert')).toHaveText('Password must be at least 8 characters');
    await expect(page).toHaveURL(/\/register$/);
  });

  test('a session the server rejects signs the user out, both on reload and in the middle of use', async ({ page, request }) => {
    const { email, password } = await registerUser(request);
    await signInToShop(page, email, password);
    const tokenKey = await page.evaluate(() => Object.keys(localStorage).find((k) => k.includes('token')) as string);
    expect(tokenKey).toBeTruthy();

    // Mid-use: the token stops being valid, and the next request the page makes is rejected.
    await page.evaluate((key) => localStorage.setItem(key, 'not-a-valid-token'), tokenKey);
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), tokenKey)).toBeNull();

    // On reload: a stale token left in storage is checked, rejected and cleared.
    await page.evaluate((key) => localStorage.setItem(key, 'another-stale-token'), tokenKey);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), tokenKey)).toBeNull();
  });

  test('a signed-in user is redirected away from the sign-in page, and signing out protects the shop again', async ({
    page,
    request,
  }) => {
    const { email, password } = await registerUser(request);
    await signInToShop(page, email, password);

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
