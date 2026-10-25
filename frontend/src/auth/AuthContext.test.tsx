import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../api/errors';
import { admin, createFakeSession, member } from '../test/fakes';
import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="user">{auth.user ? `${auth.user.email}:${auth.user.role}` : 'none'}</p>
      <button onClick={() => auth.login('member@example.com', 'Sup3rSecret!').catch(() => undefined)}>login</button>
      <button onClick={() => auth.register('member@example.com', 'Sup3rSecret!').catch(() => undefined)}>register</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

const renderProbe = (session: ReturnType<typeof createFakeSession>) =>
  render(
    <AuthProvider session={session}>
      <Probe />
    </AuthProvider>,
  );

const status = () => screen.getByTestId('status').textContent;
const currentUser = () => screen.getByTestId('user').textContent;

describe('AuthProvider', () => {
  it('is anonymous without calling the API when there is no stored token', async () => {
    const session = createFakeSession();

    renderProbe(session);

    await waitFor(() => expect(status()).toBe('anonymous'));
    expect(session.api.me).not.toHaveBeenCalled();
  });

  it('restores the user from a stored token, passing through loading', async () => {
    const session = createFakeSession({ token: 'jwt-stored', user: admin });

    renderProbe(session);

    expect(status()).toBe('loading');
    await waitFor(() => expect(status()).toBe('authenticated'));
    expect(currentUser()).toBe('admin@example.com:admin');
  });

  it('drops a stored token the server no longer accepts', async () => {
    const session = createFakeSession({ token: 'jwt-bad' });
    session.api.me.mockRejectedValue(new ApiError(401, 'Authentication required'));

    renderProbe(session);

    await waitFor(() => expect(status()).toBe('anonymous'));
    expect(session.store.get()).toBeNull();
  });

  it('logs in: stores the token and loads the current user', async () => {
    const session = createFakeSession();
    session.api.login.mockResolvedValue({ token: 'jwt-new', user: { id: member.id, email: member.email } });
    session.api.me.mockResolvedValue(member);
    renderProbe(session);
    await waitFor(() => expect(status()).toBe('anonymous'));

    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(status()).toBe('authenticated'));
    expect(session.api.login).toHaveBeenCalledWith('member@example.com', 'Sup3rSecret!');
    expect(session.store.get()).toBe('jwt-new');
    expect(currentUser()).toBe('member@example.com:user');
  });

  it('stays anonymous and stores nothing when login fails', async () => {
    const session = createFakeSession();
    session.api.login.mockRejectedValue(new ApiError(401, 'Invalid email or password'));
    renderProbe(session);
    await waitFor(() => expect(status()).toBe('anonymous'));

    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(session.api.login).toHaveBeenCalled());
    expect(status()).toBe('anonymous');
    expect(session.store.get()).toBeNull();
  });

  it('registers and then signs in with the same credentials', async () => {
    const session = createFakeSession();
    session.api.register.mockResolvedValue({ id: member.id, email: member.email });
    session.api.login.mockResolvedValue({ token: 'jwt-reg', user: { id: member.id, email: member.email } });
    session.api.me.mockResolvedValue(member);
    renderProbe(session);
    await waitFor(() => expect(status()).toBe('anonymous'));

    await userEvent.click(screen.getByText('register'));

    await waitFor(() => expect(status()).toBe('authenticated'));
    expect(session.api.register).toHaveBeenCalledWith('member@example.com', 'Sup3rSecret!');
    expect(session.api.login).toHaveBeenCalledWith('member@example.com', 'Sup3rSecret!');
  });

  it('does not sign in when registration fails', async () => {
    const session = createFakeSession();
    session.api.register.mockRejectedValue(new ApiError(409, 'Email already registered'));
    renderProbe(session);
    await waitFor(() => expect(status()).toBe('anonymous'));

    await userEvent.click(screen.getByText('register'));

    await waitFor(() => expect(session.api.register).toHaveBeenCalled());
    expect(session.api.login).not.toHaveBeenCalled();
    expect(status()).toBe('anonymous');
  });

  it('logs out: clears the token and the user', async () => {
    const session = createFakeSession({ token: 'jwt-stored', user: member });
    renderProbe(session);
    await waitFor(() => expect(status()).toBe('authenticated'));

    await userEvent.click(screen.getByText('logout'));

    expect(status()).toBe('anonymous');
    expect(currentUser()).toBe('none');
    expect(session.store.get()).toBeNull();
  });

  it('logs out when the session expires', async () => {
    const session = createFakeSession({ token: 'jwt-stored', user: member });
    renderProbe(session);
    await waitFor(() => expect(status()).toBe('authenticated'));

    session.expire();

    await waitFor(() => expect(status()).toBe('anonymous'));
    expect(session.store.get()).toBeNull();
  });
});

describe('useAuth', () => {
  it('explains the problem when used outside an AuthProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow('useAuth must be used inside an AuthProvider');
  });
});
