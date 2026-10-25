import { expect, test, type Page } from '@playwright/test';
import { registerUser, seedCar, unique, uniqueVin } from '../support/api';
import { ADMIN } from '../support/env';
import { searchByMake, signIn, signInToShop, vehicleCard } from '../support/ui';

async function signInAsAdmin(page: Page) {
  await signIn(page, ADMIN.email, ADMIN.password);
  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
}

async function openAdminList(page: Page, make: string) {
  await page.getByRole('link', { name: 'Manage vehicles' }).click();
  await expect(page.getByRole('heading', { name: 'Manage vehicles' })).toBeVisible();
  await searchByMake(page, make);
}

const row = (page: Page, name: string) => page.getByRole('row', { name });

test.describe('admin access', () => {
  test('an admin sees the management link; a regular user does not and is turned away from /admin', async ({ page, request }) => {
    await signInAsAdmin(page);
    await expect(page.getByRole('link', { name: 'Manage vehicles' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();

    const user = await registerUser(request);
    await signInToShop(page, user.email, user.password);
    await expect(page.getByRole('link', { name: 'Manage vehicles' })).toHaveCount(0);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Manage vehicles' })).toHaveCount(0);
    await page.goto('/admin/cars/new');
    await expect(page.getByRole('heading', { name: 'Add vehicle' })).toHaveCount(0);
  });
});

test.describe('adding and editing vehicles', () => {
  test('an admin adds a vehicle, it appears in the admin list, and shoppers can then find it', async ({ page }) => {
    const make = unique('Added');
    await signInAsAdmin(page);
    await openAdminList(page, make);
    await page.getByRole('link', { name: 'Add vehicle' }).click();

    await page.getByLabel('VIN').fill(uniqueVin().toLowerCase());
    await page.getByLabel('Make').fill(make);
    await page.getByLabel('Model').fill('Roadster');
    await page.getByLabel('Year').fill('2023');
    await page.getByLabel('Mileage').fill('12500');
    await page.getByLabel('Price ($)').fill('41999.99');
    await page.getByLabel('Category').selectOption('coupe');
    await page.getByLabel('Quantity').fill('4');
    await page.getByRole('button', { name: 'Save vehicle' }).click();

    await expect(page.getByRole('heading', { name: 'Manage vehicles' })).toBeVisible();
    await expect(page.getByText(`Added 2023 ${make} Roadster`)).toBeVisible();
    await searchByMake(page, make);
    const added = row(page, `2023 ${make} Roadster`);
    await expect(added).toContainText('$41,999.99');
    await expect(added).toContainText('Coupe');
    await expect(added).toContainText('Available');

    await page.getByRole('link', { name: 'Car Dealership' }).click();
    await searchByMake(page, make);
    const card = vehicleCard(page, `2023 ${make} Roadster`);
    await expect(card).toBeVisible();
    await expect(card.getByText('4 in stock')).toBeVisible();
    await expect(card.getByText('12,500 mi')).toBeVisible();
  });

  test('the add form lists every problem at once and puts the cursor in the first bad field', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin/cars/new');

    await page.getByRole('button', { name: 'Save vehicle' }).click();

    await expect(page.getByText('VIN must be 17 letters and digits (no I, O or Q)')).toBeVisible();
    await expect(page.getByText('Make is required')).toBeVisible();
    await expect(page.getByText('Model is required')).toBeVisible();
    await expect(page.getByText('Choose a category')).toBeVisible();
    await expect(page.getByLabel('VIN')).toBeFocused();
    await expect(page).toHaveURL(/\/admin\/cars\/new$/);
  });

  test('reusing a VIN is refused by the server and the form stays open', async ({ page, request }) => {
    const make = unique('Dup');
    const vin = uniqueVin();
    await seedCar(request, { make, vin });
    await signInAsAdmin(page);
    await page.goto('/admin/cars/new');

    await page.getByLabel('VIN').fill(vin);
    await page.getByLabel('Make').fill(make);
    await page.getByLabel('Model').fill('Copy');
    await page.getByLabel('Year').fill('2020');
    await page.getByLabel('Mileage').fill('1');
    await page.getByLabel('Price ($)').fill('1000');
    await page.getByLabel('Category').selectOption('van');
    await page.getByRole('button', { name: 'Save vehicle' }).click();

    await expect(page.getByRole('alert')).toHaveText('A car with this VIN already exists');
    await expect(page.getByRole('heading', { name: 'Add vehicle' })).toBeVisible();
  });

  test('editing a vehicle changes its price everywhere', async ({ page, request }) => {
    const make = unique('Edit');
    await seedCar(request, { make, model: 'Priced', priceCents: 2000000 });
    await signInAsAdmin(page);
    await openAdminList(page, make);

    await page.getByRole('link', { name: `Edit 2021 ${make} Priced` }).click();
    await expect(page.getByRole('heading', { name: `Edit 2021 ${make} Priced` })).toBeVisible();
    await expect(page.getByLabel('Price ($)')).toHaveValue('20000.00');
    await page.getByLabel('Price ($)').fill('17500.50');
    await page.getByRole('button', { name: 'Save vehicle' }).click();

    await expect(page.getByText(`Saved 2021 ${make} Priced`)).toBeVisible();
    await searchByMake(page, make);
    await expect(row(page, `2021 ${make} Priced`)).toContainText('$17,500.50');
    await page.getByRole('link', { name: 'Car Dealership' }).click();
    await searchByMake(page, make);
    await expect(vehicleCard(page, `2021 ${make} Priced`).getByText('$17,500.50')).toBeVisible();
  });
});

test.describe('restocking and deleting', () => {
  test('restocking adds to the stock, and reopens a sold-out vehicle for sale', async ({ page, request }) => {
    const make = unique('Restock');
    await seedCar(request, { make, model: 'Empty', quantity: 1 });
    const shopper = await registerUser(request);

    // The shopper buys the last unit, so the vehicle is sold out.
    await signInToShop(page, shopper.email, shopper.password);
    await searchByMake(page, make);
    await vehicleCard(page, `2021 ${make} Empty`).getByRole('button', { name: 'Buy' }).click();
    await expect(vehicleCard(page, `2021 ${make} Empty`).getByRole('button', { name: 'Sold out' })).toBeDisabled();
    await page.getByRole('button', { name: 'Sign out' }).click();

    await signInAsAdmin(page);
    await openAdminList(page, make);
    const line = row(page, `2021 ${make} Empty`);
    await expect(line).toContainText('Sold');
    await page.getByRole('button', { name: `Restock 2021 ${make} Empty` }).click();
    await expect(page.getByLabel(`Quantity to add to 2021 ${make} Empty`)).toBeFocused();
    await page.getByLabel(`Quantity to add to 2021 ${make} Empty`).fill('6');
    await page.getByRole('button', { name: 'Add stock' }).click();

    await expect(page.getByText(`Restocked 2021 ${make} Empty: added 6`)).toBeVisible();
    await expect(line).toContainText('Available');
    await expect(line.getByRole('cell', { name: '6', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Car Dealership' }).click();
    await searchByMake(page, make);
    await expect(vehicleCard(page, `2021 ${make} Empty`).getByRole('button', { name: 'Buy' })).toBeEnabled();
  });

  test('restock refuses a zero or fractional quantity before contacting the server', async ({ page, request }) => {
    const make = unique('Bad');
    await seedCar(request, { make, model: 'Qty' });
    await signInAsAdmin(page);
    await openAdminList(page, make);
    await page.getByRole('button', { name: `Restock 2021 ${make} Qty` }).click();

    for (const value of ['0', '2.5']) {
      await page.getByLabel(`Quantity to add to 2021 ${make} Qty`).fill(value);
      await page.getByRole('button', { name: 'Add stock' }).click();
      await expect(page.getByText('Enter a whole number from 1 to 1,000,000')).toBeVisible();
    }
  });

  test('delete asks first (Cancel keeps the vehicle), then removes it from the admin list and the shop', async ({ page, request }) => {
    const make = unique('Delete');
    await seedCar(request, { make, model: 'Doomed' });
    await signInAsAdmin(page);
    await openAdminList(page, make);
    const line = row(page, `2021 ${make} Doomed`);

    await page.getByRole('button', { name: `Delete 2021 ${make} Doomed` }).click();
    await expect(page.getByText(`Delete 2021 ${make} Doomed?`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(line).toBeVisible();

    await page.getByRole('button', { name: `Delete 2021 ${make} Doomed` }).click();
    await page.getByRole('button', { name: 'Confirm delete' }).click();

    await expect(page.getByText(`Deleted 2021 ${make} Doomed`)).toBeVisible();
    await expect(line).toHaveCount(0);
    await expect(page.getByText('No vehicles match your search.')).toBeVisible();

    await page.getByRole('link', { name: 'Car Dealership' }).click();
    await searchByMake(page, make);
    await expect(vehicleCard(page, `2021 ${make} Doomed`)).toHaveCount(0);
  });
});
