import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { ApiError } from '../api/errors';
import type { Car, CarListParams, CarListResult } from '../api/types';
import { createFakeSession, makeCar, makePage, member } from '../test/fakes';

function renderDashboard(session = createFakeSession({ token: 't', user: member })) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App session={session} />
    </MemoryRouter>,
  );
  return session;
}

const corolla = () => makeCar({ id: 1, make: 'Toyota', model: 'Corolla', year: 2021, quantity: 3 });
const card = (name: string) => screen.findByRole('article', { name });
const lastListCall = (session: ReturnType<typeof createFakeSession>) =>
  session.api.listCars.mock.calls.at(-1)?.[0] as CarListParams;

/** 30 cars, served in the pages the dashboard asks for. */
function serveThirtyCars(session: ReturnType<typeof createFakeSession>) {
  session.api.listCars.mockImplementation(async (params = {}) => {
    const { limit = 12, offset = 0 } = params;
    const all = Array.from({ length: 30 }, (_, i) => makeCar({ id: i + 1, model: `Model ${i + 1}` }));
    return makePage(all.slice(offset, offset + limit), 30, limit, offset);
  });
}

describe('DashboardPage listing', () => {
  it('shows a loading message, then the first page of vehicles', async () => {
    const session = createFakeSession({ token: 't', user: member });
    let resolve: (page: CarListResult) => void = () => undefined;
    session.api.listCars.mockReturnValue(new Promise((r) => (resolve = r)));

    renderDashboard(session);

    expect(await screen.findByText('Loading vehicles…')).toBeInTheDocument();
    resolve(makePage([corolla()]));
    expect(await card('2021 Toyota Corolla')).toBeInTheDocument();
    expect(screen.queryByText('Loading vehicles…')).not.toBeInTheDocument();
    expect(lastListCall(session)).toEqual({ limit: 12, offset: 0 });
  });

  it('shows each vehicle with its price, mileage, category and stock', async () => {
    const session = createFakeSession({ token: 't', user: member });
    session.api.listCars.mockResolvedValue(makePage([corolla()]));

    renderDashboard(session);

    const vehicle = within(await card('2021 Toyota Corolla'));
    expect(vehicle.getByText('$18,500.00')).toBeInTheDocument();
    expect(vehicle.getByText('42,000 mi')).toBeInTheDocument();
    expect(vehicle.getByText('Sedan')).toBeInTheDocument();
    expect(vehicle.getByText('3 in stock')).toBeInTheDocument();
  });

  it('explains when nothing matches', async () => {
    const session = createFakeSession({ token: 't', user: member });
    session.api.listCars.mockResolvedValue(makePage([]));

    renderDashboard(session);

    expect(await screen.findByText('No vehicles match your search.')).toBeInTheDocument();
  });

  it('shows the error and a retry button when loading fails', async () => {
    const session = createFakeSession({ token: 't', user: member });
    session.api.listCars.mockRejectedValueOnce(new ApiError(0, 'Cannot reach the server. Check your connection and try again.'));
    session.api.listCars.mockResolvedValue(makePage([corolla()]));

    renderDashboard(session);

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await card('2021 Toyota Corolla')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('DashboardPage search', () => {
  it('searches by make, model, category and price range', async () => {
    const session = createFakeSession({ token: 't', user: member });
    session.api.listCars.mockResolvedValue(makePage([corolla()]));
    renderDashboard(session);
    await card('2021 Toyota Corolla');

    await userEvent.type(screen.getByLabelText('Make'), 'Toyota');
    await userEvent.type(screen.getByLabelText('Model'), 'Corolla');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'suv');
    await userEvent.type(screen.getByLabelText('Min price ($)'), '10000');
    await userEvent.type(screen.getByLabelText('Max price ($)'), '20000');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() =>
      expect(lastListCall(session)).toEqual({
        make: 'Toyota',
        model: 'Corolla',
        category: 'suv',
        minPrice: 1000000,
        maxPrice: 2000000,
        limit: 12,
        offset: 0,
      }),
    );
  });

  it('runs the search again when Search is pressed with the same filters, to pick up changes made by others', async () => {
    const session = createFakeSession({ token: 't', user: member });
    session.api.listCars.mockResolvedValueOnce(makePage([makeCar({ id: 1, quantity: 3 })]));
    session.api.listCars.mockResolvedValue(makePage([makeCar({ id: 1, quantity: 1 })]));
    renderDashboard(session);
    expect(await screen.findByText('3 in stock')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('1 in stock')).toBeInTheDocument();
    expect(session.api.listCars).toHaveBeenCalledTimes(2);
  });

  it('offers every category plus an "All categories" choice', async () => {
    const session = createFakeSession({ token: 't', user: member });
    session.api.listCars.mockResolvedValue(makePage([]));
    renderDashboard(session);

    const options = within(await screen.findByLabelText('Category')).getAllByRole('option');

    expect(options.map((o) => o.textContent)).toEqual([
      'All categories',
      'Sedan',
      'SUV',
      'Truck',
      'Hatchback',
      'Coupe',
      'Convertible',
      'Van',
    ]);
  });

  it('clears every filter and reloads the unfiltered list', async () => {
    const session = createFakeSession({ token: 't', user: member });
    session.api.listCars.mockResolvedValue(makePage([corolla()]));
    renderDashboard(session);
    await card('2021 Toyota Corolla');
    await userEvent.type(screen.getByLabelText('Make'), 'Ford');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(lastListCall(session)).toMatchObject({ make: 'Ford' }));

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => expect(lastListCall(session)).toEqual({ limit: 12, offset: 0 }));
    expect(screen.getByLabelText('Make')).toHaveValue('');
  });

  it('shows only the newest search when an older request finishes late', async () => {
    const session = createFakeSession({ token: 't', user: member });
    let resolveOld: (page: CarListResult) => void = () => undefined;
    session.api.listCars.mockReturnValueOnce(new Promise((r) => (resolveOld = r)));
    session.api.listCars.mockResolvedValue(makePage([makeCar({ id: 2, make: 'Honda', model: 'Civic' })]));
    renderDashboard(session);
    await screen.findByText('Loading vehicles…');

    await userEvent.type(screen.getByLabelText('Make'), 'Honda');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await card('2021 Honda Civic');
    resolveOld(makePage([makeCar({ id: 1, make: 'Toyota', model: 'Corolla' })]));

    await waitFor(() => expect(session.api.listCars).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('article', { name: '2021 Toyota Corolla' })).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: '2021 Honda Civic' })).toBeInTheDocument();
  });
});

