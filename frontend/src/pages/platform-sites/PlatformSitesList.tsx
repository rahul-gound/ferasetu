import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Globe, Server, Search, Plus, ExternalLink, ArrowRight,
  ShieldCheck, Layers, Cpu, AlertCircle, RefreshCw
} from 'lucide-react';
import { platformSitesApi, PlatformSite } from '../../services/platformSitesApi';

export default function PlatformSitesList() {
  const navigate = useNavigate();
  const { openWizard } = useOutletContext<{ openWizard: () => void }>();

  const [sites, setSites] = useState<PlatformSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTarget, setFilterTarget] = useState<'all' | 'workers' | 'pages'>('all');

  const fetchSites = async () => {
    try {
      const res = await platformSitesApi.listSites();
      setSites(res.sites || []);
    } catch (err) {
      console.error('Failed to load sites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.primary_hostname.toLowerCase().includes(search.toLowerCase()) ||
      site.project_identifier.toLowerCase().includes(search.toLowerCase());
    const matchesTarget = filterTarget === 'all' || site.hosting_target === filterTarget;
    return matchesSearch && matchesTarget;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Platform Websites
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal websites, developer portals, and documentation properties owned by FeraSetu.
          </p>
        </div>

        <button
          onClick={openWizard}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0052FF] hover:bg-[#0045d8] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Create Website</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, hostname, slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0052FF]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto self-end">
          <button
            onClick={() => setFilterTarget('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterTarget === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({sites.length})
          </button>
          <button
            onClick={() => setFilterTarget('workers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterTarget === 'workers'
                ? 'bg-[#0052FF] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Workers
          </button>
          <button
            onClick={() => setFilterTarget('pages')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterTarget === 'pages'
                ? 'bg-[#0052FF] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pages
          </button>
        </div>
      </div>

      {/* Sites Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-white border border-slate-200/80 rounded-2xl p-5" />
          ))}
        </div>
      ) : filteredSites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSites.map((site) => (
            <div
              key={site.id}
              onClick={() => navigate(`/platform-sites/websites/${site.id}`)}
              className="bg-white border border-slate-200/80 hover:border-[#0052FF]/60 hover:shadow-sm rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center font-bold text-xs">
                      {site.hosting_target === 'workers' ? <Cpu size={18} /> : <Layers size={18} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0052FF] transition-colors">
                        {site.name}
                      </h3>
                      <div className="text-[11px] font-mono text-slate-400">
                        {site.project_identifier}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    site.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : site.status === 'failed'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {site.status}
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                  {site.description || 'FeraSetu internal platform web property.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-mono text-slate-600">
                  <Globe size={13} className="text-[#0052FF]" />
                  <span>{site.primary_hostname}</span>
                </div>

                <div className="flex items-center gap-1 text-[#0052FF] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Manage</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052FF] mx-auto flex items-center justify-center mb-4">
            <Globe size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No platform websites found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            Get started by creating your first FeraSetu platform site, such as help.ferasetu.com or docs.ferasetu.com.
          </p>
          <button
            onClick={openWizard}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0052FF] hover:bg-[#0045d8] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Create Website</span>
          </button>
        </div>
      )}
    </div>
  );
}
