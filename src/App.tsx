import { lazy, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

const Login = lazy(() => import('./components/Login'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

type UserRole = 'user' | 'admin';
type RequiredRole = UserRole | 'both';

const normalizeRole = (rawRole: string | null | undefined): UserRole => {
  const role = (rawRole || '').trim().toLowerCase();
  if (role === 'admin') return 'admin';
  return 'user';
};

const readStoredAuthState = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  const userData = localStorage.getItem('userData');
  const loggedInFlag = localStorage.getItem('isLoggedIn');
  const role = normalizeRole(localStorage.getItem('userRole'));

  if (!token || !userData || loggedInFlag !== 'true') {
    return { isLoggedIn: false, role };
  }

  try {
    const parsedUser = JSON.parse(userData);
    if (!parsedUser || typeof parsedUser !== 'object') {
      throw new Error('Invalid user data');
    }
    return { isLoggedIn: true, role };
  } catch {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    return { isLoggedIn: false, role: 'user' as UserRole };
  }
};

const FullscreenLoader = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      color: '#334155',
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '0.95rem',
      padding: '1rem',
      textAlign: 'center',
    }}
  >
    Loading...
  </div>
);

function App() {
  const [authState, setAuthState] = useState(() => {
    const storedAuth = readStoredAuthState();

    return {
      isLoggedIn: storedAuth.isLoggedIn,
      role: storedAuth.role,
      isLoading: false,
    };
  });

  const handleLoginSuccess = (role: string = 'user') => {
    const normalizedRole = normalizeRole(role);

    setAuthState({
      isLoggedIn: true,
      role: normalizedRole,
      isLoading: false,
    });

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', normalizedRole);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');

    setAuthState({
      isLoggedIn: false,
      role: 'user',
      isLoading: false,
    });
  };

  const ProtectedRoute = ({
    children,
    requiredRole = 'user',
  }: {
    children: ReactNode;
    requiredRole?: RequiredRole;
  }) => {
    const storedAuth = readStoredAuthState();
    const role = storedAuth.role;
    const isAuthenticated = storedAuth.isLoggedIn;
    const hasAccess = requiredRole === 'both' || role === requiredRole || role === 'admin';

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
  };

  return (
    <Router>
      <div className="App">
        <Suspense fallback={<FullscreenLoader />}>
          <Routes>
            <Route
              path="/login"
              element={
                authState.isLoggedIn ? (
                  <Navigate to="/admin-dashboard" replace />
                ) : (
                  <Login onLoginSuccess={handleLoginSuccess} />
                )
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="both">
                  <Navigate to="/admin-dashboard" replace />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute requiredRole="both">
                  <AdminDashboard onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/"
              element={
                authState.isLoggedIn ? (
                  <Navigate to="/admin-dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