describe('DashboardPage pagination', () => {
  it('shows the range and total, with Previous disabled on the first page', async () => {
    const session = createFakeSession({ token: 't', user: member });
    serveThirtyCars(session);

    renderDashboard(session);

    expect(await screen.findByText('Showing 1–12 of 30 vehicles')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('moves to the next page and back', async () => {
    const session = createFakeSession({ token: 't', user: member });
    serveThirtyCars(session);
    renderDashboard(session);
    await screen.findByText('Showing 1–12 of 30 vehicles');

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Showing 13–24 of 30 vehicles')).toBeInTheDocument();
    expect(lastListCall(session)).toMatchObject({ offset: 12, limit: 12 });
    expect(await card('2021 Toyota Model 13')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(await screen.findByText('Showing 1–12 of 30 vehicles')).toBeInTheDocument();
  });

  it('disables Next on the last, partial page', async () => {
    const session = createFakeSession({ token: 't', user: member });
    serveThirtyCars(session);
    renderDashboard(session);
    await screen.findByText('Showing 1–12 of 30 vehicles');

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Showing 13–24 of 30 vehicles');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Showing 25–30 of 30 vehicles')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('keeps the current results and the paging buttons in place while the next page loads', async () => {
    const session = createFakeSession({ token: 't', user: member });
    const firstPage = Array.from({ length: 12 }, (_, i) => makeCar({ id: i + 1, model: `Model ${i + 1}` }));
    const secondPage = Array.from({ length: 12 }, (_, i) => makeCar({ id: i + 13, model: `Model ${i + 13}` }));
    let resolveSecond: (page: CarListResult) => void = () => undefined;
    session.api.listCars.mockImplementation(async (params = {}) =>
      params.offset === 12 ? new Promise<CarListResult>((r) => (resolveSecond = r)) : makePage(firstPage, 30, 12, 0),
    );
    renderDashboard(session);
    await screen.findByText('Showing 1–12 of 30 vehicles');
    const next = screen.getByRole('button', { name: 'Next' });

    await userEvent.click(next);

    expect(screen.getAllByRole('article')).toHaveLength(12);
    expect(screen.queryByText('Loading vehicles…')).not.toBeInTheDocument();
    expect(next).toBeInTheDocument();
    expect(next).toBeDisabled();
    resolveSecond(makePage(secondPage, 30, 12, 12));
    expect(await screen.findByText('Showing 13–24 of 30 vehicles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('goes back to the first page when a new search is run', async () => {
    const session = createFakeSession({ token: 't', user: member });
    serveThirtyCars(session);
    renderDashboard(session);
    await screen.findByText('Showing 1–12 of 30 vehicles');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Showing 13–24 of 30 vehicles');

    await userEvent.type(screen.getByLabelText('Make'), 'Toyota');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(lastListCall(session)).toMatchObject({ make: 'Toyota', offset: 0 }));
  });

  it('hides pagination when there are no results', async () => {
    const session = createFakeSession({ token: 't', user: member });
    session.api.listCars.mockResolvedValue(makePage([]));

    renderDashboard(session);

    await screen.findByText('No vehicles match your search.');
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });
});

describe('DashboardPage purchase', () => {
  const buyButton = (vehicle: HTMLElement) => within(vehicle).getByRole('button');

  it('buys one unit and updates the stock shown', async () => {
    const session = createFakeSession({ token: 't', user: member });
    const car = corolla();
    session.api.listCars.mockResolvedValue(makePage([car]));
    session.api.purchaseCar.mockResolvedValue({ ...car, quantity: 2 });
    renderDashboard(session);
    const vehicle = await card('2021 Toyota Corolla');

    await userEvent.click(buyButton(vehicle));

    expect(session.api.purchaseCar).toHaveBeenCalledWith(1);
    await waitFor(() => expect(within(vehicle).getByText('2 in stock')).toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Purchased 2021 Toyota Corolla');
    expect(buyButton(vehicle)).toHaveTextContent('Buy');
  });

  it('disables the button and shows "Sold out" once the last unit is bought', async () => {
    const session = createFakeSession({ token: 't', user: member });
    const car = makeCar({ id: 1, quantity: 1 });
    session.api.listCars.mockResolvedValue(makePage([car]));
    session.api.purchaseCar.mockResolvedValue({ ...car, quantity: 0, status: 'sold' });
    renderDashboard(session);
    const vehicle = await card('2021 Toyota Corolla');

    await userEvent.click(buyButton(vehicle));

    await waitFor(() => expect(buyButton(vehicle)).toBeDisabled());
    expect(buyButton(vehicle)).toHaveTextContent('Sold out');
    expect(within(vehicle).getByText('0 in stock')).toBeInTheDocument();
  });

  it('shows a disabled "Sold out" button for a vehicle that has no stock', async () => {
    const session = createFakeSession({ token: 't', user: member });
    session.api.listCars.mockResolvedValue(makePage([makeCar({ id: 1, quantity: 0 })]));

    renderDashboard(session);

    const vehicle = await card('2021 Toyota Corolla');
    expect(buyButton(vehicle)).toBeDisabled();
    expect(buyButton(vehicle)).toHaveTextContent('Sold out');
    await userEvent.click(buyButton(vehicle));
    expect(session.api.purchaseCar).not.toHaveBeenCalled();
  });

  it('shows a disabled "Reserved" button for a reserved vehicle', async () => {
    const session = createFakeSession({ token: 't', user: member });
    session.api.listCars.mockResolvedValue(makePage([makeCar({ id: 1, quantity: 1, status: 'reserved' })]));

    renderDashboard(session);

    const vehicle = await card('2021 Toyota Corolla');
    expect(buyButton(vehicle)).toBeDisabled();
    expect(buyButton(vehicle)).toHaveTextContent('Reserved');
  });

  it('shows the server message on that vehicle and re-enables the button when buying fails', async () => {
    const session = createFakeSession({ token: 't', user: member });
    session.api.listCars.mockResolvedValue(makePage([corolla()]));
    session.api.purchaseCar.mockRejectedValue(new ApiError(409, 'Not enough stock available'));
    renderDashboard(session);
    const vehicle = await card('2021 Toyota Corolla');

    await userEvent.click(buyButton(vehicle));

    expect(await within(vehicle).findByRole('alert')).toHaveTextContent('Not enough stock available');
    expect(buyButton(vehicle)).toBeEnabled();
  });

  it('blocks a second purchase while one is in flight', async () => {
    const session = createFakeSession({ token: 't', user: member });
    const car = corolla();
    let finish: (car: Car) => void = () => undefined;
    session.api.listCars.mockResolvedValue(makePage([car]));
    session.api.purchaseCar.mockReturnValue(new Promise((r) => (finish = r)));
    renderDashboard(session);
    const vehicle = await card('2021 Toyota Corolla');

    await userEvent.click(buyButton(vehicle));
    expect(buyButton(vehicle)).toBeDisabled();
    expect(buyButton(vehicle)).toHaveTextContent('Buying…');
    await userEvent.click(buyButton(vehicle));
    finish({ ...car, quantity: 2 });

    await waitFor(() => expect(within(vehicle).getByText('2 in stock')).toBeInTheDocument());
    expect(session.api.purchaseCar).toHaveBeenCalledTimes(1);
  });
});
