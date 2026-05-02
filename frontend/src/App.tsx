import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GetStartedPage from './pages/GetStartedPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import SupportPage from './pages/SupportPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import WebsiteBuilderPage from './pages/WebsiteBuilderPage';
import UpgradePage from './pages/UpgradePage';
import ShopPage from './pages/ShopPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminShopsPage from './pages/AdminShopsPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminTicketsPage from './pages/AdminTicketsPage';
import AdminSystemPage from './pages/AdminSystemPage';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import Layout from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #FF6B35', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748B' }}>Loading Fera Shopkeeper...</p>
      </div>
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  const hostname = window.location.hostname;
  
  // Detect if we are on a shop subdomain (not localhost, not the main platform)
  const isShopSubdomain = hostname.endsWith('.fera-shop.fera-search.tech') || 
                          (hostname !== 'localhost' && 
                           hostname !== 'fera-shop.fera-search.tech' && 
                           hostname !== 'fera-search.tech' &&
                           !hostname.includes('app.github.dev'));

  if (isShopSubdomain) {
    return (
      <Routes>
        <Route path="*" element={<ShopPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
      <Route path="/shop/:shopName" element={<ShopPage />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/*" element={
        <AdminProtectedRoute>
          <Routes>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="shops" element={<AdminShopsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="tickets" element={<AdminTicketsPage />} />
            <Route path="system" element={<AdminSystemPage />} />
            {/* Fallback for admin */}
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </AdminProtectedRoute>
      } />

      <Route path="/*" element={
        <ProtectedRoute>
          <LanguageProvider>
            <Layout>
              <Routes>
                <Route path="/get-started" element={<GetStartedPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/ai-assistant" element={<AIAssistantPage />} />
                <Route path="/website-builder" element={<WebsiteBuilderPage />} />
                <Route path="/upgrade" element={<UpgradePage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </LanguageProvider>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' } }} />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
