import { expect, test } from '@playwright/test';
import { registerUser, seedCar, seedCars, unique } from '../support/api';
import { searchByMake, signInToShop, vehicleCard } from '../support/ui';

test.describe('searching the vehicle list', () => {
  test('searching by make shows only that make and says so when nothing matches', async ({ page, request }) => {
    const wanted = unique('Wanted');
    const other = unique('Other');
    await seedCar(request, { make: wanted, model: 'Alpha' });
    await seedCar(request, { make: other, model: 'Beta' });
    const user = await registerUser(request);
    await signInToShop(page, user.email, user.password);

    await searchByMake(page, wanted);

    await expect(vehicleCard(page, `2021 ${wanted} Alpha`)).toBeVisible();
    await expect(vehicleCard(page, `2021 ${other} Beta`)).toHaveCount(0);

    await searchByMake(page, unique('NoSuchMake'));
    await expect(page.getByText('No vehicles match your search.')).toBeVisible();
  });

  test('category and price range narrow the results, and Clear brings everything back', async ({ page, request }) => {
    const make = unique('Mix');
    await seedCar(request, { make, model: 'Cheap', category: 'sedan', priceCents: 1000000 });
    await seedCar(request, { make, model: 'Middle', category: 'suv', priceCents: 3000000 });
    await seedCar(request, { make, model: 'Dear', category: 'truck', priceCents: 5000000 });
    const user = await registerUser(request);
    await signInToShop(page, user.email, user.password);
    await searchByMake(page, make);
    await expect(page.getByRole('article')).toHaveCount(3);

    await page.getByLabel('Category').selectOption('suv');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(vehicleCard(page, `2021 ${make} Middle`)).toBeVisible();

    await page.getByLabel('Category').selectOption('');
    await page.getByLabel('Min price ($)').fill('20000');
    await page.getByLabel('Max price ($)').fill('40000');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(vehicleCard(page, `2021 ${make} Middle`)).toBeVisible();
    await expect(vehicleCard(page, `2021 ${make} Middle`).getByText('$30,000.00')).toBeVisible();

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByLabel('Make')).toHaveValue('');
    await expect(page.getByRole('article').first()).toBeVisible();
  });

  test('a long result list is paged: 12 per page with working Previous and Next', async ({ page, request }) => {
    const make = unique('Paged');
    await seedCars(request, make, 13);
    const user = await registerUser(request);
    await signInToShop(page, user.email, user.password);

    await searchByMake(page, make);

    await expect(page.getByText('Showing 1–12 of 13 vehicles')).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(12);
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Showing 13–13 of 13 vehicles')).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();

    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page.getByText('Showing 1–12 of 13 vehicles')).toBeVisible();
  });
});

test.describe('buying a vehicle', () => {
  test('each purchase takes one unit from stock, the last one makes the button Sold out, and it survives a reload', async ({
    page,
    request,
  }) => {
    const make = unique('Buy');
    await seedCar(request, { make, model: 'Two', quantity: 2 });
    const user = await registerUser(request);
    await signInToShop(page, user.email, user.password);
    await searchByMake(page, make);
    const card = vehicleCard(page, `2021 ${make} Two`);
    await expect(card.getByText('2 in stock')).toBeVisible();

    await card.getByRole('button', { name: 'Buy' }).click();
    await expect(card.getByText('1 in stock')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText(`Purchased 2021 ${make} Two`);

    await card.getByRole('button', { name: 'Buy' }).click();
    await expect(card.getByText('0 in stock')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Sold out' })).toBeDisabled();

    await page.reload();
    await searchByMake(page, make);
    await expect(card.getByText('0 in stock')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Sold out' })).toBeDisabled();
  });

  test('a vehicle with no stock, and a reserved one, cannot be bought', async ({ page, request }) => {
    const make = unique('Unavailable');
    await seedCar(request, { make, model: 'Empty', quantity: 0 });
    await seedCar(request, { make, model: 'Held', quantity: 2, status: 'reserved' });
    const user = await registerUser(request);
    await signInToShop(page, user.email, user.password);

    await searchByMake(page, make);

    await expect(vehicleCard(page, `2021 ${make} Empty`).getByRole('button')).toBeDisabled();
    await expect(vehicleCard(page, `2021 ${make} Empty`).getByRole('button')).toHaveText('Sold out');
    await expect(vehicleCard(page, `2021 ${make} Held`).getByRole('button')).toBeDisabled();
    await expect(vehicleCard(page, `2021 ${make} Held`).getByRole('button')).toHaveText('Reserved');
  });

  test('when two shoppers race for the last unit, one wins and the other is told it is gone', async ({ browser, request }) => {
    const make = unique('Race');
    await seedCar(request, { make, model: 'Last', quantity: 1 });
    const alice = await registerUser(request);
    const bob = await registerUser(request);

    const aliceContext = await browser.newContext();
    const bobContext = await browser.newContext();
    try {
      const alicePage = await aliceContext.newPage();
      const bobPage = await bobContext.newPage();
      for (const [shopper, p] of [
        [alice, alicePage],
        [bob, bobPage],
      ] as const) {
        await signInToShop(p, shopper.email, shopper.password);
        await searchByMake(p, make);
        await expect(vehicleCard(p, `2021 ${make} Last`).getByText('1 in stock')).toBeVisible();
      }

      await vehicleCard(alicePage, `2021 ${make} Last`).getByRole('button', { name: 'Buy' }).click();
      await expect(vehicleCard(alicePage, `2021 ${make} Last`).getByText('0 in stock')).toBeVisible();

      // Bob's page is stale: it still shows one unit in stock and an enabled Buy button.
      const bobCard = vehicleCard(bobPage, `2021 ${make} Last`);
      await expect(bobCard.getByRole('button', { name: 'Buy' })).toBeEnabled();
      await bobCard.getByRole('button', { name: 'Buy' }).click();

      await expect(bobCard.getByRole('alert')).toHaveText('Not enough stock available');
      await expect(bobPage.getByRole('status')).toHaveCount(0);
    } finally {
      await aliceContext.close();
      await bobContext.close();
    }
  });
});
