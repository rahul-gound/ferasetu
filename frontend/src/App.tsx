import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { StatsigProvider, useClientAsyncInit } from '@statsig/react-bindings';
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics';
import { StatsigSessionReplayPlugin } from '@statsig/session-replay';

// Public, lightweight pages — kept eager so the first paint never waits on a second chunk.
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// SEO landing pages — public, code-split
const OnlineDukaanBanaye = lazy(() => import('./pages/OnlineDukaanBanaye'));
const FreeOnlineStore = lazy(() => import('./pages/FreeOnlineStore'));
const ShopifyAlternativeIndia = lazy(() => import('./pages/ShopifyAlternativeIndia'));
const KiranaStoreOnline = lazy(() => import('./pages/KiranaStoreOnline'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

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
const EmailSettingsPage = lazy(() => import('./pages/EmailSettingsPage'));
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
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

// Fera AI — eager load to prevent navigation delay
import FeraAIPage from './pages/FeraAIPage';

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

  if (!user) return <Navigate to="/login" replace />;

  const isVerifyPage = window.location.pathname === '/verify-email';
  if (!user.is_verified && !isVerifyPage) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}

// Eager load VerifyEmailPage
import VerifyEmailPage from './pages/VerifyEmailPage';

function AppRoutes() {
  const { user } = useAuth();
  const hostname = window.location.hostname;

  const platformDomains = ['ferasetu.com', 'fera-search.tech'];
  const isLocalOrPreview = hostname === 'localhost' || hostname.includes('127.0.0.1') || hostname.includes('app.github.dev');
  
  // Check if hostname ends with any of our platform domains but is not the root domain itself
  const isShopSubdomain = platformDomains.some(domain => 
    hostname.endsWith(`.${domain}`) && hostname !== domain
  ) && !isLocalOrPreview;

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
        <Route path="/shop/:shopName" element={<ShopPage />} />
        <Route path="/:lang?">
          <Route index element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route path="login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          <Route path="register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
          
          {/* SEO landing pages & public pages */}
          <Route path="pricing" element={<PricingPage />} />
          <Route path="online-dukaan-banaye" element={<OnlineDukaanBanaye />} />
          <Route path="free-online-store" element={<FreeOnlineStore />} />
          <Route path="shopify-alternative-india" element={<ShopifyAlternativeIndia />} />
          <Route path="kirana-store-online" element={<KiranaStoreOnline />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
        </Route>

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

        {/* Verify Email Gate (Full Screen) */}
        <Route path="/verify-email" element={
          <ProtectedRoute>
            <VerifyEmailPage />
          </ProtectedRoute>
        } />

        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/get-started" element={<GetStartedPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/ai-assistant" element={<AIAssistantPage />} />
                {/* New Fera AI — premium AI assistant page */}
                <Route path="/fera-ai" element={<FeraAIPage />} />
                <Route path="/ai-credits" element={<AICreditsPage />} />
                <Route path="/website-builder" element={<WebsiteBuilderPage />} />
                <Route path="/survey-feedback" element={<SurveyFeedbackPage />} />
                <Route path="/settings/email" element={<EmailSettingsPage />} />
                <Route path="/upgrade" element={<UpgradePage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}

// Inner app content — all providers except Statsig
function AppContent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <LanguageProvider>
            <AppRoutes />
            <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' } }} />
          </LanguageProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Root app — Statsig wraps everything to enable feature flags and session replay
export default function App() {
  const { client: statsigClient } = useClientAsyncInit(
    'client-XOZr1YiFOBSi6y6elVRLgwEQSY44LvCVpRwTzdfbd98',
    { userID: 'a-user' },
    { plugins: [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()] }
  );

  return (
    <StatsigProvider client={statsigClient}>
      <AppContent />
    </StatsigProvider>
  );
}
