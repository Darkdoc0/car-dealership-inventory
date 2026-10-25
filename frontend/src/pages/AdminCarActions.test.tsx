import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { ApiError } from '../api/errors';
import type { Car, CarListParams } from '../api/types';
import { admin, createFakeSession, makeCar, makePage } from '../test/fakes';

const NAME = '2021 Toyota Corolla';
const corolla = (overrides: Partial<Car> = {}) =>
  makeCar({ id: 7, vin: 'TST00000000000007', make: 'Toyota', model: 'Corolla', year: 2021, quantity: 3, ...overrides });

/** An admin list backed by a mutable array, so a reload after a delete shows the change. */
function setup(cars: Car[] = [corolla()]) {
  const session = createFakeSession({ token: 't', user: admin });
  const store = [...cars];
  session.api.listCars.mockImplementation(async (params: CarListParams = {}) => {
    const { limit = 12, offset = 0 } = params;
    return makePage(store.slice(offset, offset + limit), store.length, limit, offset);
  });
  session.api.deleteCar.mockImplementation(async (id) => {
    store.splice(
      store.findIndex((c) => c.id === id),
      1,
    );
  });
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <App session={session} />
    </MemoryRouter>,
  );
  return { session, store };
}

const row = (name = NAME) => screen.findByRole('row', { name: new RegExp(name) });

