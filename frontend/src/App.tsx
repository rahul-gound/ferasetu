import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthKitProvider } from '@workos-inc/authkit-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { MarketProvider } from './contexts/MarketContext';
import { ENABLED_LANGUAGES } from './i18n';
import ErrorBoundary from './components/ErrorBoundary';
import { RESERVED_SUBDOMAINS } from './utils/canonicalHostname';

// Public landing page — lazy loaded for fast initial entry
const LandingPage = lazy(() => import('./pages/LandingPage'));

// Lazy-loaded auth pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));

// SEO landing pages — public, code-split
const OnlineDukaanBanaye = lazy(() => import('./pages/OnlineDukaanBanaye'));
const FreeOnlineStore = lazy(() => import('./pages/FreeOnlineStore'));
const ShopifyAlternativeIndia = lazy(() => import('./pages/ShopifyAlternativeIndia'));
const KiranaStoreOnline = lazy(() => import('./pages/KiranaStoreOnline'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

// Core app pages — code-split
const GetStartedPage = lazy(() => import('./pages/GetStartedPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AICreditsPage = lazy(() => import('./pages/AICreditsPage'));
const WebsiteBuilderPage = lazy(() => import('./pages/WebsiteBuilderPage'));
const UpgradePage = lazy(() => import('./pages/UpgradePage'));
const SurveyFeedbackPage = lazy(() => import('./pages/SurveyFeedbackPage'));
const EmailSettingsPage = lazy(() => import('./pages/EmailSettingsPage'));
const ReferEarnPage = lazy(() => import('./pages/ReferEarnPage'));
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

// FeraSetu AI — lazy load
const FeraSetuAIPage = lazy(() => import('./pages/FeraSetuAIPage'));

// VerifyEmailPage — lazy load
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));

// 404 Not Found Page — lazy load
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function LanguageRouteGuard() {
  const { lang } = useParams<{ lang: string }>();
  const isValidLang = Boolean(lang && ENABLED_LANGUAGES.some((l) => l.code === lang));
  if (!isValidLang) {
    return <NotFoundPage />;
  }
  return <Outlet />;
}

function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  useEffect(() => {
    if (code) {
      try {
        localStorage.setItem('fera_referral_code', code);
      } catch {}
    }
  }, [code]);
  return <Navigate to={`/register${code ? `?ref=${encodeURIComponent(code)}` : ''}`} replace />;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
});

// Branded full-screen loader shown while a code-split chunk downloads.
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#ffffff' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #2563eb', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #FF6B35', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748B' }}>Loading FeraSetu...</p>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  const isVerifyPage = location.pathname === '/verify-email';
  if (!user.is_verified && !isVerifyPage) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  const hostname = window.location.hostname;

  const platformDomains = ['ferasetu.com', 'fera-search.tech'];
  const isLocalOrPreview = hostname === 'localhost' || hostname.includes('127.0.0.1') || hostname.includes('app.github.dev');
  
  // Check if hostname ends with any of our platform domains but is not the root domain itself
  const matchingDomain = platformDomains.find(domain => 
    hostname.endsWith(`.${domain}`) && hostname !== domain
  );
  const potentialSubdomain = matchingDomain
    ? hostname.slice(0, -(matchingDomain.length + 1)).toLowerCase()
    : null;
  const isReserved = potentialSubdomain ? RESERVED_SUBDOMAINS.has(potentialSubdomain) : false;

  const isShopSubdomain = Boolean(potentialSubdomain && !isReserved && !isLocalOrPreview);

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

        {/* Core Protected App Routes with Persistent Layout Shell */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/ferasetu-ai" element={<FeraSetuAIPage />} />
          <Route path="/fera-ai" element={<Navigate to="/ferasetu-ai" replace />} />
          <Route path="/ai-assistant" element={<Navigate to="/ferasetu-ai" replace />} />
          <Route path="/ai-credits" element={<AICreditsPage />} />
          <Route path="/website-builder" element={<WebsiteBuilderPage />} />
          <Route path="/survey-feedback" element={<SurveyFeedbackPage />} />
          <Route path="/settings/email" element={<EmailSettingsPage />} />
          <Route path="/refer-earn" element={<ReferEarnPage />} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/get-started" element={<GetStartedPage />} />
        </Route>

        {/* Public Root Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
        <Route path="/ref/:code" element={<ReferralRedirect />} />
        <Route path="/callback" element={<AuthCallbackPage />} />
        
        {/* SEO landing pages & public pages */}
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/online-dukaan-banaye" element={<OnlineDukaanBanaye />} />
        <Route path="/free-online-store" element={<FreeOnlineStore />} />
        <Route path="/shopify-alternative-india" element={<ShopifyAlternativeIndia />} />
        <Route path="/kirana-store-online" element={<KiranaStoreOnline />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Localized Public Routes (/hi, /gu/pricing, etc.) */}
        <Route path="/:lang" element={<LanguageRouteGuard />}>
          <Route index element={<LandingPage />} />
          <Route path="login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          <Route path="register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="online-dukaan-banaye" element={<OnlineDukaanBanaye />} />
          <Route path="free-online-store" element={<FreeOnlineStore />} />
          <Route path="shopify-alternative-india" element={<ShopifyAlternativeIndia />} />
          <Route path="kirana-store-online" element={<KiranaStoreOnline />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
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

        {/* Catch-all fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

// Inner app content — all providers except Statsig
function AppContent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthKitProvider 
        clientId={import.meta.env.VITE_WORKOS_CLIENT_ID || 'client_01KZRE47KGSPK84HEP9WNBG9YY'}
        redirectUri={window.location.origin + '/callback'}
      >
        <AuthProvider>
          <BrowserRouter>
            <LanguageProvider>
              <MarketProvider>
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
                <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' } }} />
              </MarketProvider>
            </LanguageProvider>
          </BrowserRouter>
        </AuthProvider>
      </AuthKitProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
