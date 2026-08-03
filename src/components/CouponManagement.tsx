import { useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { couponService } from '../services/couponService';
import CouponCreateForm from './CouponCreateForm';
import CouponList from './CouponList';
import { Loader2, Ticket } from 'lucide-react';
import type { Coupon } from '../types';

interface CouponManagementProps {
  adminId: string;
}

const CouponManagement: React.FC<CouponManagementProps> = ({ adminId }) => {
  const { t } = useLanguage();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await couponService.getAllCoupons();
      setCoupons(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCoupons(); }, []);

  const handleCouponCreated = async (_coupon: Coupon) => {
    await loadCoupons();
  };

  const handleDeactivate = async (code: string) => {
    try {
      await couponService.deactivateCoupon(code);
      await loadCoupons();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error deactivating coupon');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Ticket size={20} /> {t('coupon_title')}
        </h2>
      </div>

      {/* Global error */}
      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

      {/* Create Form */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
      }}>
        <h3 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('coupon_create')}</h3>
        <CouponCreateForm onCouponCreated={handleCouponCreated} adminId={adminId} />
      </div>

      {/* Coupon List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 size={32} style={{ animation: 'spin 0.9s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1.5rem',
        }}>
          <CouponList coupons={coupons} onDeactivate={handleDeactivate} />
        </div>
      )}
    </div>
  );
};

export default CouponManagement;
