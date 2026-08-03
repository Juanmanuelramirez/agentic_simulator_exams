import { Clock, CreditCard } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface TrialBannerProps {
  type: 'trial' | 'grace_period';
  /** For trial: number of remaining simulations. For grace_period: end date ISO string. */
  trialSimulationsRemaining?: number;
  endDate?: string;
  onSubscribe: () => void;
  onRenew: () => void;
}

function computeGraceRemaining(endDate: string): { days: number; hours: number } | null {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 };
}

const TrialBanner: React.FC<TrialBannerProps> = ({ type, trialSimulationsRemaining, endDate, onSubscribe, onRenew }) => {
  const { t } = useLanguage();

  const isTrial = type === 'trial';

  // For grace period, compute time remaining
  if (!isTrial) {
    if (!endDate) return null;
    const remaining = computeGraceRemaining(endDate);
    if (!remaining) return null;

    const message = t('sub_grace_banner', { days: remaining.days });
    return (
      <div style={{ ...bannerStyle, background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)' }}>
        <div style={bannerContentStyle}>
          <Clock size={18} color="var(--secondary)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>
        </div>
        <button onClick={onRenew} style={{ ...actionButtonStyle, background: 'var(--secondary)' }}>
          <CreditCard size={14} />
          {t('sub_grace_renew')}
        </button>
      </div>
    );
  }

  // For trial: show simulations remaining
  if (trialSimulationsRemaining === undefined || trialSimulationsRemaining <= 0) return null;

  const message = t('sub_trial_banner_sims', { remaining: trialSimulationsRemaining, max: 3 });

  return (
    <div style={{ ...bannerStyle, background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)' }}>
      <div style={bannerContentStyle}>
        <Clock size={18} color="var(--primary)" />
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>
      </div>
      <button onClick={onSubscribe} style={{ ...actionButtonStyle, background: 'var(--primary)' }}>
        <CreditCard size={14} />
        {t('sub_subscribe')}
      </button>
    </div>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const bannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  borderRadius: 'var(--radius)',
  border: '1px solid',
  marginBottom: '1rem',
};

const bannerContentStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const actionButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.4rem 0.85rem',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: '0.8rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export default TrialBanner;
