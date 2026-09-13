import { Check, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href?: string;
  actionLabel?: string;
}

interface OnboardingProgressProps {
  shopCreated: boolean;
  hasProducts: boolean;
  hasOrders: boolean;
  storePublished?: boolean;
  storeSlug?: string;
  storeUrl?: string;
  /** Called when the user explicitly dismisses the widget (stores in localStorage) */
  onDismiss?: () => void;
}

const DISMISS_KEY = 'fera_onboarding_dismissed_v2';

function isDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {}
}

export default function OnboardingProgress({
  shopCreated,
  hasProducts,
  hasOrders,
  storePublished = false,
  storeSlug,
  storeUrl,
  onDismiss,
}: OnboardingProgressProps) {
  const displayUrl = storeUrl || (storeSlug ? `https://${storeSlug}.ferasetu.com` : 'Store link reserved');

  const steps: OnboardingStep[] = [
    {
      id: 'shop_created',
      label: 'Store created & organization verified',
      description: 'Your business account and secure database tenant are ready.',
      done: shopCreated,
    },
    {
      id: 'link_reserved',
      label: 'Live store URL reserved',
      description: displayUrl,
      done: true, // Endowed progress: instantly reserved
      href: storeUrl,
      actionLabel: 'Preview',
    },
    {
      id: 'first_product',
      label: 'Add your first product',
      description: 'Upload 1 product with price and photo to activate your live storefront.',
      done: hasProducts,
      href: '/products',
      actionLabel: 'Add Product',
    },
    {
      id: 'store_shared',
      label: 'Share WhatsApp store link',
      description: 'Send your store catalog to customers or post on WhatsApp Status.',
      done: storePublished || hasOrders,
      href: '/dashboard',
      actionLabel: 'Share Link',
    },
    {
      id: 'first_order',
      label: 'Receive first order & direct payment',
      description: 'Customers order via WhatsApp/web and pay 100% directly to your UPI/cash.',
      done: hasOrders,
      href: '/orders',
      actionLabel: 'View Orders',
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const totalCount = steps.length;
  const pct = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;
  const nextUndoneIndex = steps.findIndex(s => !s.done);

  // Don't render if dismissed and products are already added, or if everything is complete
  if (isDismissed() && completedCount >= 3) return null;
  if (allDone) return null;

  const handleDismiss = () => {
    dismiss();
    onDismiss?.();
  };

  return (
    <div
      role="region"
      aria-label="Shop setup progress"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052FF] shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-900 m-0">
                Setup Checklist &mdash; {pct}% Complete
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                Endowed: 2 Steps Done ✓
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
              {completedCount} of {totalCount} setup milestones finished. Complete the next step to start receiving orders.
            </p>
          </div>
        </div>

        {/* Progress Bar & Dismiss */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="w-28 sm:w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-[#0052FF] to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {completedCount >= 3 && (
            <button
              onClick={handleDismiss}
              aria-label="Dismiss setup checklist"
              className="text-slate-400 hover:text-slate-600 text-sm font-bold px-1.5 py-0.5 rounded transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {/* Steps List */}
      <div className="divide-y divide-slate-100">
        {steps.map((step, i) => {
          const isNext = i === nextUndoneIndex;
          return (
            <div
              key={step.id}
              className={`flex items-center justify-between gap-4 p-3.5 sm:px-6 sm:py-3.5 transition-colors ${
                isNext ? 'bg-blue-50/40' : step.done ? 'bg-white opacity-85' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Status Indicator */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    step.done
                      ? 'bg-emerald-500 text-white'
                      : isNext
                      ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-100 animate-pulse'
                      : 'border-2 border-slate-300 bg-white text-transparent'
                  }`}
                >
                  {step.done ? (
                    <Check size={13} strokeWidth={3} />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-white block" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-xs sm:text-sm m-0 font-bold ${
                        step.done
                          ? 'text-slate-500 line-through'
                          : isNext
                          ? 'text-slate-900'
                          : 'text-slate-700'
                      }`}
                    >
                      {step.label}
                    </p>
                    {isNext && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                        Next Action
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium m-0 truncate mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              {!step.done && step.href && (
                <Link
                  to={step.href}
                  id={`onboarding-step-${step.id}`}
                  className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isNext
                      ? 'bg-[#0052FF] hover:bg-blue-700 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{step.actionLabel}</span>
                  <ArrowRight size={12} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
