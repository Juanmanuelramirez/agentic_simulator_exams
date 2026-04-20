import { useState } from 'react';
import type { OrgMember } from '../types';
import InviteUserModal from './InviteUserModal';
import { Search, Users, UserPlus, Mail, Phone, Calendar } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface StudentListProps {
  orgId: string;
  members: OrgMember[];
  onMemberAdded: () => void;
}

const StudentList: React.FC<StudentListProps> = ({ orgId, members, onMemberAdded }) => {
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { t } = useLanguage();

  // Filter to students only (role='user')
  const students = members.filter(m => m.role === 'user');

  // Apply search filter by name or email
  const filtered = students.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  const handleInviteSuccess = () => {
    setShowInviteModal(false);
    onMemberAdded();
  };

  // ── Styles (matching OrgManagement.tsx patterns) ──────────────────────────

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} /> {t('org_students_title')}
          <span style={badgeStyle}>{students.length}</span>
        </h3>
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          <UserPlus size={15} /> {t('org_invite_student_btn')}
        </button>
      </div>

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
          {students.length === 0 ? t('org_no_students') : t('org_no_search_results')}
        </p>
      ) : (
        filtered.map(student => (
          <div key={student.user_id} style={cardStyle}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 0.25rem', fontWeight: 600, fontSize: '0.95rem' }}>
                {student.full_name}
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={metaStyle}>
                  <Mail size={13} /> {student.email}
                </span>
                {student.phone && (
                  <span style={metaStyle}>
                    <Phone size={13} /> {student.phone}
                  </span>
                )}
                <span style={metaStyle}>
                  <Calendar size={13} /> {new Date(student.joined_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Invite Student Modal */}
      <InviteUserModal
        orgId={orgId}
        role="user"
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
};

export default StudentList;
