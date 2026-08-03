import type { CouponPreviewData } from '../services/couponService';
import { useLanguage } from './LanguageContext';
import { Loader2 } from 'lucide-react';

interface CouponPreviewProps {
  preview: CouponPreviewData;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const CouponPreview: React.FC<CouponPreviewProps> = ({
  preview,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { t } = useLanguage();

  const description =
    preview.type === 'time'
      ? t('coupon_preview_time', { days: preview.value })
      : t('coupon_preview_percentage', { percent: preview.value });

  // ── Styles (consistent with CouponInput / CouponCreateForm) ────────────

  const containerStyle: React.CSSProperties = {
    background: 'rgba(99, 102, 241, 0.06)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    borderRadius: 8,
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--text-primary, #1f2937)',
    margin: 0,
  };

  const codeStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    color: 'var(--primary, #6366f1)',
    margin: 0,
  };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  };

  const confirmButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '0.625rem 1.25rem',
    background: !loading ? 'var(--primary)' : '#9ca3af',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: !loading ? 'pointer' : 'not-allowed',
    opacity: loading ? 0.7 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background 0.15s ease',
    whiteSpace: 'nowrap',
  };

  const cancelButtonStyle: React.CSSProperties = {
    padding: '0.625rem 1.25rem',
    background: 'transparent',
    color: 'var(--text-secondary, #6b7280)',
    border: '1px solid var(--border, #d1d5db)',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: !loading ? 'pointer' : 'not-allowed',
    opacity: loading ? 0.6 : 1,
    transition: 'background 0.15s ease',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={containerStyle}>
      <p style={descriptionStyle}>{description}</p>
      <p style={codeStyle}>{preview.code}</p>
      <div style={buttonRowStyle}>
        <button
          type="button"
          style={confirmButtonStyle}
          onClick={onConfirm}
          disabled={loading}
          aria-label={t('coupon_apply')}
        >
          {loading && (
            <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
          )}
          {t('coupon_apply')}
        </button>
        <button
          type="button"
          style={cancelButtonStyle}
          onClick={onCancel}
          disabled={loading}
          aria-label={t('coupon_cancel')}
        >
          {t('coupon_cancel')}
        </button>
      </div>
    </div>
  );
};

export default CouponPreview;
