import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { messageFrom } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import { passwordProblem } from '../auth/passwordRules';
import AuthCard from '../components/AuthCard';
import Field from '../components/Field';

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = passwordProblem(password) ?? (password !== confirm ? 'Passwords do not match' : null);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setPending(true);
    try {
      // On success the guest-only route sees the new session and redirects to the dashboard.
      await register(email, password);
    } catch (err) {
      setError(messageFrom(err));
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Create an account"
      error={error}
      pending={pending}
      submitLabel="Create account"
      pendingLabel="Creating account…"
      onSubmit={handleSubmit}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters, up to 72 bytes."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Field
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
    </AuthCard>
  );
}
