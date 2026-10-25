import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function Loading() {
  return (
    <p role="status" className="p-8 text-center text-slate-600">
      Loading…
    </p>
  );
}

/** Routes that need a signed-in user; anonymous visitors are sent to the sign-in page. */
export function RequireAuth() {
  const { status } = useAuth();
  if (status === 'loading') return <Loading />;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Routes for signed-out visitors (sign in, register); signed-in users are sent to the dashboard. */
export function GuestOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <Loading />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
