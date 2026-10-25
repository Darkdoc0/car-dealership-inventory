import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { messageFrom } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import AuthCard from '../components/AuthCard';
import Field from '../components/Field';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      // On success the guest-only route sees the new session and redirects to the dashboard.
      await login(email, password);
    } catch (err) {
      setError(messageFrom(err));
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Sign in"
      error={error}
      pending={pending}
      submitLabel="Sign in"
      pendingLabel="Signing in…"
      onSubmit={handleSubmit}
      footer={
        <Link to="/register" className="font-medium text-indigo-600 hover:underline">
          Create an account
        </Link>
      }
    >
      <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
    </AuthCard>
  );
}
