import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** The signed-in shell: a header with navigation, the user's email and a sign-out button, then the page. */
export default function AppLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between bg-white px-6 py-3 shadow">
        <nav aria-label="Main" className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold text-indigo-600">
            Car Dealership
          </Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="text-sm font-medium text-slate-700 hover:text-indigo-600">
              Manage vehicles
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-600">{user?.email}</span>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
