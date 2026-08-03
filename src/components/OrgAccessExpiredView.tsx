import { useState } from 'react';
import type { Organization } from '../types';
import { useLanguage } from './LanguageContext';
import { Building2, CreditCard, Mail } from 'lucide-react';

interface OrgAccessExpiredViewProps {
  organization: Organization;
  onSubscribeIndividually: () => void;
}

const OrgAccessExpiredView: React.FC<OrgAccessExpiredViewProps> = ({ organization, onSubscribeIndividually }) => {
  const { t } = useLanguage();
  const [showContact, setShowContact] = useState(false);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    padding: '2rem',
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '2.5rem 2rem',
    maxWidth: 480,
    width: '100%',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    alignItems: 'center',
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  };

  const messageStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  };

  const buttonBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    width: '100%',
    border: 'none',
  };

  const primaryButton: React.CSSProperties = {
    ...buttonBase,
    background: 'var(--primary)',
    color: '#fff',
  };

  const secondaryButton: React.CSSProperties = {
    ...buttonBase,
    background: 'transparent',
    color: 'var(--primary)',
    border: '1px solid var(--primary)',
  };

  const contactInfoStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '0.75rem 1rem',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    textAlign: 'left',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <Building2 size={40} style={{ color: 'var(--primary)' }} />

        <h2 style={titleStyle}>{t('org_access_expired_title')}</h2>

        <p style={messageStyle}>{t('org_access_expired_message')}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          <button
            onClick={() => setShowContact(!showContact)}
            style={secondaryButton}
          >
            <Mail size={16} />
            {t('org_access_contact_org')}
          </button>

          {showContact && (
            <div style={contactInfoStyle}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {t('org_access_contact_info')}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                <Mail size={14} style={{ color: 'var(--text-secondary)' }} />
                <span>{t('org_access_org_email')}: {organization.email}</span>
              </div>
            </div>
          )}

          <button
            onClick={onSubscribeIndividually}
            style={primaryButton}
          >
            <CreditCard size={16} />
            {t('org_access_subscribe_individual')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrgAccessExpiredView;
