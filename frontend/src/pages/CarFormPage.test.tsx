import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { ApiError } from '../api/errors';
import type { Car } from '../api/types';
import { admin, createFakeSession, makeCar, member } from '../test/fakes';

function renderAt(route: string, session = createFakeSession({ token: 't', user: admin })) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <App session={session} />
    </MemoryRouter>,
  );
  return session;
}

const saved = (overrides: Partial<Car> = {}) =>
  makeCar({ id: 7, vin: 'TST12345678901234', make: 'Toyota', model: 'Corolla', year: 2021, priceCents: 1850000, quantity: 3, ...overrides });

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText('VIN'), 'tst12345678901234');
  await userEvent.type(screen.getByLabelText('Make'), 'Toyota');
  await userEvent.type(screen.getByLabelText('Model'), 'Corolla');
  await userEvent.type(screen.getByLabelText('Year'), '2021');
  await userEvent.type(screen.getByLabelText('Mileage'), '42000');
  await userEvent.type(screen.getByLabelText('Price ($)'), '18500.50');
  await userEvent.selectOptions(screen.getByLabelText('Category'), 'sedan');
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save vehicle' }));

describe('Add vehicle page', () => {
  it('shows every field, with sensible defaults for quantity and status', async () => {
    renderAt('/admin/cars/new');

    expect(await screen.findByRole('heading', { name: 'Add vehicle' })).toBeInTheDocument();
    for (const label of ['VIN', 'Make', 'Model', 'Year', 'Mileage', 'Price ($)', 'Category', 'Quantity', 'Status']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Quantity')).toHaveValue(1);
    expect(screen.getByLabelText('Status')).toHaveValue('available');
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/admin');
  });

  it('creates the vehicle with the typed values and returns to the list with a confirmation', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.createCar.mockResolvedValue(saved());
    renderAt('/admin/cars/new', session);
    await screen.findByRole('heading', { name: 'Add vehicle' });

    await fillValidForm();
    await save();

    expect(await screen.findByRole('heading', { name: 'Manage vehicles' })).toBeInTheDocument();
    expect(await screen.findByText('Added 2021 Toyota Corolla')).toBeInTheDocument();
    expect(session.api.createCar).toHaveBeenCalledWith({
      vin: 'TST12345678901234',
      make: 'Toyota',
      model: 'Corolla',
      year: 2021,
      mileage: 42000,
      priceCents: 1850050,
      category: 'sedan',
      quantity: 1,
      status: 'available',
    });
  });

  it('shows every problem next to its field and does not call the API', async () => {
    const session = renderAt('/admin/cars/new');
    await screen.findByRole('heading', { name: 'Add vehicle' });

    await save();

    expect(await screen.findByText('VIN must be 17 letters and digits (no I, O or Q)')).toBeInTheDocument();
    expect(screen.getByText('Make is required')).toBeInTheDocument();
    expect(screen.getByText('Model is required')).toBeInTheDocument();
    expect(screen.getByText('Choose a category')).toBeInTheDocument();
    expect(screen.getByLabelText('VIN')).toHaveAttribute('aria-invalid', 'true');
    expect(session.api.createCar).not.toHaveBeenCalled();
  });

  it('clears a field error once the form is submitted correctly', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.createCar.mockResolvedValue(saved());
    renderAt('/admin/cars/new', session);
    await screen.findByRole('heading', { name: 'Add vehicle' });
    await save();
    await screen.findByText('Make is required');

    await fillValidForm();
    await save();

    await waitFor(() => expect(screen.queryByText('Make is required')).not.toBeInTheDocument());
    expect(session.api.createCar).toHaveBeenCalledTimes(1);
  });

  it('shows the server message and stays on the form when the VIN already exists', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.createCar.mockRejectedValue(new ApiError(409, 'A car with this VIN already exists'));
    renderAt('/admin/cars/new', session);
    await screen.findByRole('heading', { name: 'Add vehicle' });
    await fillValidForm();

    await save();

    expect(await screen.findByRole('alert')).toHaveTextContent('A car with this VIN already exists');
    expect(screen.getByRole('heading', { name: 'Add vehicle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save vehicle' })).toBeEnabled();
  });

  it('disables the button and says so while saving', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    let finish: (car: Car) => void = () => undefined;
    session.api.createCar.mockReturnValue(new Promise((r) => (finish = r)));
    renderAt('/admin/cars/new', session);
    await screen.findByRole('heading', { name: 'Add vehicle' });
    await fillValidForm();

    await save();

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    finish(saved());
    await screen.findByRole('heading', { name: 'Manage vehicles' });
  });

  it('is not available to a regular user', async () => {
    renderAt('/admin/cars/new', createFakeSession({ token: 't', user: member }));

    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Add vehicle' })).not.toBeInTheDocument();
  });
});

