import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Gift, Users, CheckCircle2, Trophy, Copy, Check, 
  Share2, Store, Clock, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

interface ReferralRecord {
  id: string;
  storeName: string;
  ownerName: string;
  date: string;
  plan: string;
  status: 'completed' | 'pending';
  reward: string;
}

export default function ReferEarnPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const referralCode = (user?.subdomain || user?.business_name || user?.name || 'my-store')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  const referralUrl = `https://ferasetu.com/ref/${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hey! I'm using FeraSetu to run my store online with WhatsApp ordering and AI. Register your shop using my link and get 100 bonus AI credits: ${referralUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Real referrals list (empty by default for new merchants)
  const referrals: ReferralRecord[] = [];
  const totalReferred = referrals.length;
  const successfulStores = referrals.filter(r => r.status === 'completed').length;
  const totalRewardsWon = successfulStores * 500;

  return (
    <div className="pb-12 max-w-[1380px] mx-auto space-y-6">
      <SEO title="Refer & Earn | FeraSetu" />

      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200/80 px-3 py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-50 text-[#0052FF]">
              <Gift size={20} />
            </span>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight font-outfit">
              Refer & Earn
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500 max-w-2xl">
            Invite fellow business owners to FeraSetu. Earn ₹500 directly in your payout account for every merchant who launches their store, and they get 100 free AI credits!
          </p>
        </div>

        <button
          onClick={handleShareWhatsApp}
          className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-4 py-2.5 rounded-xl shadow-sm text-xs font-bold transition-colors self-start md:self-auto cursor-pointer"
        >
          <Share2 size={15} />
          <span>Share via WhatsApp</span>
        </button>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        
        {/* Total Referred */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400">Total Referred</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mt-1">{totalReferred}</h3>
            <p className="text-[11px] font-medium text-slate-400 mt-1">Merchants invited</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052FF] flex-shrink-0">
            <Users size={24} />
          </div>
        </div>

        {/* Successful Stores */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400">Successful Stores</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mt-1">{successfulStores}</h3>
            <p className="text-[11px] font-medium text-emerald-600 mt-1 font-semibold">Active stores launched</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Store size={24} />
          </div>
        </div>

        {/* Total Rewards Won */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400">Total Rewards Won</p>
            <h3 className="text-3xl font-black text-[#0052FF] tracking-tight mt-1">₹{totalRewardsWon.toLocaleString('en-IN')}</h3>
            <p className="text-[11px] font-medium text-slate-400 mt-1">Credited to payout account</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 flex-shrink-0">
            <Trophy size={24} />
          </div>
        </div>
      </div>

      {/* Referral Link Card & How It Works */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Referral Link Box */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Your Unique Referral Link</h2>
            <p className="text-xs text-slate-500 mb-4">
              Share this link with store owners, wholesalers, retailers, or friends. When they register using your link, they are automatically linked to your account.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 truncate font-mono select-all">
                {referralUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 bg-[#0052FF] hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 cursor-pointer flex-shrink-0"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Referral Code: <span className="font-bold text-slate-900 font-mono">{referralCode.toUpperCase()}</span>
            </span>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 text-xs font-bold text-[#25D366] hover:underline cursor-pointer"
            >
              <Share2 size={13} />
              <span>Share directly on WhatsApp</span>
            </button>
          </div>
        </div>

        {/* How it Works Guide */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-50/90 to-indigo-50/60 border border-blue-100/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-[#0052FF]" />
            How It Works
          </h2>

          <div className="space-y-3.5 my-auto">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#0052FF] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                1
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900">Share your referral link</p>
                <p className="text-[11px] text-slate-500 font-medium">Send your personal invite link to merchants and business contacts.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#0052FF] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                2
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900">They launch their online store</p>
                <p className="text-[11px] text-slate-500 font-medium">They register and set up their store catalog on FeraSetu.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#0052FF] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                3
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900">You both get rewarded</p>
                <p className="text-[11px] text-slate-500 font-medium">You get ₹500 directly in your payout account, and they get 100 free AI credits.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-blue-100/60 text-[11px] text-slate-400 font-medium">
            * Rewards are credited once the referred store passes basic verification.
          </div>
        </div>
      </div>

      {/* Referral History Table */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Referral History</h2>
            <p className="text-xs text-slate-500 mt-0.5">Track the status of all your invited merchants and earned rewards.</p>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            Total {totalReferred} Merchants Invited
          </div>
        </div>

        {referrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Store Name</th>
                  <th className="py-3 px-3">Owner</th>
                  <th className="py-3 px-3">Date Joined</th>
                  <th className="py-3 px-3">Store Status / Plan</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Reward Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                {referrals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <Store size={14} />
                      </div>
                      <span>{item.storeName}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{item.ownerName}</td>
                    <td className="py-3 px-3 text-slate-400 font-medium">{item.date}</td>
                    <td className="py-3 px-3 text-slate-600">{item.plan}</td>
                    <td className="py-3 px-3">
                      {item.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600">
                          <CheckCircle2 size={11} /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600">
                          <Clock size={11} /> Pending Setup
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {item.status === 'completed' ? (
                        <span className="text-emerald-600">+{item.reward}</span>
                      ) : (
                        <span className="text-slate-400 font-medium">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052FF] mb-3 shadow-sm">
              <Gift size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">No referrals yet</h3>
            <p className="text-xs text-slate-400 font-medium max-w-sm mb-4">
              Share your unique referral link with retailers and shopkeepers to earn ₹500 for every merchant that launches their store on FeraSetu.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-[#0052FF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Copy Referral Link
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Share on WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
