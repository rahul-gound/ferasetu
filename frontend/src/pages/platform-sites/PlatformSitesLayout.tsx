import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Globe,
  GitBranch,
  Layers,
  Sparkles,
  BarChart3,
  Server,
  ShieldCheck,
  Settings,
  ArrowLeft,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { platformSitesApi, PlatformEntitlement } from '../../services/platformSitesApi';
import PlatformSiteWizardModal from './PlatformSiteWizardModal';
import SEO from '../../components/SEO';

export default function PlatformSitesLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [entitlement, setEntitlement] = useState<PlatformEntitlement | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    platformSitesApi.getEntitlement().then(setEntitlement).catch(() => {});
  }, []);

  const navItems = [
    { path: '/platform-sites/overview', icon: <LayoutDashboard size={18} strokeWidth={1.75} />, label: 'Overview' },
    { path: '/platform-sites/websites', icon: <Globe size={18} strokeWidth={1.75} />, label: 'Websites' },
    { path: '/platform-sites/deployments', icon: <Layers size={18} strokeWidth={1.75} />, label: 'Deployments' },
    { path: '/platform-sites/domains', icon: <GitBranch size={18} strokeWidth={1.75} />, label: 'Domains' },
    { path: '/platform-sites/ai-studio', icon: <Sparkles size={18} strokeWidth={1.75} />, label: 'AI Studio', badge: 'AI' },
    { path: '/platform-sites/usage', icon: <BarChart3 size={18} strokeWidth={1.75} />, label: 'Usage & Analytics' },
    { path: '/platform-sites/integrations', icon: <Server size={18} strokeWidth={1.75} />, label: 'Integrations' },
    { path: '/platform-sites/activity', icon: <ShieldCheck size={18} strokeWidth={1.75} />, label: 'Activity & Audit' },
    { path: '/platform-sites/settings', icon: <Settings size={18} strokeWidth={1.75} />, label: 'Settings' },
  ];

  const roleBadgeColors: Record<string, string> = {
    superadmin: 'bg-purple-50 text-purple-700 border-purple-200',
    platform_admin: 'bg-blue-50 text-blue-700 border-blue-200',
    developer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    viewer: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <SEO title="Platform Sites — FeraSetu Internal Infrastructure" noindex />

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Brand & Entitlement */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
                title="Return to Main Dashboard"
              >
                <ArrowLeft size={14} /> Main Dashboard
              </button>

              <div className="h-4 w-px bg-slate-200" />

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0052FF] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  FS
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm tracking-tight">Platform Sites</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#0052FF] border border-blue-200">
                      INTERNAL ADMIN PLAN
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Infrastructure & AI Website Control Plane
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Role, Quotas & Create Button */}
            <div className="flex items-center gap-3">
              {entitlement && (
                <div className="hidden md:flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleBadgeColors[entitlement.role] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    Role: {entitlement.role}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {entitlement.userEmail}
                  </span>
                </div>
              )}

              <button
                onClick={() => setWizardOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#0052FF] hover:bg-[#0045d8] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Create Website</span>
              </button>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-100 py-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path === '/platform-sites/overview' && location.pathname === '/platform-sites');
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                    ${isActive
                      ? 'bg-blue-50 text-[#0052FF] font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  <span className={isActive ? 'text-[#0052FF]' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FF6B35]/15 text-[#FF6B35]">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet context={{ entitlement, openWizard: () => setWizardOpen(true) }} />
      </main>

      {/* Website Creation Wizard Modal */}
      {wizardOpen && (
        <PlatformSiteWizardModal
          isOpen={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onSuccess={(newSite) => {
            setWizardOpen(false);
            navigate(`/platform-sites/websites/${newSite.id}`);
          }}
        />
      )}
    </div>
  );
}
