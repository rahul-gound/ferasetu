import { useEffect, useState } from 'react';
import { Bot, Coins, CreditCard, Globe, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface CreditPack {
  credits: number;
  amount: number;
  label: string;
}

export default function AICreditsPage() {
  const { updateUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [scope, setScope] = useState<'shared' | 'website_ai' | 'customer_assistant'>('shared');

  const fetchCredits = async () => {
    try {
      const res = await api.get('/payment/ai-credits');
      setData(res.data);
    } catch {
      toast.error('Failed to load AI credits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const buyPack = async (pack: string) => {
    setBuying(pack);
    try {
      const res = await api.post('/payment/ai-credits/purchase', { pack, usage_scope: scope });
      updateUser({ ai_credits_balance: res.data.ai_credits_balance } as any);
      toast.success('AI credits added');
      fetchCredits();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to buy credits');
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;
  }

  const credits = data?.credits || {};
  const packs = data?.packs || {};
  const usage = data?.usage || [];

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-slate-50 p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
              <Coins size={14} /> AI Credits
            </div>
            <h1 className="text-3xl font-black text-slate-950">Control AI cost without blocking growth.</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">
              Website AI, shopkeeper assistant, and future customer assistant all use credits. Buy extra credits only when your shop needs more AI work.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Current Balance</div>
            <div className="mt-1 text-5xl font-black text-orange-600">{credits.ai_credits_balance || 0}</div>
            <div className="mt-1 text-xs font-bold text-slate-500">{credits.ai_credits_used_month || 0}/{credits.ai_credits_monthly_limit || 0} monthly credits used</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <UsageCard icon={<Bot />} title="Shopkeeper Assistant" value={usage.find((u: any) => u.usage_type === 'shopkeeper_assistant')?.credits_used || 0} note="1 credit per normal AI chat" />
        <UsageCard icon={<Globe />} title="Website AI" value={usage.find((u: any) => u.usage_type === 'website_ai')?.credits_used || 0} note="3 credits for website generation" />
        <UsageCard icon={<MessageSquare />} title="Customer Assistant" value={usage.find((u: any) => u.usage_type === 'customer_assistant')?.credits_used || 0} note="2 credits per customer AI reply" />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Buy Extra Credits</h2>
            <p className="text-sm font-semibold text-slate-500">Use shared credits, or mark the purchase for website AI / customer assistant reporting.</p>
          </div>
          <select value={scope} onChange={e => setScope(e.target.value as any)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none">
            <option value="shared">Shared credits</option>
            <option value="website_ai">Website AI credits</option>
            <option value="customer_assistant">Customer assistant credits</option>
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(packs).map(([id, pack]) => {
            const p = pack as CreditPack;
            return (
              <article key={id} className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                <Sparkles className="mb-4 text-orange-500" />
                <h3 className="text-lg font-black text-slate-900">{p.label}</h3>
                <div className="mt-3 text-3xl font-black text-slate-950">₹{p.amount}</div>
                <button onClick={() => buyPack(id)} disabled={!!buying} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50">
                  {buying === id ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />} Buy Credits
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function UsageCard({ icon, title, value, note }: any) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">{icon}</div>
      <div className="text-sm font-black uppercase tracking-widest text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{note}</div>
    </div>
  );
}
