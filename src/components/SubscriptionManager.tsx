import { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  XCircle,
  RefreshCw,
  Edit3,
  CheckCircle,
  AlertTriangle,
  Clock,
  Ticket,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from './LanguageContext';
import ExamSelector from './ExamSelector';
import CouponInput from './CouponInput';
import CouponPreview from './CouponPreview';
import { couponService } from '../services/couponService';
import type { CouponPreviewData } from '../services/couponService';
import type { Subscription, Exam } from '../types';

interface SubscriptionManagerProps {
  subscription: Subscription;
  exams: Exam[];
  userId: string;
  onCancel: () => void;
  onChangeExams: (ids: string[]) => void;
  onRenew: () => void;
  onSubscriptionUpdated?: () => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active: <CheckCircle size={16} color="var(--success)" />,
  trial: <Clock size={16} color="var(--primary)" />,
  cancelled: <XCircle size={16} color="var(--error)" />,
  expired: <AlertTriangle size={16} color="var(--secondary)" />,
  grace_period: <AlertTriangle size={16} color="var(--secondary)" />,
};

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  subscription,
  exams,
  userId,
  onCancel,
  onChangeExams,
  onRenew,
  onSubscriptionUpdated,
}) => {
  const { t } = useLanguage();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [editingExams, setEditingExams] = useState(false);
  const [pendingExamIds, setPendingExamIds] = useState<string[]>(subscription.selected_exam_ids);

  // ── Coupon state ─────────────────────────────────────────────────────────
  const [couponPreview, setCouponPreview] = useState<CouponPreviewData | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isOrgMember, setIsOrgMember] = useState(false);

  const hasAppliedCoupon = !!subscription.applied_coupon_code;

  useEffect(() => {
    let cancelled = false;
    couponService.isUserInOrganization(userId).then((inOrg) => {
      if (!cancelled) setIsOrgMember(inOrg);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

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
        await couponService.applyTimeCoupon(
          couponPreview.code,
          userId,
          subscription.selected_exam_ids,
        );
        setCouponSuccess(t('coupon_success_time', { days: couponPreview.value }));
      } else {
        await couponService.applyPercentageCoupon(couponPreview.code, userId);
        setCouponSuccess(t('coupon_success_percentage', { percent: couponPreview.value }));
      }
      setCouponPreview(null);
      onSubscriptionUpdated?.();
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

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      active: t('sub_active'),
      trial: t('sub_trial'),
      cancelled: t('sub_cancelled'),
      expired: t('sub_expired'),
      grace_period: t('sub_grace'),
    };
    return map[s] || s;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString();
  };

  const handleCancelClick = () => setShowCancelConfirm(true);

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onCancel();
  };

  const handleSaveExams = () => {
    onChangeExams(pendingExamIds);
    setEditingExams(false);
  };

  const isExpiredOrCancelled = subscription.status === 'expired' || subscription.status === 'cancelled';
  const canChangeExams = !subscription.exam_change_used_this_period
    && (subscription.status === 'active' || subscription.status === 'trial');

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <CreditCard size={20} color="var(--primary)" />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
          {t('sub_my_subscription')}
        </h3>
      </div>

      {/* Status info rows */}
      <div style={infoGridStyle}>
        <InfoRow
          label={t('sub_status')}
          value={
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {STATUS_ICONS[subscription.status]}
              {statusLabel(subscription.status)}
            </span>
          }
        />
        {subscription.plan_type && (
          <InfoRow label={t('sub_plan')} value={subscription.plan_type === 'monthly' ? t('sub_monthly') : t('sub_annual')} />
        )}
        {subscription.current_period_end && (
          <InfoRow
            label={t('sub_next_billing')}
            value={
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} color="var(--text-secondary)" />
                {formatDate(subscription.current_period_end)}
              </span>
            }
          />
        )}
      </div>

      {/* Coupon section — only for non-org individual users */}
      {!isOrgMember && !hasAppliedCoupon && (
        <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
            <Ticket size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('coupon_input_placeholder')}</span>
          </div>

          {couponSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success, #10b981)', fontSize: '0.85rem', marginBottom: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(16,185,129,0.06)', borderRadius: 6, fontWeight: 600 }}>
              {couponSuccess}
            </div>
          )}

          {couponError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--error)', fontSize: '0.85rem', marginBottom: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(239,68,68,0.06)', borderRadius: 6 }}>
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

      {/* Applied coupon info */}
      {hasAppliedCoupon && (
        <div style={{ marginTop: '1rem', padding: '0.6rem 0.85rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Ticket size={16} color="var(--success, #10b981)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success, #10b981)' }}>
            {t('coupon_success_percentage', { percent: subscription.applied_coupon_discount ?? 0 })}
          </span>
        </div>
      )}

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div style={confirmBoxStyle}>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            {t('sub_cancel_confirm', { date: formatDate(subscription.current_period_end) })}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button onClick={handleConfirmCancel} style={dangerBtnStyle}>
              <XCircle size={14} /> {t('sub_cancel')}
            </button>
            <button onClick={() => setShowCancelConfirm(false)} style={secondaryBtnStyle}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Exam change section */}
      {editingExams ? (
        <div style={{ marginTop: '1rem' }}>
          <ExamSelector
            exams={exams}
            selectedIds={pendingExamIds}
            onSelectionChange={setPendingExamIds}
            maxSelection={3}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button
              onClick={handleSaveExams}
              disabled={pendingExamIds.length === 0}
              style={{
                ...primaryBtnStyle,
                opacity: pendingExamIds.length === 0 ? 0.5 : 1,
              }}
            >
              <CheckCircle size={14} /> {t('save')}
            </button>
            <button onClick={() => setEditingExams(false)} style={secondaryBtnStyle}>
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : null}

      {/* Action buttons */}
      <div style={actionsStyle}>
        {/* Change exams */}
        {canChangeExams && !editingExams && (
          <button onClick={() => { setPendingExamIds(subscription.selected_exam_ids); setEditingExams(true); }} style={secondaryBtnStyle}>
            <Edit3 size={14} /> {t('sub_change_exams')}
          </button>
        )}
        {subscription.exam_change_used_this_period && !editingExams && (subscription.status === 'active' || subscription.status === 'trial') && (
          <span style={hintStyle}>{t('sub_change_used')}</span>
        )}

        {/* Cancel */}
        {(subscription.status === 'active') && !showCancelConfirm && (
          <button onClick={handleCancelClick} style={dangerBtnStyle}>
            <XCircle size={14} /> {t('sub_cancel')}
          </button>
        )}

        {/* Renew */}
        {isExpiredOrCancelled && (
          <button onClick={onRenew} style={primaryBtnStyle}>
            <RefreshCw size={14} /> {t('sub_renew')}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Helper ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

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

const infoGridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const confirmBoxStyle: React.CSSProperties = {
  marginTop: '1rem',
  padding: '0.85rem',
  background: 'rgba(239,68,68,0.06)',
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: 8,
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.5rem',
  marginTop: '1rem',
};

const primaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.5rem 1rem',
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: '0.85rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const secondaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.5rem 1rem',
  background: 'var(--bg-main)',
  color: 'var(--text-main)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: '0.85rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const dangerBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.5rem 1rem',
  background: 'rgba(239,68,68,0.1)',
  color: 'var(--error)',
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: 8,
  fontSize: '0.85rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const hintStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
  fontStyle: 'italic',
};

export default SubscriptionManager;
