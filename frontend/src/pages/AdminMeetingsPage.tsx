import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, Clock, User, Mail, 
  CheckCircle2, XCircle, MoreVertical, Search,
  Store
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const API = import.meta.env.VITE_API_URL || '/api';

interface Meeting {
  id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  meeting_date: string;
  topic: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  partner_email: string;
  business_name: string;
}

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const token = localStorage.getItem('admin_token');

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/meetings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMeetings(res.data.meetings);
    } catch (err) {
      toast.error('Failed to sync meeting data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [token]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await axios.patch(`${API}/admin/meetings/${id}`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Meeting ${status}`);
      fetchMeetings();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filteredMeetings = meetings.filter(m => 
    m.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    m.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.customer_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Scheduled Meetings</h2>
            <p className="text-sm font-bold text-slate-400">Manage onboarding calls and partner consultations</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search meetings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold w-full md:w-80 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-3xl border border-slate-100 animate-pulse" />
            ))
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-200 border-dashed">
              <Calendar className="mx-auto text-slate-200 mb-4" size={48} />
              <h3 className="text-lg font-black text-slate-900">No meetings found</h3>
              <p className="text-sm font-bold text-slate-400">When shopkeepers book calls, they will appear here.</p>
            </div>
          ) : (
            filteredMeetings.map((meeting) => (
              <div key={meeting.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    meeting.status === 'scheduled' ? 'bg-orange-50 text-orange-600' :
                    meeting.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    <Calendar size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black text-slate-900">{meeting.customer_name}</h4>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        meeting.status === 'scheduled' ? 'bg-orange-100 text-orange-700' :
                        meeting.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {meeting.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500 uppercase tracking-tighter">
                      <span className="flex items-center gap-1"><Store size={12} /> {meeting.business_name || 'Individual'}</span>
                      <span className="flex items-center gap-1"><Mail size={12} /> {meeting.customer_email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 px-6 border-l border-slate-100 hidden lg:flex">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</div>
                    <div className="text-sm font-black text-slate-900">{new Date(meeting.meeting_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</div>
                    <div className="text-sm font-black text-slate-900">{new Date(meeting.meeting_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {meeting.status === 'scheduled' && (
                    <>
                      <button 
                        onClick={() => updateStatus(meeting.id, 'completed')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                      >
                        <CheckCircle2 size={14} /> Done
                      </button>
                      <button 
                        onClick={() => updateStatus(meeting.id, 'cancelled')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    </>
                  )}
                  {meeting.status !== 'scheduled' && (
                    <button 
                      onClick={() => updateStatus(meeting.id, 'scheduled')}
                      className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Re-schedule
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
