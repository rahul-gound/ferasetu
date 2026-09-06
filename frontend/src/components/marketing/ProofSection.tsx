/**
 * ProofSection — Honest product proof replacing fabricated testimonials.
 *
 * Shows REAL product capabilities and differentiators without inventing
 * customer names, testimonials, user counts, or revenue claims.
 *
 * Purple Cow: Frames what users get from day 1, making the value concrete.
 */
import { CheckCircle2, Globe, Percent, MessageSquare, Zap, Sparkles, ShieldCheck } from 'lucide-react';

const PROOF_ITEMS = [
  {
    icon: <Globe size={20} />,
    title: 'Your own store URL — live in minutes',
    desc: 'yourshop.ferasetu.com is yours from day one. Share it anywhere customers are already looking.',
    highlight: 'yourshop.ferasetu.com',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: <Percent size={20} />,
    title: 'Zero commissions — ever',
    desc: 'We charge a flat monthly fee. When a customer pays you ₹500, you keep ₹500. Every rupee.',
    highlight: '0% commission',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: <MessageSquare size={20} />,
    title: 'WhatsApp ordering built in',
    desc: 'Customers browse your store, build a cart, and send the final order over WhatsApp — structured and ready to fulfill.',
    highlight: 'WhatsApp-native',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    icon: <Zap size={20} />,
    title: 'Direct UPI payments',
    desc: 'Customers pay via Google Pay, PhonePe, Paytm, or BHIM. Money goes directly to your bank — no withdrawal delays.',
    highlight: 'Direct to your bank',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    icon: <Sparkles size={20} />,
    title: 'FeraSetu AI knows your shop',
    desc: 'Ask "which products are low on stock?" or "write a Diwali offer message" — FeraSetu AI uses your actual store data, not generic answers.',
    highlight: 'AI that uses your data',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Data stays in India',
    desc: 'Your customer data, order history, and product catalog are stored on Indian infrastructure.',
    highlight: '100% India data',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
];

interface ProofSectionProps {
  title?: string;
  subtitle?: string;
}

export default function ProofSection({
  title = 'What you get from day one',
  subtitle = 'Every feature below works on the Free plan. No credit card, no trial period — just your store.',
}: ProofSectionProps) {
  return (
    <section
      className="py-20 md:py-24 bg-white border-t border-slate-100"
      aria-label="FeraSetu features and what you get"
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider mb-4">
            No Surprises
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            {title}
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">{subtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROOF_ITEMS.map((item, i) => (
            <div
              key={i}
              className="bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-200"
            >
              <div className={`w-10 h-10 ${item.iconBg} ${item.iconColor} rounded-xl flex items-center justify-center mb-4`}>
                {item.icon}
              </div>

              <div className="inline-flex items-center gap-1.5 mb-3">
                <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {item.highlight}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base mb-2 leading-snug">{item.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
