import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";

type UserRole = 'user' | 'admin';
type RequiredRole = UserRole | 'both';

const normalizeRole = (rawRole: string | null | undefined): UserRole => {
  const role = (rawRole || '').trim().toLowerCase();
  if (role === 'admin') return 'admin';
  return 'user';
};

function App() {
  const [authState, setAuthState] = React.useState(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    const loggedInFlag = localStorage.getItem('isLoggedIn');
    const role = normalizeRole(localStorage.getItem('userRole'));

    return {
      isLoggedIn: !!(token && userData && loggedInFlag === 'true'),
      role,
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
    children: React.ReactNode;
    requiredRole?: RequiredRole;
  }) => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    const loggedInFlag = localStorage.getItem('isLoggedIn');
    const role = normalizeRole(localStorage.getItem('userRole'));

    const isAuthenticated = !!(token && userData && loggedInFlag === 'true');
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
      </div>
    </Router>
  );
}

export default App;
