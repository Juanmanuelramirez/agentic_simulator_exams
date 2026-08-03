import { useState, useEffect } from 'react';
import { CreditCard, Sparkles, Tag, AlertCircle, Gift } from 'lucide-react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { useLanguage } from './LanguageContext';
import { subscriptionService } from '../services/subscriptionService';
import { couponService } from '../services/couponService';
import type { CouponPreviewData } from '../services/couponService';
import CouponInput from './CouponInput';
import CouponPreview from './CouponPreview';
import type { Subscription, PlanType } from '../types';

interface SubscriptionPlansProps {
  selectedExamIds: string[];
  onSubscriptionActivated: (subscription: Subscription) => void;
  onTrialActivated: (subscription: Subscription) => void;
  trialAvailable: boolean;
  userId: string;
}

const MONTHLY_PRICE = 14.99;
const ANNUAL_PRICE = 119.99;

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  selectedExamIds,
  onSubscriptionActivated,
  onTrialActivated,
  trialAvailable,
  userId,
}) => {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);

  // ── Coupon state ─────────────────────────────────────────────────────────
  const [couponPreview, setCouponPreview] = useState<CouponPreviewData | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isOrgMember, setIsOrgMember] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);

  const monthlyPlanId = import.meta.env.VITE_PAYPAL_PLAN_MONTHLY;
  const annualPlanId = import.meta.env.VITE_PAYPAL_PLAN_ANNUAL;

  // ── Check org membership on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    couponService.isUserInOrganization(userId).then((inOrg) => {
      if (!cancelled) setIsOrgMember(inOrg);
    }).catch(() => {
      // If check fails, default to not showing coupon (safe fallback)
    });
    return () => { cancelled = true; };
  }, [userId]);

  // ── Coupon handlers ──────────────────────────────────────────────────────

  const handleCouponValidated = (preview: CouponPreviewData) => {
    setCouponPreview(preview);
    setCouponError(null);
    setCouponSuccess(null);
  };

  const handleCouponError = (message: string) => {
    setCouponError(message);
    setCouponPreview(null);
    setCouponSuccess(null);
  };

  const handleCouponConfirm = async () => {
    if (!couponPreview) return;
    setCouponApplying(true);
    setCouponError(null);

    try {
      if (couponPreview.type === 'time') {
        const subscription = await couponService.applyTimeCoupon(
          couponPreview.code,
          userId,
          selectedExamIds,
        );
        setCouponSuccess(t('coupon_success_time', { days: couponPreview.value }));
        setCouponPreview(null);
        onSubscriptionActivated(subscription);
      } else {
        await couponService.applyPercentageCoupon(couponPreview.code, userId);
        setAppliedDiscount(couponPreview.value);
        setCouponSuccess(t('coupon_success_percentage', { percent: couponPreview.value }));
        setCouponPreview(null);
      }
    } catch (e) {
      setCouponError(e instanceof Error ? e.message : t('coupon_error_invalid'));
    } finally {
      setCouponApplying(false);
    }
  };

  const handleCouponCancel = () => {
    setCouponPreview(null);
    setCouponError(null);
    setCouponSuccess(null);
  };

  // ── PayPal handlers ──────────────────────────────────────────────────────

  const handleApprove = async (planType: PlanType, price: number, subscriptionId: string) => {
    setError(null);
    try {
      const sub = await subscriptionService.activateSubscription(userId, {
        paypal_subscription_id: subscriptionId,
        plan_type: planType,
        price_usd: price,
        selected_exam_ids: selectedExamIds,
      });
      onSubscriptionActivated(sub);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('sub_payment_error'));
    }
  };

  const handleStartTrial = async () => {
    setError(null);
    setTrialLoading(true);
    try {
      const sub = await subscriptionService.createTrialSubscription(userId, selectedExamIds);
      onTrialActivated(sub);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('sub_payment_error'));
    } finally {
      setTrialLoading(false);
    }
  };

  // ── Price display helpers ────────────────────────────────────────────────

  const renderPrice = (price: number) => {
    if (appliedDiscount === null) {
      return (
        <p style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
          ${price.toFixed(2)}
        </p>
      );
    }

    const finalPrice = couponService.calculateDiscountedPrice(price, appliedDiscount);

    return (
      <div style={{ margin: '0 0 1rem' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {t('coupon_original_price')}: <span style={{ textDecoration: 'line-through' }}>${price.toFixed(2)}</span>
        </p>
        <p style={{ margin: '0.15rem 0', fontSize: '0.85rem', color: 'var(--success, #10b981)' }}>
          {t('coupon_discount')}: -{appliedDiscount}%
        </p>
        <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
          {t('coupon_final_price')}: ${finalPrice.toFixed(2)}
        </p>
      </div>
    );
  };

  // ── Plan card renderer ───────────────────────────────────────────────────

  const renderPlanCard = (
    planType: PlanType,
    planId: string | undefined,
    title: string,
    price: number,
    badge?: string,
  ) => (
    <div style={{
      ...planCardStyle,
      borderColor: planType === 'annual' ? 'var(--primary)' : 'var(--border)',
    }}>
      {badge && (
        <div style={savingsBadgeStyle}>
          <Tag size={12} />
          {badge}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <CreditCard size={18} color="var(--primary)" />
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h4>
      </div>
      {renderPrice(price)}
      {planId ? (
        <PayPalButtons
          style={{ layout: 'vertical', label: 'subscribe', shape: 'rect', color: 'gold' }}
          createSubscription={(_data, actions) => actions.subscription.create({ plan_id: planId })}
          onApprove={async (data) => {
            if (data.subscriptionID) {
              await handleApprove(planType, price, data.subscriptionID);
            }
          }}
          onError={() => setError(t('sub_payment_error'))}
          onCancel={() => setError(t('sub_payment_cancelled'))}
        />
      ) : (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          Plan not configured
        </p>
      )}
    </div>
  );

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <Sparkles size={20} color="var(--primary)" />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
          {t('sub_plans_title')}
        </h3>
      </div>

      {error && (
        <div style={errorStyle}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Coupon section — only for non-org users */}
      {!isOrgMember && (
        <div style={couponSectionStyle}>
          {couponSuccess && (
            <div style={successStyle}>
              {couponSuccess}
            </div>
          )}

          {couponError && (
            <div style={errorStyle}>
              <AlertCircle size={14} />
              {couponError}
            </div>
          )}

          {!couponPreview && !couponSuccess && (
            <CouponInput
              onCouponValidated={handleCouponValidated}
              onError={handleCouponError}
              userId={userId}
              disabled={!!couponPreview || couponApplying}
            />
          )}

          {couponPreview && (
            <CouponPreview
              preview={couponPreview}
              onConfirm={handleCouponConfirm}
              onCancel={handleCouponCancel}
              loading={couponApplying}
            />
          )}
        </div>
      )}

      {/* Trial button */}
      {trialAvailable && (
        <button
          onClick={handleStartTrial}
          disabled={trialLoading || selectedExamIds.length === 0}
          style={{
            ...trialButtonStyle,
            opacity: trialLoading || selectedExamIds.length === 0 ? 0.6 : 1,
            cursor: trialLoading || selectedExamIds.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <Gift size={18} />
          {trialLoading ? t('loading') : t('sub_trial_start')}
        </button>
      )}

      {/* Plan cards */}
      <div style={plansGridStyle}>
        {renderPlanCard('monthly', monthlyPlanId, t('sub_monthly'), MONTHLY_PRICE)}
        {renderPlanCard('annual', annualPlanId, t('sub_annual'), ANNUAL_PRICE, t('sub_annual_savings'))}
      </div>
    </div>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '1.25rem',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '1rem',
};

const errorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  color: 'var(--error)',
  fontSize: '0.85rem',
  marginBottom: '0.75rem',
  padding: '0.5rem 0.75rem',
  background: 'rgba(239,68,68,0.06)',
  borderRadius: 8,
};

const successStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  color: 'var(--success, #10b981)',
  fontSize: '0.85rem',
  marginBottom: '0.75rem',
  padding: '0.5rem 0.75rem',
  background: 'rgba(16,185,129,0.06)',
  borderRadius: 8,
  fontWeight: 600,
};

const couponSectionStyle: React.CSSProperties = {
  marginBottom: '1rem',
};

const trialButtonStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.85rem',
  marginBottom: '1rem',
  background: 'linear-gradient(135deg, var(--success), #059669)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius)',
  fontSize: '0.95rem',
  fontWeight: 700,
  fontFamily: 'inherit',
  transition: 'opacity 0.15s',
};

const plansGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '1rem',
};

const planCardStyle: React.CSSProperties = {
  position: 'relative',
  padding: '1.25rem',
  border: '2px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--bg-surface)',
};

const savingsBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: -10,
  right: 12,
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  background: 'var(--secondary)',
  color: '#fff',
  fontSize: '0.7rem',
  fontWeight: 700,
  padding: '0.2rem 0.6rem',
  borderRadius: 12,
};

export default SubscriptionPlans;
