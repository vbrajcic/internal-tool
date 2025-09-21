import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import SimpleLayout from './components/Layout/SimpleLayout';
import SimpleDashboard from './pages/SimpleDashboard';
import SimpleLoginPage from './components/Login/SimpleLoginPage';
import EquipmentPage from './pages/EquipmentPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import AdminPage from './pages/AdminPage';
import RequestsPage from './pages/RequestsPage';

const AppContent: React.FC = () => {
  const { isLoading, isAuthenticated } = useAuth();

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
    return <SimpleLoginPage />;
  }

  return (
    <Router>
      <SimpleLayout>
        <Routes>
          <Route path="/" element={<SimpleDashboard />} />
          <Route path="/dashboard" element={<SimpleDashboard />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </SimpleLayout>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;