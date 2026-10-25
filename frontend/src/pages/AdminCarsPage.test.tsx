import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { ApiError } from '../api/errors';
import type { CarListParams } from '../api/types';
import { admin, createFakeSession, makeCar, makePage, member } from '../test/fakes';

function renderAt(route: string, session = createFakeSession({ token: 't', user: admin })) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <App session={session} />
    </MemoryRouter>,
  );
  return session;
}

const lastListCall = (session: ReturnType<typeof createFakeSession>) =>
  session.api.listCars.mock.calls.at(-1)?.[0] as CarListParams;

const corolla = () =>
  makeCar({ id: 7, vin: 'TST00000000000007', make: 'Toyota', model: 'Corolla', year: 2021, quantity: 3, status: 'available' });

describe('admin access', () => {
  it('shows an admin a "Manage vehicles" link that opens the management page', async () => {
    renderAt('/');

    await userEvent.click(await screen.findByRole('link', { name: 'Manage vehicles' }));

    expect(await screen.findByRole('heading', { name: 'Manage vehicles' })).toBeInTheDocument();
  });

  it('does not show the link to a regular user', async () => {
    renderAt('/', createFakeSession({ token: 't', user: member }));

    await screen.findByRole('heading', { name: 'Vehicles' });
    expect(screen.queryByRole('link', { name: 'Manage vehicles' })).not.toBeInTheDocument();
  });

  it('sends a regular user who opens /admin back to the vehicle list', async () => {
    renderAt('/admin', createFakeSession({ token: 't', user: member }));

    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Manage vehicles' })).not.toBeInTheDocument();
  });

  it('sends an anonymous visitor who opens /admin to the sign-in page', async () => {
    renderAt('/admin', createFakeSession());

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('AdminCarsPage', () => {
  it('lists vehicles in a table with their details', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.listCars.mockResolvedValue(makePage([corolla()]));

    renderAt('/admin', session);

    const row = within(await screen.findByRole('row', { name: /2021 Toyota Corolla/ }));
    expect(row.getByText('TST00000000000007')).toBeInTheDocument();
    expect(row.getByText('Sedan')).toBeInTheDocument();
    expect(row.getByText('$18,500.00')).toBeInTheDocument();
    expect(row.getByText('3')).toBeInTheDocument();
    expect(row.getByText('Available')).toBeInTheDocument();
    expect(lastListCall(session)).toEqual({ limit: 12, offset: 0 });
  });

  it('links to the add form and to an edit form for each vehicle', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.listCars.mockResolvedValue(makePage([corolla()]));

    renderAt('/admin', session);

    expect(await screen.findByRole('link', { name: 'Add vehicle' })).toHaveAttribute('href', '/admin/cars/new');
    expect(screen.getByRole('link', { name: 'Edit 2021 Toyota Corolla' })).toHaveAttribute('href', '/admin/cars/7/edit');
  });

  it('searches with the same filters as the shop', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.listCars.mockResolvedValue(makePage([corolla()]));
    renderAt('/admin', session);
    await screen.findByRole('row', { name: /2021 Toyota Corolla/ });

    await userEvent.type(screen.getByLabelText('Make'), 'Toyota');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'sedan');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(lastListCall(session)).toEqual({ make: 'Toyota', category: 'sedan', limit: 12, offset: 0 }));
  });

  it('pages through the list', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.listCars.mockImplementation(async (params = {}) => {
      const { limit = 12, offset = 0 } = params;
      const all = Array.from({ length: 30 }, (_, i) => makeCar({ id: i + 1, model: `Model ${i + 1}` }));
      return makePage(all.slice(offset, offset + limit), 30, limit, offset);
    });
    renderAt('/admin', session);
    await screen.findByText('Showing 1–12 of 30 vehicles');

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Showing 13–24 of 30 vehicles')).toBeInTheDocument();
    expect(lastListCall(session)).toMatchObject({ offset: 12 });
  });

  it('explains when nothing matches', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.listCars.mockResolvedValue(makePage([]));

    renderAt('/admin', session);

    expect(await screen.findByText('No vehicles match your search.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add vehicle' })).toBeInTheDocument();
  });

  it('shows the error with a retry button when loading fails', async () => {
    const session = createFakeSession({ token: 't', user: admin });
    session.api.listCars.mockRejectedValueOnce(new ApiError(500, 'Internal server error'));
    session.api.listCars.mockResolvedValue(makePage([corolla()]));

    renderAt('/admin', session);

    expect(await screen.findByRole('alert')).toHaveTextContent('Internal server error');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('row', { name: /2021 Toyota Corolla/ })).toBeInTheDocument();
  });
});
