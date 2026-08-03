import { useState, useEffect } from 'react';
import { adminAccessService } from '../services/adminAccessService';
import type { IndividualStudentInfo } from '../services/adminAccessService';
import { useLanguage } from './LanguageContext';
import { Search, Users, Mail, Calendar, Shield, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

const AdminStudentList: React.FC = () => {
  const [students, setStudents] = useState<IndividualStudentInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await adminAccessService.getIndividualStudents();
      setStudents(data);
    } catch {
      setError(t('admin_toggle_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (userId: string, enabled: boolean) => {
    setTogglingIds(prev => new Set(prev).add(userId));
    setError(null);
    try {
      await adminAccessService.toggleFreeAccess(userId, enabled);
      setStudents(prev =>
        prev.map(s =>
          s.user_id === userId
            ? { ...s, admin_free_access: enabled, subscription_status: enabled ? 'active' : s.subscription_status }
            : s
        )
      );
    } catch (err) {
      const message = err instanceof Error && err.message.includes('organización')
        ? t('admin_toggle_org_user_error')
        : t('admin_toggle_error');
      setError(message);
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const filtered = students.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  // ── Styles (matching StudentList.tsx patterns) ──────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.75rem 0.625rem 2.25rem',
    border: '1px solid var(--border)',
    borderRadius: 8,
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    boxSizing: 'border-box' as const,
  };

  const badgeStyle: React.CSSProperties = {
    background: 'var(--primary)',
    color: '#fff',
    borderRadius: 12,
    padding: '0.125rem 0.625rem',
    fontSize: '0.8rem',
    fontWeight: 600,
  };

  const metaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  };

  const statusBadge = (status: string, isFreeAccess: boolean): React.CSSProperties => {
    let bg = 'var(--border)';
    let color = 'var(--text-secondary)';
    if (isFreeAccess) {
      bg = '#10b981';
      color = '#fff';
    } else if (status === 'active') {
      bg = '#10b981';
      color = '#fff';
    } else if (status === 'trial') {
      bg = '#3b82f6';
      color = '#fff';
    } else if (status === 'expired' || status === 'cancelled') {
      bg = '#ef4444';
      color = '#fff';
    } else if (status === 'grace_period') {
      bg = '#f59e0b';
      color = '#fff';
    }
    return {
      borderRadius: 12,
      padding: '0.125rem 0.625rem',
      fontSize: '0.75rem',
      fontWeight: 600,
      background: bg,
      color,
    };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem', gap: '0.5rem', color: 'var(--text-secondary)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        {t('loading')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} /> {t('admin_students')}
          <span style={badgeStyle}>{students.length}</span>
        </h3>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', color: '#dc2626', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
        />
        <input
          style={inputStyle}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('org_search_placeholder')}
        />
      </div>

      {/* Student list */}
      {filtered.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>
          {students.length === 0 ? t('admin_no_individual_students') : t('org_no_search_results')}
        </p>
      ) : (
        filtered.map(student => (
          <div key={student.user_id} style={cardStyle}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                  {student.full_name}
                </p>
                <span style={statusBadge(student.subscription_status, student.admin_free_access)}>
                  {student.admin_free_access ? t('admin_free_access_label') : student.subscription_status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={metaStyle}>
                  <Mail size={13} /> {student.email}
                </span>
                {student.last_access && (
                  <span style={metaStyle}>
                    <Calendar size={13} /> {new Date(student.last_access).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <Shield size={14} style={{ color: 'var(--text-secondary)' }} />
              <button
                onClick={() => handleToggle(student.user_id, !student.admin_free_access)}
                disabled={togglingIds.has(student.user_id)}
                title={student.admin_free_access ? t('admin_free_access_toggle_on') : t('admin_free_access_toggle_off')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: togglingIds.has(student.user_id) ? 'wait' : 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  opacity: togglingIds.has(student.user_id) ? 0.5 : 1,
                }}
              >
                {togglingIds.has(student.user_id) ? (
                  <Loader2 size={24} style={{ color: 'var(--text-secondary)', animation: 'spin 1s linear infinite' }} />
                ) : student.admin_free_access ? (
                  <ToggleRight size={28} style={{ color: '#10b981' }} />
                ) : (
                  <ToggleLeft size={28} style={{ color: 'var(--text-secondary)' }} />
                )}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminStudentList;
