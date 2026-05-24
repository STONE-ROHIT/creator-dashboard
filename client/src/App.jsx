import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { BrowseContentPage } from './pages/BrowseContentPage';
import { ContentDetailPage } from './pages/ContentDetailPage';
import { MySubscriptionsPage } from './pages/MySubscriptionsPage';
import { CheckoutPage } from './pages/CheckoutPage';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Navbar />

      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
          }
        />

        <Route path="/browse" element={<BrowseContentPage />} />
        <Route path="/content/:id" element={<ContentDetailPage />} />

        {/* NEW: Checkout page for subscription payment */}
        <Route
          path="/checkout/:subscriptionId"
          element={<ProtectedRoute component={<CheckoutPage />} />}
        />

        <Route
          path="/subscriptions"
          element={<ProtectedRoute component={<MySubscriptionsPage />} />}
        />

        <Route
          path="/dashboard"
          element={<ProtectedRoute component={<DashboardPage />} />}
        />

        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}