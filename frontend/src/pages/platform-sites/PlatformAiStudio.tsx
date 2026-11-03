import React, { useState, useEffect } from 'react';
import { Sparkles, Globe, ArrowRight, Loader2 } from 'lucide-react';
import { platformSitesApi, PlatformSite } from '../../services/platformSitesApi';
import PlatformAiStudioView from './PlatformAiStudioView';

export default function PlatformAiStudio() {
  const [sites, setSites] = useState<PlatformSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformSitesApi.listSites().then((res) => {
      const list = res.sites || [];
      setSites(list);
      if (list.length > 0) setSelectedSiteId(list[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#0052FF]" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
        <Sparkles size={28} className="text-[#FF6B35] mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">No platform sites available</h3>
        <p className="text-xs text-slate-500">Create a platform website first to use AI Studio customization.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Site Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">AI Studio Customization</h2>
          <p className="text-xs text-slate-500">Select an active platform property to customize with FeraSetu AI.</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Target Website:</label>
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0052FF]"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.primary_hostname})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSite && (
        <PlatformAiStudioView site={selectedSite} />
      )}
    </div>
  );
}