describe('Edit vehicle page', () => {
  function sessionWithCar(car: Car = saved()) {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.getCar.mockResolvedValue(car);
    return session;
  }

  it('loads the vehicle and fills the form, showing stock read-only', async () => {
    const session = sessionWithCar();
    renderAt('/admin/cars/7/edit', session);

    expect(await screen.findByRole('heading', { name: 'Edit 2021 Toyota Corolla' })).toBeInTheDocument();
    expect(session.api.getCar).toHaveBeenCalledWith(7);
    expect(screen.getByLabelText('VIN')).toHaveValue('TST12345678901234');
    expect(screen.getByLabelText('Make')).toHaveValue('Toyota');
    expect(screen.getByLabelText('Price ($)')).toHaveValue('18500.00');
    expect(screen.getByLabelText('Category')).toHaveValue('sedan');
    expect(screen.getByText('3 in stock')).toBeInTheDocument();
    expect(screen.queryByLabelText('Quantity')).not.toBeInTheDocument();
  });

  it('shows a loading message while the vehicle is fetched', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.getCar.mockReturnValue(new Promise(() => undefined));

    renderAt('/admin/cars/7/edit', session);

    expect(await screen.findByText('Loading vehicle…')).toBeInTheDocument();
  });

  it('sends only the changed fields and confirms on the list', async () => {
    const session = sessionWithCar();
    session.api.updateCar.mockResolvedValue(saved({ priceCents: 1700000 }));
    renderAt('/admin/cars/7/edit', session);
    await screen.findByRole('heading', { name: 'Edit 2021 Toyota Corolla' });

    await userEvent.clear(screen.getByLabelText('Price ($)'));
    await userEvent.type(screen.getByLabelText('Price ($)'), '17000');
    await save();

    expect(await screen.findByRole('heading', { name: 'Manage vehicles' })).toBeInTheDocument();
    expect(session.api.updateCar).toHaveBeenCalledWith(7, { priceCents: 1700000 });
    expect(await screen.findByText('Saved 2021 Toyota Corolla')).toBeInTheDocument();
  });

  it('names the vehicle by its saved values in the confirmation', async () => {
    const session = sessionWithCar();
    session.api.updateCar.mockResolvedValue(saved({ model: 'Camry' }));
    renderAt('/admin/cars/7/edit', session);
    await screen.findByRole('heading', { name: 'Edit 2021 Toyota Corolla' });

    await userEvent.clear(screen.getByLabelText('Model'));
    await userEvent.type(screen.getByLabelText('Model'), 'Camry');
    await save();

    expect(await screen.findByText('Saved 2021 Toyota Camry')).toBeInTheDocument();
  });

  it('goes back to the list without calling the API when nothing changed', async () => {
    const session = sessionWithCar();
    renderAt('/admin/cars/7/edit', session);
    await screen.findByRole('heading', { name: 'Edit 2021 Toyota Corolla' });

    await save();

    expect(await screen.findByRole('heading', { name: 'Manage vehicles' })).toBeInTheDocument();
    expect(session.api.updateCar).not.toHaveBeenCalled();
  });

  it('validates the edited values before sending', async () => {
    const session = sessionWithCar();
    renderAt('/admin/cars/7/edit', session);
    await screen.findByRole('heading', { name: 'Edit 2021 Toyota Corolla' });

    await userEvent.clear(screen.getByLabelText('Make'));
    await save();

    expect(await screen.findByText('Make is required')).toBeInTheDocument();
    expect(session.api.updateCar).not.toHaveBeenCalled();
  });

  it('shows the server message when the new VIN belongs to another vehicle', async () => {
    const session = sessionWithCar();
    session.api.updateCar.mockRejectedValue(new ApiError(409, 'A car with this VIN already exists'));
    renderAt('/admin/cars/7/edit', session);
    await screen.findByRole('heading', { name: 'Edit 2021 Toyota Corolla' });

    await userEvent.clear(screen.getByLabelText('VIN'));
    await userEvent.type(screen.getByLabelText('VIN'), 'TST99999999999999');
    await save();

    expect(await screen.findByRole('alert')).toHaveTextContent('A car with this VIN already exists');
    expect(screen.getByRole('heading', { name: 'Edit 2021 Toyota Corolla' })).toBeInTheDocument();
  });

  it('says so, with a way back, when the vehicle does not exist', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.getCar.mockRejectedValue(new ApiError(404, 'Car not found'));

    renderAt('/admin/cars/999/edit', session);

    expect(await screen.findByRole('heading', { name: 'Vehicle not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to vehicles' })).toHaveAttribute('href', '/admin');
  });

  it('treats a malformed id as not found without calling the API', async () => {
    const session = createFakeSession({ token: 't', user: admin });

    renderAt('/admin/cars/abc/edit', session);

    expect(await screen.findByRole('heading', { name: 'Vehicle not found' })).toBeInTheDocument();
    expect(session.api.getCar).not.toHaveBeenCalled();
  });

  it('shows the error when the vehicle cannot be loaded for another reason', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.getCar.mockRejectedValue(new ApiError(0, 'Cannot reach the server. Check your connection and try again.'));

    renderAt('/admin/cars/7/edit', session);

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    expect(screen.getByRole('link', { name: 'Back to vehicles' })).toBeInTheDocument();
  });
});
