import { useState } from 'react';
import { couponService } from '../services/couponService';
import { useLanguage } from './LanguageContext';
import { Loader2, CheckCircle } from 'lucide-react';
import type { Coupon, CouponType } from '../types';

interface CouponCreateFormProps {
  onCouponCreated: (coupon: Coupon) => void;
  adminId: string;
}

const CouponCreateForm: React.FC<CouponCreateFormProps> = ({ onCouponCreated, adminId }) => {
  const { t } = useLanguage();

  const [type, setType] = useState<CouponType>('time');
  const [value, setValue] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCoupon, setCreatedCoupon] = useState<Coupon | null>(null);

  // ── Validation ──────────────────────────────────────────────────────────

  const getValueError = (): string | null => {
    if (!value) return null;
    const num = Number(value);
    if (type === 'time') {
      if (!Number.isInteger(num) || num <= 0) {
        return t('coupon_validation_days_positive');
      }
    } else {
      if (!Number.isInteger(num) || num < 1 || num > 100) {
        return t('coupon_validation_percentage_range');
      }
    }
    return null;
  };

  const getMaxUsesError = (): string | null => {
    if (!maxUses) return null;
    const num = Number(maxUses);
    if (!Number.isInteger(num) || num <= 0) {
      return t('coupon_validation_max_uses_positive');
    }
    return null;
  };

  const getExpirationError = (): string | null => {
    if (!expiresAt) return null;
    const expDate = new Date(expiresAt);
    if (expDate <= new Date()) {
      return t('coupon_validation_expiration_future');
    }
    return null;
  };

  const valueError = getValueError();
  const maxUsesError = getMaxUsesError();
  const expirationError = getExpirationError();

  const isFormValid =
    value !== '' &&
    expiresAt !== '' &&
    maxUses !== '' &&
    !valueError &&
    !maxUsesError &&
    !expirationError;

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleTypeChange = (newType: CouponType) => {
    setType(newType);
    setValue('');
    setCreatedCoupon(null);
    setError(null);
  };

  const handleCreate = async () => {
    if (!isFormValid) return;
    setCreating(true);
    setError(null);
    setCreatedCoupon(null);

    try {
      const coupon = await couponService.createCoupon({
        type,
        value: Number(value),
        expires_at: new Date(expiresAt).toISOString(),
        max_uses: Number(maxUses),
        created_by: adminId,
      });
      setCreatedCoupon(coupon);
      onCouponCreated(coupon);
      // Reset form fields
      setValue('');
      setExpiresAt('');
      setMaxUses('');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('coupon_error_creating'));
    } finally {
      setCreating(false);
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────────

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '0.35rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle,
    border: '1px solid #dc2626',
  };

  const errorTextStyle: React.CSSProperties = {
    color: '#dc2626',
    fontSize: '0.75rem',
    marginTop: '0.25rem',
  };

  const typeButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '0.625rem 0.875rem',
    border: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
    borderRadius: 8,
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
    transition: 'all 0.15s ease',
  });

  // ── Minimum date for expiration (tomorrow) ──────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Type selector */}
      <div>
        <label style={labelStyle}>{t('coupon_type_label')}</label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            style={typeButtonStyle(type === 'time')}
            onClick={() => handleTypeChange('time')}
          >
            {t('coupon_type_time')}
          </button>
          <button
            type="button"
            style={typeButtonStyle(type === 'percentage')}
            onClick={() => handleTypeChange('percentage')}
          >
            {t('coupon_type_percentage')}
          </button>
        </div>
      </div>

      {/* Value field */}
      <div>
        <label style={labelStyle}>
          {type === 'time' ? t('coupon_days') : t('coupon_percentage')}
        </label>
        <input
          type="number"
          style={valueError ? inputErrorStyle : inputStyle}
          value={value}
          onChange={e => { setValue(e.target.value); setCreatedCoupon(null); setError(null); }}
          placeholder={type === 'time' ? '30' : '25'}
          min={type === 'time' ? 1 : 1}
          max={type === 'percentage' ? 100 : undefined}
        />
        {valueError && <p style={errorTextStyle}>{valueError}</p>}
      </div>

      {/* Expiration date */}
      <div>
        <label style={labelStyle}>{t('coupon_expiration')}</label>
        <input
          type="date"
          style={expirationError ? inputErrorStyle : inputStyle}
          value={expiresAt}
          onChange={e => { setExpiresAt(e.target.value); setCreatedCoupon(null); setError(null); }}
          min={minDate}
        />
        {expirationError && <p style={errorTextStyle}>{expirationError}</p>}
      </div>

      {/* Max uses */}
      <div>
        <label style={labelStyle}>{t('coupon_max_uses')}</label>
        <input
          type="number"
          style={maxUsesError ? inputErrorStyle : inputStyle}
          value={maxUses}
          onChange={e => { setMaxUses(e.target.value); setCreatedCoupon(null); setError(null); }}
          placeholder="100"
          min={1}
        />
        {maxUsesError && <p style={errorTextStyle}>{maxUsesError}</p>}
      </div>

      {/* Error message */}
      {error && (
        <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{error}</p>
      )}

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={!isFormValid || creating}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: isFormValid && !creating ? 'var(--primary)' : '#9ca3af',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          cursor: isFormValid && !creating ? 'pointer' : 'not-allowed',
          opacity: creating ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'background 0.15s ease',
        }}
      >
        {creating && <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />}
        {creating ? t('coupon_creating') : t('coupon_create')}
      </button>

      {/* Generated code display */}
      {createdCoupon && (
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #86EFAC',
          borderRadius: 8,
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <CheckCircle size={20} color="#15803d" />
          <div>
            <p style={{ fontWeight: 700, color: '#15803d', margin: 0, fontSize: '0.85rem' }}>
              {t('coupon_code_generated')}
            </p>
            <p style={{
              fontFamily: 'monospace',
              fontSize: '1.1rem',
              fontWeight: 700,
              margin: '0.25rem 0 0 0',
              letterSpacing: '0.05em',
              color: '#166534',
              userSelect: 'all',
            }}>
              {createdCoupon.code}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponCreateForm;
