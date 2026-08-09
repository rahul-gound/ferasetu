import { useQuery } from '@tanstack/react-query';
import { Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

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
  /** Called when the user explicitly dismisses the widget (stores in localStorage) */
  onDismiss?: () => void;
}

const DISMISS_KEY = 'fera_onboarding_dismissed_v1';

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

/**
 * OnboardingProgress — shows a compact "Your shop is X% ready" checklist
 * on the dashboard until all steps are complete.
 *
 * Principles:
 * - Only shows actionable steps the user hasn't completed
 * - Dismissible once at least 3 steps are done
 * - Uses real data — never fake completion
 * - Does NOT spam or block the user
 */
export default function OnboardingProgress({
  shopCreated,
  hasProducts,
  hasOrders,
  storePublished = false,
  onDismiss,
}: OnboardingProgressProps) {
  const steps: OnboardingStep[] = [
    {
      id: 'shop_created',
      label: 'Shop created',
      description: 'Your FeraSetu account is set up.',
      done: shopCreated,
    },
    {
      id: 'first_product',
      label: 'First product added',
      description: 'Add a product your customers can see.',
      done: hasProducts,
      href: '/products',
      actionLabel: 'Add product',
    },
    {
      id: 'store_published',
      label: 'Store published',
      description: 'Build and publish your online storefront.',
      done: storePublished,
      href: '/website-builder',
      actionLabel: 'Build store',
    },
    {
      id: 'store_shared',
      label: 'Share your store',
      description: 'Share your store link on WhatsApp or social media.',
      done: false, // client-side only — can't track this without analytics
      href: '/dashboard',
      actionLabel: 'Get store link',
    },
    {
      id: 'first_order',
      label: 'First order received',
      description: 'When your first customer places an order, you\'re live!',
      done: hasOrders,
      href: '/orders',
      actionLabel: 'View orders',
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const totalCount = steps.length;
  const pct = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;

  // Don't render if dismissed or everything is complete
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
      style={{
        borderRadius: 20,
        border: '1px solid rgba(255,107,53,0.2)',
        background: 'linear-gradient(135deg, rgba(255,107,53,0.04) 0%, rgba(255,255,255,0) 100%)',
        overflow: 'hidden',
        marginBottom: 24,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid rgba(255,107,53,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', margin: 0 }}>
              Your shop is {pct}% ready
            </p>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>
              {completedCount} of {totalCount} steps done
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 80, height: 6, borderRadius: 999,
            background: 'rgba(255,107,53,0.15)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 999,
              background: 'linear-gradient(90deg, #FF6B35, #f97316)',
              width: `${pct}%`,
              transition: 'width 0.6s ease',
            }} />
          </div>
          {completedCount >= 3 && (
            <button
              onClick={handleDismiss}
              aria-label="Dismiss setup checklist"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', fontSize: 18, lineHeight: 1, padding: '2px 4px',
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Steps */}
      <div style={{ padding: '8px 0' }}>
        {steps.map((step, i) => (
          <div
            key={step.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '10px 20px',
              opacity: step.done ? 0.65 : 1,
              borderBottom: i < steps.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
            }}
          >
            {/* Status icon */}
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step.done ? '#10b981' : 'rgba(255,107,53,0.1)',
              border: step.done ? 'none' : '2px solid rgba(255,107,53,0.3)',
              transition: 'all 0.3s ease',
            }}>
              {step.done
                ? <Check size={13} color="#fff" strokeWidth={3} />
                : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6B35', display: 'block' }} />
              }
            </div>

            {/* Label */}
            <div style={{ flex: 1 }}>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: step.done ? 600 : 700,
                color: step.done ? '#64748b' : '#0f172a',
                textDecoration: step.done ? 'line-through' : 'none',
              }}>
                {step.label}
              </p>
              {!step.done && (
                <p style={{ margin: '1px 0 0', fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                  {step.description}
                </p>
              )}
            </div>

            {/* Action */}
            {!step.done && step.href && (
              <Link
                to={step.href}
                id={`onboarding-step-${step.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 700, color: '#FF6B35',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                {step.actionLabel}
                <ChevronRight size={12} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
