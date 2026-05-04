import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, Database, Mail, Bot, ToggleRight, 
  Terminal, Zap, Cpu, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const API = import.meta.env.VITE_API_URL || '/api';

export default function AdminSystemPage() {
  const [activeTab, setActiveTab] = useState<'health' | 'flags' | 'ai'>('health');
  const [stats, setStats] = useState<any>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('admin_token');

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, flagsRes, aiRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard-stats`, { headers }),
        axios.get(`${API}/admin/feature-flags`, { headers }),
        axios.get(`${API}/admin/ai-usage`, { headers })
      ]);
      setStats(statsRes.data);
      setFlags(flagsRes.data.flags);
      setAiUsage(aiRes.data);
    } catch (err) {
      toast.error('Failed to sync system data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const toggleFlag = async (flag: any) => {
    try {
      await axios.post(`${API}/admin/feature-flags`, 
        { ...flag, is_enabled: !flag.is_enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${flag.flag_key} updated`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update flag');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Navigation Pills */}
        <div className="flex p-1.5 bg-slate-200/50 rounded-2xl w-fit">
          {[
            { id: 'health', label: 'Health & Status', icon: <Activity size={16} /> },
            { id: 'flags', label: 'Feature Flags', icon: <ToggleRight size={16} /> },
            { id: 'ai', label: 'AI Usage Monitor', icon: <Bot size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all
                ${activeTab === tab.id 
                  ? 'bg-white text-orange-600 shadow-md shadow-orange-500/5' 
                  : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'health' && <HealthTab stats={stats} loading={loading} />}
        {activeTab === 'flags' && <FlagsTab flags={flags} onToggle={toggleFlag} loading={loading} />}
        {activeTab === 'ai' && <AiTab usage={aiUsage} loading={loading} />}
      </div>
    </AdminLayout>
  );
}

function HealthTab({ stats, loading }: any) {
  if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
    {Array(3).fill(0).map((_, i) => <div key={i} className="h-48 bg-white rounded-3xl border border-slate-200" />)}
  </div>;

  const memory = stats?.health?.memory;
  const system = stats?.health?.system;
  const heapUsedMb = memory ? Math.round(memory.heapUsed / 1024 / 1024) : 0;
  const rssMb = memory ? Math.round(memory.rss / 1024 / 1024) : 0;
  const freeMemoryMb = system ? Math.round(system.freeMemory / 1024 / 1024) : 0;
  const loadAvg = system?.loadAverage?.[0] ?? 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusCard 
          label="SMTP Email Service" 
          status={stats?.health?.smtp === 'operational' ? 'online' : 'error'} 
          icon={<Mail className="text-blue-500" />}
          detail="Google Workspace Relay"
        />
        <StatusCard 
          label="Core Database" 
          status="online" 
          icon={<Database className="text-emerald-500" />}
          detail="Application database reachable"
        />
        <StatusCard 
          label="AI Engine (Sarvam)" 
          status="online" 
          icon={<Bot className="text-purple-500" />}
          detail="v1.0 / Complex Models"
        />
      </div>

      <div className="bg-[#111827] text-white p-8 rounded-[2.5rem] shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Terminal size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
              <Cpu className="text-orange-500" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Real-time Server Analytics</h3>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Node.js Runtime Environment</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <MetricItem label="Uptime" value={`${Math.floor(stats?.health?.uptime / 3600)}h ${Math.floor((stats?.health?.uptime % 3600) / 60)}m`} />
            <MetricItem label="Heap Used" value={`${heapUsedMb} MB`} />
            <MetricItem label="RSS Memory" value={`${rssMb} MB`} />
            <MetricItem label="Free RAM" value={`${freeMemoryMb} MB`} />
            <MetricItem label="Load Avg" value={loadAvg.toFixed(2)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FlagsTab({ flags, onToggle }: any) {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
        <div>
          <h3 className="text-lg font-black text-slate-900">System Feature Toggles</h3>
          <p className="text-sm font-bold text-slate-400">Enable or disable modules platform-wide</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
          <Plus size={16} /> New Flag
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {flags.map((flag: any) => (
          <div key={flag.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
            <div className="flex items-start gap-5">
              <div className={`p-3 rounded-2xl ${flag.is_enabled ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                <Zap size={24} />
              </div>
              <div>
                <div className="font-black text-slate-900 mb-1">{flag.flag_key}</div>
                <div className="text-sm font-medium text-slate-500 max-w-md">{flag.description}</div>
              </div>
            </div>
            <button 
              onClick={() => onToggle(flag)}
              className={`
                relative inline-flex h-7 w-12 items-center rounded-full transition-colors
                ${flag.is_enabled ? 'bg-orange-500' : 'bg-slate-200'}
              `}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${flag.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiTab({ usage }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30">
            <h3 className="text-lg font-black text-slate-900">Recent AI Operations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="p-6">Partner</th>
                  <th className="p-6">Model</th>
                  <th className="p-6">Tokens</th>
                  <th className="p-6">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usage?.logs?.map((log: any) => (
                  <tr key={log.id} className="text-sm font-medium text-slate-700">
                    <td className="p-6">
                      <div className="font-black text-slate-900">{log.business_name || 'Partner'}</div>
                      <div className="text-xs text-slate-400">{log.email}</div>
                    </td>
                    <td className="p-6"><span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase">{log.model}</span></td>
                    <td className="p-6">{log.prompt_tokens + log.completion_tokens}</td>
                    <td className="p-6 text-emerald-600 font-black">{log.credits_used || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Usage By AI Type</h3>
          <div className="space-y-6">
            {usage?.byUsageType?.map((s: any) => (
              <div key={s.usage_type} className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">{s.usage_type?.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-black text-orange-600">{s.calls} calls</span>
                </div>
                <div className="text-xl font-black text-slate-900">{s.credits_used || 0} credits</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, status, icon, detail }: any) {
  const isOnline = status === 'online';
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-2 h-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">{icon}</div>
        <div>
          <div className="text-sm font-black text-slate-900 leading-none">{label}</div>
          <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter">{detail}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
          {isOnline ? 'Fully Operational' : 'Critical Failure'}
        </span>
      </div>
    </div>
  );
}

function MetricItem({ label, value }: any) {
  return (
    <div>
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-xl font-black">{value}</div>
    </div>
  );
}
