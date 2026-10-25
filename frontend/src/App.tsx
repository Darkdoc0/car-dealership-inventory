import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import type { Session } from './auth/session';
import AppLayout from './components/AppLayout';
import { GuestOnly, RequireAuth } from './components/routeGuards';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';

/** The application routes. The router itself (browser or in-memory) is supplied by the caller. */
export default function App({ session }: { session: Session }) {
  return (
    <AuthProvider session={session}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
