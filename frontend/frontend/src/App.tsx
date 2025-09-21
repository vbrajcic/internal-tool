import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import AuthProviderWrapper from './providers/AuthProvider';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import EquipmentListPage from './pages/Equipment/EquipmentListPage';
import EquipmentDetailPage from './pages/Equipment/EquipmentDetailPage';
import SubscriptionListPage from './pages/Subscriptions/SubscriptionListPage';
import RequestFormPage from './pages/Requests/RequestFormPage';
import UserManagementPage from './pages/Admin/UserManagementPage';
import QRScanPage from './components/Mobile/QRScanPage';
import LoginPage from './components/Login/LoginPage';

const AppContent: React.FC = () => {
  const { isLoading, isAuthenticated } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Equipment Routes */}
          <Route path="/equipment" element={<EquipmentListPage />} />
          <Route path="/equipment/:id" element={<EquipmentDetailPage />} />

          {/* Subscription Routes */}
          <Route path="/subscriptions" element={<SubscriptionListPage />} />

          {/* Request Routes */}
          <Route path="/requests/new" element={<RequestFormPage />} />

          {/* Admin Routes */}
          <Route path="/admin/users" element={<UserManagementPage />} />

          {/* Mobile QR Scanning */}
          <Route path="/qr-scan" element={<QRScanPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

function App() {
  return (
    <AuthProviderWrapper>
      <AppContent />
    </AuthProviderWrapper>
  );
}

export default App;