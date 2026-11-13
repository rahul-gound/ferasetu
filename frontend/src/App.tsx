import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthKitProvider } from '@workos-inc/authkit-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { MarketProvider } from './contexts/MarketContext';
import { AiAssistantProvider } from './contexts/AiAssistantContext';
import { ENABLED_LANGUAGES } from './i18n';
import ErrorBoundary from './components/ErrorBoundary';
import { RESERVED_SUBDOMAINS } from './utils/canonicalHostname';
import { ConsentProvider } from './contexts/ConsentContext';
import ConsentBanner from './components/consent/ConsentBanner';
import { trackPageView, initLifecycleTracking } from './lib/analytics/tracker';
import SmoothScroll from './components/SmoothScroll';

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
const DocsPage = lazy(() => import('./pages/DocsPage'));
const CompareIndexPage = lazy(() => import('./pages/compare/CompareIndexPage'));
const CompetitorComparisonPage = lazy(() => import('./pages/compare/CompetitorComparisonPage'));

// Core app pages — code-split
const GetStartedPage = lazy(() => import('./pages/GetStartedPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AICreditsPage = lazy(() => import('./pages/AICreditsPage'));
const GiftCardsPage = lazy(() => import('./pages/GiftCardsPage'));
const CreateGiftCardPage = lazy(() => import('./pages/CreateGiftCardPage'));
const TransfersPage = lazy(() => import('./pages/TransfersPage'));
const CreateTransferPage = lazy(() => import('./pages/CreateTransferPage'));
const DiscountsPage = lazy(() => import('./pages/DiscountsPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));
const WebsiteBuilderPage = lazy(() => import('./pages/WebsiteBuilderPage'));
const WebsiteSettingsPage = lazy(() => import('./pages/WebsiteSettingsPage'));
const WebsiteDesignPage = lazy(() => import('./pages/WebsiteDesignPage'));
const DomainsPage = lazy(() => import('./pages/DomainsPage'));
const MarketingSeoPage = lazy(() => import('./pages/MarketingSeoPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const InventoryLocationsPage = lazy(() => import('./pages/InventoryLocationsPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
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
const AdminErrorLogsPage = lazy(() => import('./pages/AdminErrorLogsPage'));
const AdminFeedbackPage = lazy(() => import('./pages/AdminFeedbackPage'));
const AdminSystemPage = lazy(() => import('./pages/AdminSystemPage'));
const AdminQAPage = lazy(() => import('./pages/AdminQAPage'));
const AdminQARunDetailPage = lazy(() => import('./pages/AdminQARunDetailPage'));
const AdminQAIssueDetailPage = lazy(() => import('./pages/AdminQAIssueDetailPage'));
const AdminQASandboxPage = lazy(() => import('./pages/AdminQASandboxPage'));
const AdminAICreditsPage = lazy(() => import('./pages/AdminAICreditsPage'));
const AdminProtectedRoute = lazy(() => import('./components/admin/AdminProtectedRoute'));
const Layout = lazy(() => import('./components/Layout'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

// FeraSetu AI — lazy load
const FeraSetuAIPage = lazy(() => import('./pages/FeraSetuAIPage'));

// WhatsApp Assistant — lazy load
const WhatsAppAssistantPage = lazy(() => import('./pages/WhatsAppAssistantPage'));

// VerifyEmailPage — lazy load
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));

// Onboarding Wizard Page — multi-tenant merchant organization setup
const OnboardingWizardPage = lazy(() => import('./pages/OnboardingWizardPage'));

// 404 Not Found Page — lazy load
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Platform Sites — Internal Infrastructure & AI Website Management
const PlatformSitesRouteGuard = lazy(() => import('./pages/platform-sites/PlatformSitesRouteGuard'));
const PlatformSitesLayout = lazy(() => import('./pages/platform-sites/PlatformSitesLayout'));
const PlatformSitesOverview = lazy(() => import('./pages/platform-sites/PlatformSitesOverview'));
const PlatformSitesList = lazy(() => import('./pages/platform-sites/PlatformSitesList'));
const PlatformSiteDetailPage = lazy(() => import('./pages/platform-sites/PlatformSiteDetailPage'));
const PlatformDeploymentsList = lazy(() => import('./pages/platform-sites/PlatformDeploymentsList'));
const PlatformDomainsRegistry = lazy(() => import('./pages/platform-sites/PlatformDomainsRegistry'));
const PlatformAiStudio = lazy(() => import('./pages/platform-sites/PlatformAiStudio'));
const PlatformUsageAnalytics = lazy(() => import('./pages/platform-sites/PlatformUsageAnalytics'));
const PlatformIntegrations = lazy(() => import('./pages/platform-sites/PlatformIntegrations'));
const PlatformAuditLogView = lazy(() => import('./pages/platform-sites/PlatformAuditLogView'));
const PlatformSitesSettings = lazy(() => import('./pages/platform-sites/PlatformSitesSettings'));

function LanguageRouteGuard() {
  const { lang } = useParams<{ lang: string }>();
  if (lang === 'en') {
    return <Navigate to="/" replace />;
  }
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
  const { user, hasOrganization, isLoading } = useAuth();
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

  const isOnboardingPage = location.pathname === '/onboarding';
  if (!hasOrganization && !isOnboardingPage && !isVerifyPage) {
    return <Navigate to="/onboarding" replace />;
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
        <Route element={<ProtectedRoute><ErrorBoundary><Layout /></ErrorBoundary></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/gift-cards" element={<GiftCardsPage />} />
          <Route path="/gift-cards/new" element={<CreateGiftCardPage />} />
          <Route path="/products/gift-cards/new" element={<CreateGiftCardPage />} />
          <Route path="/products/gift-card" element={<Navigate to="/gift-cards/new" replace />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/transfers/new" element={<CreateTransferPage />} />
          <Route path="/products/transfers/new" element={<CreateTransferPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/dashboard/discounts" element={<DiscountsPage />} />
          <Route path="/discounts" element={<Navigate to="/dashboard/discounts" replace />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/ferasetu-ai" element={<FeraSetuAIPage />} />
          <Route path="/fera-ai" element={<Navigate to="/ferasetu-ai" replace />} />
          <Route path="/ai-assistant" element={<Navigate to="/ferasetu-ai" replace />} />
          <Route path="/ai-credits" element={<AICreditsPage />} />
          <Route path="/website-builder" element={<WebsiteBuilderPage />} />
          <Route path="/website-settings" element={<WebsiteSettingsPage />} />
          <Route path="/website-builder/settings" element={<WebsiteSettingsPage />} />
          <Route path="/website-design" element={<WebsiteDesignPage />} />
          <Route path="/website-and-design" element={<WebsiteDesignPage />} />
          <Route path="/domains" element={<DomainsPage />} />
          <Route path="/marketing-and-seo" element={<MarketingSeoPage />} />
          <Route path="/marketing-seo" element={<Navigate to="/marketing-and-seo" replace />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/help-and-community" element={<Navigate to="/community" replace />} />
          <Route path="/merchant-community" element={<Navigate to="/community" replace />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/integrations-hub" element={<Navigate to="/integrations" replace />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/operations/payments" element={<Navigate to="/payments" replace />} />
          <Route path="/inventory-and-locations" element={<InventoryLocationsPage />} />
          <Route path="/inventory-locations" element={<Navigate to="/inventory-and-locations" replace />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/operations/staff" element={<Navigate to="/staff" replace />} />
          <Route path="/pro-studio" element={<Navigate to="/website-builder" replace />} />
          <Route path="/pro" element={<Navigate to="/website-builder" replace />} />
          <Route path="/whatsapp-assistant" element={<WhatsAppAssistantPage />} />
          <Route path="/dashboard/whatsapp-assistant" element={<Navigate to="/whatsapp-assistant" replace />} />
          <Route path="/survey-feedback" element={<SurveyFeedbackPage />} />
          <Route path="/settings/email" element={<EmailSettingsPage />} />
          <Route path="/refer-earn" element={<ReferEarnPage />} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/get-started" element={<GetStartedPage />} />
        </Route>

        {/* Dedicated Onboarding Wizard Route (Stand-alone clean view) */}
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizardPage /></ProtectedRoute>} />

        {/* Public Root Routes */}
        <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
        <Route path="/sign-up" element={<Navigate to="/signup" replace />} />
        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/sign-in" element={<Navigate to="/login" replace />} />
        <Route path="/ref/:code" element={<ReferralRedirect />} />
        <Route path="/callback" element={<AuthCallbackPage />} />

        {/* Documentation Portal */}
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/:section" element={<DocsPage />} />
        
        {/* SEO landing pages & public pages */}
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/online-dukaan-banaye" element={<OnlineDukaanBanaye />} />
        <Route path="/free-online-store" element={<FreeOnlineStore />} />
        <Route path="/shopify-alternative-india" element={<ShopifyAlternativeIndia />} />
        <Route path="/kirana-store-online" element={<KiranaStoreOnline />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/compare" element={<CompareIndexPage />} />
        <Route path="/compare/:slug" element={<CompetitorComparisonPage />} />

        {/* Legacy Regional & Default English Redirects to Canonical Clean URLs */}
        <Route path="/en" element={<Navigate to="/" replace />} />
        <Route path="/en/*" element={<Navigate to="/" replace />} />
        <Route path="/eu/uk" element={<Navigate to="/" replace />} />
        <Route path="/eu/uk/*" element={<Navigate to="/" replace />} />
        <Route path="/uk" element={<Navigate to="/" replace />} />
        <Route path="/uk/pricing" element={<Navigate to="/pricing" replace />} />
        <Route path="/uk/shopify-alternative" element={<Navigate to="/shopify-alternative-india" replace />} />
        <Route path="/uk/*" element={<Navigate to="/" replace />} />
        <Route path="/us" element={<Navigate to="/" replace />} />
        <Route path="/us/pricing" element={<Navigate to="/pricing" replace />} />
        <Route path="/us/*" element={<Navigate to="/" replace />} />
        <Route path="/in" element={<Navigate to="/" replace />} />
        <Route path="/in/pricing" element={<Navigate to="/pricing" replace />} />
        <Route path="/in/shopify-alternative" element={<Navigate to="/shopify-alternative-india" replace />} />
        <Route path="/in/online-dukaan" element={<Navigate to="/online-dukaan-banaye" replace />} />
        <Route path="/in/online-dukaan-banaye" element={<Navigate to="/online-dukaan-banaye" replace />} />
        <Route path="/in/free-online-store" element={<Navigate to="/free-online-store" replace />} />
        <Route path="/in/kirana-store-online" element={<Navigate to="/kirana-store-online" replace />} />
        <Route path="/in/whatsapp-store" element={<Navigate to="/" replace />} />
        <Route path="/in/*" element={<Navigate to="/" replace />} />
        <Route path="/eu" element={<Navigate to="/" replace />} />
        <Route path="/eu/pricing" element={<Navigate to="/pricing" replace />} />
        <Route path="/eu/*" element={<Navigate to="/" replace />} />
        <Route path="/europe" element={<Navigate to="/" replace />} />
        <Route path="/europe/pricing" element={<Navigate to="/pricing" replace />} />
        <Route path="/europe/shopify-alternative" element={<Navigate to="/shopify-alternative-india" replace />} />
        <Route path="/europe/*" element={<Navigate to="/" replace />} />

        {/* Localized Public Routes (/hi, /gu/pricing, etc.) */}
        <Route path="/:lang" element={<LanguageRouteGuard />}>
          <Route index element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
          <Route path="login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          <Route path="register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
          <Route path="signup" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="docs" element={<DocsPage />} />
          <Route path="docs/:section" element={<DocsPage />} />
          <Route path="online-dukaan-banaye" element={<OnlineDukaanBanaye />} />
          <Route path="free-online-store" element={<FreeOnlineStore />} />
          <Route path="shopify-alternative-india" element={<ShopifyAlternativeIndia />} />
          <Route path="kirana-store-online" element={<KiranaStoreOnline />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="compare" element={<CompareIndexPage />} />
          <Route path="compare/:slug" element={<CompetitorComparisonPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ErrorBoundary><AdminLogin /></ErrorBoundary>} />
        <Route path="/admin/*" element={
          <ErrorBoundary>
          <AdminProtectedRoute>
            <Routes>
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="ai-credits" element={<AdminAICreditsPage />} />
              <Route path="ai-usage" element={<AdminAICreditsPage />} />
              <Route path="shops" element={<AdminShopsPage />} />
              <Route path="meetings" element={<AdminMeetingsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="tickets" element={<AdminTicketsPage />} />
              <Route path="feedback" element={<AdminFeedbackPage />} />
              <Route path="errors" element={<AdminErrorLogsPage />} />
              <Route path="system" element={<AdminSystemPage />} />
              <Route path="qa" element={<AdminQAPage />} />
              <Route path="qa/runs/:runId" element={<AdminQARunDetailPage />} />
              <Route path="qa/issues/:issueId" element={<AdminQAIssueDetailPage />} />
              <Route path="qa/sandbox" element={<AdminQASandboxPage />} />
              <Route path="platform-sites" element={<Navigate to="/platform-sites" replace />} />
              <Route path="platform-sites/*" element={<Navigate to="/platform-sites" replace />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </AdminProtectedRoute>
          </ErrorBoundary>
        } />

        {/* Platform Sites — Internal Infrastructure & AI Website Management */}
        <Route path="/platform-sites" element={<PlatformSitesRouteGuard><PlatformSitesLayout /></PlatformSitesRouteGuard>}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<PlatformSitesOverview />} />
          <Route path="websites" element={<PlatformSitesList />} />
          <Route path="websites/:siteId/*" element={<PlatformSiteDetailPage />} />
          <Route path="deployments" element={<PlatformDeploymentsList />} />
          <Route path="domains" element={<PlatformDomainsRegistry />} />
          <Route path="ai-studio" element={<PlatformAiStudio />} />
          <Route path="usage" element={<PlatformUsageAnalytics />} />
          <Route path="integrations" element={<PlatformIntegrations />} />
          <Route path="activity" element={<PlatformAuditLogView />} />
          <Route path="settings" element={<PlatformSitesSettings />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Route>

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

function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);
  return null;
}

// Inner app content
function AppContent() {
  useEffect(() => {
    initLifecycleTracking();
  }, []);

  const handleRefreshFailure = ({ signIn }: { signIn: () => Promise<void> }) => {
    // WorkOS signalled a permanent refresh failure — the refresh token is dead
    // (e.g. expired, rotated, or the WorkOS session cookie was cleared).
    // Do NOT automatically call signIn() here — that would be the auto-redirect loop.
    // Instead, clear the FeraSetu profile cache and let ProtectedRoute redirect to /login.
    try { localStorage.removeItem('fera_user'); } catch {}
    if (import.meta.env.DEV) {
      console.warn('[AUTH] AUTH_REFRESH_FAILURE — WorkOS session expired. Clearing profile. User will be sent to /login.');
    }
    // signIn is available if the app wants to offer a "sign in again" CTA.
    // We expose it on the login page button only — never call it automatically.
    void signIn; // suppress unused-variable warning
  };

  return (
    <ConsentProvider>
      <QueryClientProvider client={queryClient}>
        <AuthKitProvider 
          clientId={import.meta.env.VITE_WORKOS_CLIENT_ID || 'client_01KZRE47KGSPK84HEP9WNBG9YY'}
          redirectUri={window.location.origin + '/callback'}
          devMode={true}
          refreshBufferInterval={60}
          onBeforeAutoRefresh={() => true}
          onRefreshFailure={handleRefreshFailure}
        >
          <AuthProvider>
            <BrowserRouter>
              <LanguageProvider>
                <MarketProvider>
                    <AiAssistantProvider>
                  <SmoothScroll>
                    <RouteTracker />
                  <ErrorBoundary>
                    <AppRoutes />
                  </ErrorBoundary>
                  <ConsentBanner />
                  <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' } }} />
                  </SmoothScroll>
                </AiAssistantProvider>
                </MarketProvider>
              </LanguageProvider>
            </BrowserRouter>
          </AuthProvider>
        </AuthKitProvider>
      </QueryClientProvider>
    </ConsentProvider>
  );
}


export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
