import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { ApiError } from '../api/errors';
import { createFakeSession, member } from '../test/fakes';

function renderLogin(session = createFakeSession()) {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App session={session} />
    </MemoryRouter>,
  );
  return session;
}

const fillAndSubmit = async (email: string, password: string) => {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('LoginPage', () => {
  it('shows labelled email and password fields, a submit button and a link to register', async () => {
    renderLogin();

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register');
  });

  it('signs in with the typed credentials and lands on the dashboard', async () => {
    const session = createFakeSession();
    session.api.login.mockResolvedValue({ token: 'jwt-1', user: { id: member.id, email: member.email } });
    session.api.me.mockResolvedValue(member);
    renderLogin(session);
    await screen.findByRole('heading', { name: 'Sign in' });

    await fillAndSubmit('member@example.com', 'Sup3rSecret!');

    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument();
    expect(session.api.login).toHaveBeenCalledWith('member@example.com', 'Sup3rSecret!');
  });

  it('shows the server message in an alert and stays on the page when credentials are wrong', async () => {
    const session = createFakeSession();
    session.api.login.mockRejectedValue(new ApiError(401, 'Invalid email or password'));
    renderLogin(session);
    await screen.findByRole('heading', { name: 'Sign in' });

    await fillAndSubmit('member@example.com', 'wrong-password');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('clears the previous error when the user tries again', async () => {
    const session = createFakeSession();
    session.api.login.mockRejectedValueOnce(new ApiError(401, 'Invalid email or password'));
    session.api.login.mockResolvedValue({ token: 'jwt-1', user: { id: 1, email: member.email } });
    session.api.me.mockResolvedValue(member);
    renderLogin(session);
    await screen.findByRole('heading', { name: 'Sign in' });
    await fillAndSubmit('member@example.com', 'wrong-password');
    await screen.findByRole('alert');

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('disables the button and says so while the request is in flight', async () => {
    const session = createFakeSession();
    let finish: (value: { token: string; user: { id: number; email: string } }) => void = () => undefined;
    session.api.login.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    session.api.me.mockResolvedValue(member);
    renderLogin(session);
    await screen.findByRole('heading', { name: 'Sign in' });

    await userEvent.type(screen.getByLabelText('Email'), 'member@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Sup3rSecret!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
    finish({ token: 'jwt-1', user: { id: 1, email: member.email } });
    await screen.findByRole('heading', { name: 'Vehicles' });
  });

  it('does not call the API when a field is empty', async () => {
    const session = renderLogin();
    await screen.findByRole('heading', { name: 'Sign in' });

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(session.api.login).not.toHaveBeenCalled();
  });

  it('sends an already signed-in user straight to the dashboard', async () => {
    renderLogin(createFakeSession({ token: 'jwt-stored', user: member }));

    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument();
  });
});
