import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import BrowseContentPage from './pages/BrowseContentPage.jsx';
import ContentDetailPage from './pages/ContentDetailPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import MySubscriptionsPage from './pages/MySubscriptionsPage.jsx';

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-bg-primary text-ink-primary font-sans">
      <Navbar />
      <main>
        <Routes>
          {/* Public routes */}
          <Route path="/browse" element={<BrowseContentPage />} />
          <Route path="/content/:id" element={<ContentDetailPage />} />

          {/* Auth routes — redirect if already logged in */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
          />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/subscriptions" element={<MySubscriptionsPage />} />
            <Route path="/checkout/:subscriptionId" element={<CheckoutPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/browse" replace />} />
          <Route path="*" element={<Navigate to="/browse" replace />} />
        </Routes>
      </main>
    </div>
  );
}
