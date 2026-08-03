import { useState } from 'react';
import { couponService } from '../services/couponService';
import type { CouponPreviewData } from '../services/couponService';
import { useLanguage } from './LanguageContext';
import { Loader2 } from 'lucide-react';

interface CouponInputProps {
  onCouponValidated: (preview: CouponPreviewData) => void;
  onError: (message: string) => void;
  userId: string;
  disabled?: boolean;
}

const CouponInput: React.FC<CouponInputProps> = ({
  onCouponValidated,
  onError,
  userId,
  disabled = false,
}) => {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    const trimmed = code.trim();
    if (!trimmed || validating || disabled) return;

    setValidating(true);
    try {
      const result = await couponService.validateCoupon(trimmed, userId);
      if (result.valid && result.preview) {
        onCouponValidated(result.preview);
      } else {
        const errorKey = result.error || 'coupon_error_invalid';
        onError(t(errorKey));
      }
    } catch {
      onError(t('coupon_error_invalid'));
    } finally {
      setValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleValidate();
    }
  };

  // ── Styles (consistent with CouponCreateForm) ──────────────────────────

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '0.625rem 0.875rem',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
    opacity: disabled ? 0.6 : 1,
  };

  const canValidate = code.trim().length > 0 && !validating && !disabled;

  const buttonStyle: React.CSSProperties = {
    padding: '0.625rem 1.25rem',
    background: canValidate ? 'var(--primary)' : '#9ca3af',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: canValidate ? 'pointer' : 'not-allowed',
    opacity: validating ? 0.7 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background 0.15s ease',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <input
        type="text"
        style={inputStyle}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('coupon_input_placeholder')}
        maxLength={12}
        disabled={disabled || validating}
        aria-label={t('coupon_input_placeholder')}
      />
      <button
        type="button"
        style={buttonStyle}
        onClick={handleValidate}
        disabled={!canValidate}
        aria-label={t('coupon_validate')}
      >
        {validating && (
          <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
        )}
        {t('coupon_validate')}
      </button>
    </div>
  );
};

export default CouponInput;
