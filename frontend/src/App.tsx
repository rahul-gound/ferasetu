import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Public, lightweight pages — kept eager so the first paint never waits on a second chunk.
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Everything below is code-split: the landing page no longer ships the dashboard,
// charts (recharts), AI, website builder, or admin panel in its initial bundle.
const GetStartedPage = lazy(() => import('./pages/GetStartedPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
const AICreditsPage = lazy(() => import('./pages/AICreditsPage'));
const WebsiteBuilderPage = lazy(() => import('./pages/WebsiteBuilderPage'));
const UpgradePage = lazy(() => import('./pages/UpgradePage'));
const SurveyFeedbackPage = lazy(() => import('./pages/SurveyFeedbackPage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminShopsPage = lazy(() => import('./pages/AdminShopsPage'));
const AdminMeetingsPage = lazy(() => import('./pages/AdminMeetingsPage'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage'));
const AdminTicketsPage = lazy(() => import('./pages/AdminTicketsPage'));
const AdminSystemPage = lazy(() => import('./pages/AdminSystemPage'));
const AdminProtectedRoute = lazy(() => import('./components/admin/AdminProtectedRoute'));
const Layout = lazy(() => import('./components/Layout'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
});

// Branded full-screen loader shown while a code-split chunk downloads.
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#060818' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #FF6B35', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #FF6B35', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748B' }}>Loading FeraSetu...</p>
      </div>
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  const hostname = window.location.hostname;

  const platformDomain = 'fera-search.tech';
  const isLocalOrPreview = hostname === 'localhost' || hostname.includes('127.0.0.1') || hostname.includes('app.github.dev');
  const isShopSubdomain = hostname.endsWith(`.${platformDomain}`) && hostname !== platformDomain && !isLocalOrPreview;

  if (isShopSubdomain) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="*" element={<ShopPage />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
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
              <Route path="meetings" element={<AdminMeetingsPage />} />
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
                  <Route path="/ai-credits" element={<AICreditsPage />} />
                  <Route path="/website-builder" element={<WebsiteBuilderPage />} />
                  <Route path="/survey-feedback" element={<SurveyFeedbackPage />} />
                  <Route path="/upgrade" element={<UpgradePage />} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </LanguageProvider>
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
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