describe('restocking from the admin list', () => {
  const openRestock = async () => {
    await row();
    await userEvent.click(screen.getByRole('button', { name: `Restock ${NAME}` }));
  };
  const quantityField = () => screen.getByLabelText(`Quantity to add to ${NAME}`);

  it('opens a quantity field for that vehicle, and Cancel closes it without calling the API', async () => {
    const { session } = setup();
    await openRestock();

    expect(quantityField()).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText(`Quantity to add to ${NAME}`)).not.toBeInTheDocument();
    expect(session.api.restockCar).not.toHaveBeenCalled();
  });

  it('moves focus into the quantity field when it opens', async () => {
    setup();

    await openRestock();

    expect(quantityField()).toHaveFocus();
  });

  it('adds the stock, shows the new count and confirms', async () => {
    const { session } = setup();
    session.api.restockCar.mockResolvedValue(corolla({ quantity: 8 }));
    await openRestock();

    await userEvent.type(quantityField(), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Add stock' }));

    expect(session.api.restockCar).toHaveBeenCalledWith(7, 5);
    await waitFor(() => expect(within(screen.getByRole('row', { name: /2021 Toyota Corolla/ })).getByText('8')).toBeInTheDocument());
    expect(await screen.findByText('Restocked 2021 Toyota Corolla: added 5')).toBeInTheDocument();
    expect(screen.queryByLabelText(`Quantity to add to ${NAME}`)).not.toBeInTheDocument();
  });

  it('shows a sold-out vehicle as available again after restocking it', async () => {
    const { session } = setup([corolla({ quantity: 0, status: 'sold' })]);
    session.api.restockCar.mockResolvedValue(corolla({ quantity: 2, status: 'available' }));
    await openRestock();
    expect(within(await row()).getByText('Sold')).toBeInTheDocument();

    await userEvent.type(quantityField(), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Add stock' }));

    await waitFor(() => expect(within(screen.getByRole('row', { name: /2021 Toyota Corolla/ })).getByText('Available')).toBeInTheDocument());
  });

  it.each([['0'], ['-3'], ['1.5'], ['1000001']])('rejects the quantity %p without calling the API', async (value) => {
    const { session } = setup();
    await openRestock();

    await userEvent.type(quantityField(), value);
    await userEvent.click(screen.getByRole('button', { name: 'Add stock' }));

    expect(await screen.findByText('Enter a whole number from 1 to 1,000,000')).toBeInTheDocument();
    expect(session.api.restockCar).not.toHaveBeenCalled();
  });

  it('rejects an empty quantity without calling the API', async () => {
    const { session } = setup();
    await openRestock();

    await userEvent.click(screen.getByRole('button', { name: 'Add stock' }));

    expect(await screen.findByText('Enter a whole number from 1 to 1,000,000')).toBeInTheDocument();
    expect(session.api.restockCar).not.toHaveBeenCalled();
  });

  it('shows the server message on that vehicle and keeps the form open when restocking fails', async () => {
    const { session } = setup();
    session.api.restockCar.mockRejectedValue(new ApiError(409, 'Stock limit exceeded'));
    await openRestock();

    await userEvent.type(quantityField(), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Add stock' }));

    expect(await within(await row()).findByRole('alert')).toHaveTextContent('Stock limit exceeded');
    expect(quantityField()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add stock' })).toBeEnabled();
  });

  it('disables the button and says so while adding stock', async () => {
    const { session } = setup();
    let finish: (car: Car) => void = () => undefined;
    session.api.restockCar.mockReturnValue(new Promise((r) => (finish = r)));
    await openRestock();

    await userEvent.type(quantityField(), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Add stock' }));

    expect(screen.getByRole('button', { name: 'Adding…' })).toBeDisabled();
    finish(corolla({ quantity: 8 }));
    await screen.findByText('Restocked 2021 Toyota Corolla: added 5');
  });
});

describe('deleting from the admin list', () => {
  const askToDelete = async () => {
    await row();
    await userEvent.click(screen.getByRole('button', { name: `Delete ${NAME}` }));
  };

  it('asks for confirmation first and does not call the API yet', async () => {
    const { session } = setup();

    await askToDelete();

    expect(screen.getByText(`Delete ${NAME}?`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument();
    expect(session.api.deleteCar).not.toHaveBeenCalled();
  });

  it('moves focus to Cancel so a stray Enter does not delete anything', async () => {
    setup();

    await askToDelete();

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('treats a vehicle that someone else already deleted as deleted and refreshes the list', async () => {
    const { session } = setup();
    session.api.deleteCar.mockRejectedValue(new ApiError(404, 'Car not found'));
    await askToDelete();
    const callsBefore = session.api.listCars.mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(await screen.findByText('Already deleted: 2021 Toyota Corolla')).toBeInTheDocument();
    await waitFor(() => expect(session.api.listCars.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the vehicle when the admin cancels', async () => {
    const { session } = setup();
    await askToDelete();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(`Delete ${NAME}?`)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Delete ${NAME}` })).toBeInTheDocument();
    expect(session.api.deleteCar).not.toHaveBeenCalled();
  });

  it('deletes the vehicle, removes it from the list and confirms', async () => {
    const { session } = setup([corolla(), makeCar({ id: 8, make: 'Honda', model: 'Civic', year: 2020 })]);
    await askToDelete();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(session.api.deleteCar).toHaveBeenCalledWith(7);
    expect(await screen.findByText('Deleted 2021 Toyota Corolla')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('row', { name: /2021 Toyota Corolla/ })).not.toBeInTheDocument());
    expect(screen.getByRole('row', { name: /2020 Honda Civic/ })).toBeInTheDocument();
  });

  it('shows the server message and keeps the vehicle when deleting fails', async () => {
    const { session } = setup();
    session.api.deleteCar.mockRejectedValue(new ApiError(500, 'Internal server error'));
    await askToDelete();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(await within(await row()).findByRole('alert')).toHaveTextContent('Internal server error');
    expect(screen.getByRole('row', { name: /2021 Toyota Corolla/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeEnabled();
  });

  it('disables the button and says so while deleting', async () => {
    const { session } = setup();
    let finish: () => void = () => undefined;
    session.api.deleteCar.mockReturnValue(new Promise<void>((r) => (finish = r)));
    await askToDelete();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    finish();
    await screen.findByText('Deleted 2021 Toyota Corolla');
  });

  it('goes back one page when the last vehicle on a later page is deleted', async () => {
    const cars = Array.from({ length: 13 }, (_, i) =>
      i === 12 ? corolla({ id: 13 }) : makeCar({ id: i + 1, model: `Model ${i + 1}` }),
    );
    const { session } = setup(cars);
    await screen.findByText('Showing 1–12 of 13 vehicles');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Showing 13–13 of 13 vehicles');
    await userEvent.click(screen.getByRole('button', { name: `Delete ${NAME}` }));

    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(await screen.findByText('Showing 1–12 of 12 vehicles')).toBeInTheDocument();
    expect(session.api.listCars.mock.calls.at(-1)?.[0]).toMatchObject({ offset: 0 });
  });
});
