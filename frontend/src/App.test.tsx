import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { createFakeSession, member } from './test/fakes';

function renderAt(route: string, session = createFakeSession()) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <App session={session} />
    </MemoryRouter>,
  );
  return session;
}

describe('App routing', () => {
  it('sends an anonymous visitor from the dashboard to the sign-in page', async () => {
    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows a loading state while a stored token is being verified', async () => {
    const session = createFakeSession({ token: 'jwt-stored' });
    session.api.me.mockReturnValue(new Promise(() => undefined));

    renderAt('/', session);

    expect(await screen.findByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('shows the dashboard with the signed-in email for an authenticated user', async () => {
    renderAt('/', createFakeSession({ token: 'jwt-stored', user: member }));

    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument();
    expect(screen.getByText('member@example.com')).toBeInTheDocument();
  });

  it('signs out and returns to the sign-in page', async () => {
    const session = renderAt('/', createFakeSession({ token: 'jwt-stored', user: member }));
    await screen.findByRole('heading', { name: 'Vehicles' });

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(session.store.get()).toBeNull();
  });

  it('returns to the sign-in page when the session expires mid-use', async () => {
    const session = renderAt('/', createFakeSession({ token: 'jwt-stored', user: member }));
    await screen.findByRole('heading', { name: 'Vehicles' });

    session.expire();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument());
  });

  it('shows a not-found page with a way home for unknown routes', async () => {
    renderAt('/no-such-page');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/');
  });
});
