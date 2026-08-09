import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface FoundingOfferData {
  enabled: boolean;
  slotsTotal: number;
  slotsUsed: number;
  slotsRemaining: number | null;
  plan: string;
  months: number;
}

/**
 * FoundingOfferBanner — shows the Founding Shopkeeper offer IF AND ONLY IF:
 * 1. The offer is enabled in the backend config
 * 2. Slots are still available
 *
 * NEVER shows fake numbers. If the slot count isn't reliable, shows "limited spots" without a number.
 * If the offer is disabled, renders nothing.
 */
export default function FoundingOfferBanner() {
  const { data, isLoading, isError } = useQuery<FoundingOfferData>({
    queryKey: ['founding-offer'],
    queryFn: async () => {
      const res = await api.get('/pricing/founding-offer');
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Don't show anything while loading, on error, or if offer is disabled
  if (isLoading || isError || !data?.enabled) return null;
  if (data.slotsRemaining !== null && data.slotsRemaining <= 0) return null;

  const slotsDisplay = data.slotsRemaining !== null
    ? `${data.slotsRemaining} spots remaining`
    : 'Limited spots available';

  return (
    <section
      aria-label="Founding Shopkeeper Program"
      role="banner"
      style={{
        borderRadius: 20,
        padding: '28px 32px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        border: '1px solid rgba(255,107,53,0.3)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 40,
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 180, height: 180, borderRadius: '50%',
        background: 'rgba(255,107,53,0.15)', filter: 'blur(40px)',
        pointerEvents: 'none',
      }} aria-hidden="true" />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          {/* Icon */}
          <div style={{
            width: 48, height: 48, borderRadius: 16, flexShrink: 0,
            background: 'rgba(255,107,53,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Star size={22} color="#FF6B35" fill="#FF6B35" aria-hidden="true" />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, fontWeight: 900, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#FF6B35',
                background: 'rgba(255,107,53,0.15)', padding: '3px 10px', borderRadius: 999,
              }}>
                Founding Shopkeeper Program
              </span>
              {data.slotsRemaining !== null && (
                <span style={{
                  fontSize: 11, fontWeight: 800, color: '#fbbf24',
                  background: 'rgba(251,191,36,0.1)', padding: '3px 10px', borderRadius: 999,
                  border: '1px solid rgba(251,191,36,0.2)',
                }}>
                  {slotsDisplay}
                </span>
              )}
            </div>

            <h2 style={{
              fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 900, color: '#fff',
              letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.2,
            }}>
              Be one of the first {data.slotsTotal} shops building with FeraSetu.
            </h2>

            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 16px', lineHeight: 1.7, fontWeight: 500 }}>
              Founding shops get <strong style={{ color: '#fff' }}>{data.months} months of {data.plan.charAt(0).toUpperCase() + data.plan.slice(1)} plan</strong> access, priority support, and the chance to shape what we build next.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Link
                to="/register?founding=true"
                id="founding-offer-cta"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 22px', borderRadius: 14,
                  background: '#FF6B35', color: '#fff',
                  fontWeight: 800, fontSize: 14, textDecoration: 'none',
                  transition: 'filter 0.2s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                Claim Your Founding Spot
                <ArrowRight size={16} />
              </Link>
              {data.slotsRemaining === null && (
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Limited spots · First come, first served
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
