import { useState } from 'react';
import { useLanguage } from './LanguageContext';
import { Loader2, XCircle } from 'lucide-react';
import type { Coupon, CouponType, CouponStatus } from '../types';

interface CouponListProps {
  coupons: Coupon[];
  onDeactivate: (code: string) => void;
}

type FilterType = 'all' | 'time' | 'percentage';
type FilterStatus = 'all' | 'active' | 'inactive';

export function filterCoupons(
  coupons: Coupon[],
  filterType: FilterType,
  filterStatus: FilterStatus
): Coupon[] {
  return coupons.filter(coupon => {
    const matchesType = filterType === 'all' || coupon.type === filterType;
    const matchesStatus = filterStatus === 'all' || coupon.status === filterStatus;
    return matchesType && matchesStatus;
  });
}

const CouponList: React.FC<CouponListProps> = ({ coupons, onDeactivate }) => {
  const { t } = useLanguage();

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [deactivatingCodes, setDeactivatingCodes] = useState<Set<string>>(new Set());

  const filtered = filterCoupons(coupons, filterType, filterStatus);

  const handleDeactivate = async (code: string) => {
    setDeactivatingCodes(prev => new Set(prev).add(code));
    try {
      await onDeactivate(code);
    } finally {
      setDeactivatingCodes(prev => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
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

  const selectStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: '0.85rem',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '0.625rem 0.75rem',
    borderBottom: '2px solid var(--border)',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.625rem 0.75rem',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  };

  const statusBadge = (status: CouponStatus): React.CSSProperties => ({
    display: 'inline-block',
    borderRadius: 12,
    padding: '0.125rem 0.625rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: status === 'active' ? '#10b981' : 'var(--border)',
    color: status === 'active' ? '#fff' : 'var(--text-secondary)',
  });

  const typeBadge = (type: CouponType): React.CSSProperties => ({
    display: 'inline-block',
    borderRadius: 12,
    padding: '0.125rem 0.625rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: type === 'time' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)',
    color: type === 'time' ? '#3b82f6' : '#a855f7',
  });

  const deactivateButtonStyle = (isLoading: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.35rem 0.75rem',
    border: '1px solid #fecaca',
    borderRadius: 6,
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: isLoading ? 'wait' : 'pointer',
    background: '#fef2f2',
    color: '#dc2626',
    opacity: isLoading ? 0.6 : 1,
    transition: 'all 0.15s ease',
  });

  const formatDate = (isoDate: string): string => {
    try {
      return new Date(isoDate).toLocaleDateString();
    } catch {
      return isoDate;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
        {t('coupon_list_title')}
      </h3>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <label style={labelStyle}>{t('coupon_filter_type')}</label>
          <select
            style={selectStyle}
            value={filterType}
            onChange={e => setFilterType(e.target.value as FilterType)}
          >
            <option value="all">{t('coupon_all')}</option>
            <option value="time">{t('coupon_type_time')}</option>
            <option value="percentage">{t('coupon_type_percentage')}</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t('coupon_filter_status')}</label>
          <select
            style={selectStyle}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
          >
            <option value="all">{t('coupon_all')}</option>
            <option value="active">{t('coupon_status_active')}</option>
            <option value="inactive">{t('coupon_status_inactive')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p style={{
          color: 'var(--text-secondary)',
          textAlign: 'center',
          padding: '1.5rem 0',
          margin: 0,
        }}>
          {coupons.length === 0
            ? t('coupon_no_coupons')
            : t('coupon_no_results')}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t('coupon_code_generated')}</th>
                <th style={thStyle}>{t('coupon_filter_type')}</th>
                <th style={thStyle}>{t('coupon_value_label')}</th>
                <th style={thStyle}>{t('coupon_filter_status')}</th>
                <th style={thStyle}>{t('coupon_max_uses')}</th>
                <th style={thStyle}>{t('coupon_expiration')}</th>
                <th style={thStyle}>{t('coupon_created_at')}</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(coupon => (
                <tr key={coupon.code}>
                  <td style={tdStyle}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      letterSpacing: '0.03em',
                    }}>
                      {coupon.code}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={typeBadge(coupon.type)}>
                      {coupon.type === 'time' ? t('coupon_type_time') : t('coupon_type_percentage')}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {coupon.type === 'time'
                      ? `${coupon.value} ${t('coupon_days')}`
                      : `${coupon.value}%`}
                  </td>
                  <td style={tdStyle}>
                    <span style={statusBadge(coupon.status)}>
                      {coupon.status === 'active'
                        ? t('coupon_status_active')
                        : t('coupon_status_inactive')}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {coupon.current_uses} / {coupon.max_uses}
                  </td>
                  <td style={tdStyle}>
                    {formatDate(coupon.expires_at)}
                  </td>
                  <td style={tdStyle}>
                    {formatDate(coupon.created_at)}
                  </td>
                  <td style={tdStyle}>
                    {coupon.status === 'active' && (
                      <button
                        onClick={() => handleDeactivate(coupon.code)}
                        disabled={deactivatingCodes.has(coupon.code)}
                        style={deactivateButtonStyle(deactivatingCodes.has(coupon.code))}
                      >
                        {deactivatingCodes.has(coupon.code) ? (
                          <Loader2 size={13} style={{ animation: 'spin 0.9s linear infinite' }} />
                        ) : (
                          <XCircle size={13} />
                        )}
                        {t('coupon_deactivate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CouponList;
