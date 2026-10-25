import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { ApiError } from '../api/errors';
import { createFakeSession, member } from '../test/fakes';

function renderRegister(session = createFakeSession()) {
  render(
    <MemoryRouter initialEntries={['/register']}>
      <App session={session} />
    </MemoryRouter>,
  );
  return session;
}

const fill = async (email: string, password: string, confirm: string) => {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.type(screen.getByLabelText('Confirm password'), confirm);
};

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Create account' }));

describe('RegisterPage', () => {
  it('shows labelled fields, a submit button and a link back to sign in', async () => {
    renderRegister();

    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('registers, signs in and lands on the dashboard', async () => {
    const session = createFakeSession();
    session.api.register.mockResolvedValue({ id: member.id, email: member.email });
    session.api.login.mockResolvedValue({ token: 'jwt-1', user: { id: member.id, email: member.email } });
    session.api.me.mockResolvedValue(member);
    renderRegister(session);
    await screen.findByRole('heading', { name: 'Create an account' });

    await fill('member@example.com', 'Sup3rSecret!', 'Sup3rSecret!');
    await submit();

    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument();
    expect(session.api.register).toHaveBeenCalledWith('member@example.com', 'Sup3rSecret!');
  });

  it('refuses mismatched passwords without calling the API', async () => {
    const session = renderRegister();
    await screen.findByRole('heading', { name: 'Create an account' });

    await fill('member@example.com', 'Sup3rSecret!', 'Different123!');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match');
    expect(session.api.register).not.toHaveBeenCalled();
  });

  it('refuses a password shorter than 8 characters without calling the API', async () => {
    const session = renderRegister();
    await screen.findByRole('heading', { name: 'Create an account' });

    await fill('member@example.com', 'short', 'short');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Password must be at least 8 characters');
    expect(session.api.register).not.toHaveBeenCalled();
  });

  it('refuses a password longer than 72 bytes without calling the API', async () => {
    const session = renderRegister();
    await screen.findByRole('heading', { name: 'Create an account' });
    const tooLong = 'a'.repeat(73);

    await fill('member@example.com', tooLong, tooLong);
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Password must be at most 72 bytes');
    expect(session.api.register).not.toHaveBeenCalled();
  });

  it('tells the user the password rules up front', async () => {
    renderRegister();

    expect(await screen.findByText('At least 8 characters, up to 72 bytes.')).toBeInTheDocument();
  });

  it('shows the server message when the email is already registered', async () => {
    const session = createFakeSession();
    session.api.register.mockRejectedValue(new ApiError(409, 'Email already registered'));
    renderRegister(session);
    await screen.findByRole('heading', { name: 'Create an account' });

    await fill('member@example.com', 'Sup3rSecret!', 'Sup3rSecret!');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered');
    expect(session.api.login).not.toHaveBeenCalled();
  });
});
