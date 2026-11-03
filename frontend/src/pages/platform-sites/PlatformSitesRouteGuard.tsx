import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Loader2, ArrowLeft, LogOut } from 'lucide-react';
import { platformSitesApi, PlatformEntitlement } from '../../services/platformSitesApi';
import { useAuth } from '../../contexts/AuthContext';
import SEO from '../../components/SEO';

interface PlatformSitesRouteGuardProps {
  children: React.ReactNode;
}

export default function PlatformSitesRouteGuard({ children }: PlatformSitesRouteGuardProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [entitlement, setEntitlement] = useState<PlatformEntitlement | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function checkEntitlement() {
      if (isAuthLoading) return;

      try {
        const res = await platformSitesApi.getEntitlement();
        if (!isCurrent) return;

        if (res.status === 'authorized') {
          setEntitlement(res);
          setLoading(false);
        } else {
          setErrorReason('You do not possess the FERASETU_INTERNAL_ADMIN_PLAN entitlement.');
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCurrent) return;
        setErrorReason(err.message || 'Access denied: Requires FeraSetu Internal Admin Plan.');
        setLoading(false);
      }
    }

    checkEntitlement();

    return () => {
      isCurrent = false;
    };
  }, [user, isAuthLoading, location.pathname]);

  if (isAuthLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800">
        <SEO title="Verifying Platform Sites Entitlement — FeraSetu" noindex />
        <Loader2 className="w-8 h-8 text-[#0052FF] animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">
          Verifying FERASETU_INTERNAL_ADMIN_PLAN entitlement...
        </p>
      </div>
    );
  }

  if (errorReason || !entitlement) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-slate-800">
        <SEO title="Platform Sites Access Restricted — FeraSetu" noindex />
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-6 border border-amber-200">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Internal Administration Module</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Platform Sites is an internal infrastructure management capability restricted to authorized FeraSetu administrators with the <span className="font-semibold text-slate-800">FERASETU_INTERNAL_ADMIN_PLAN</span> entitlement.
          </p>
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 text-xs text-slate-500 font-mono text-left mb-6 break-words">
            {errorReason || 'Forbidden: User lacks platform admin entitlement.'}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0052FF] hover:bg-[#0045d8] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <ArrowLeft size={16} /> Return to Merchant Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
