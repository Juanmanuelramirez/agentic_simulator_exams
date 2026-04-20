import { useState } from 'react';
import { inviteUser } from '../services/invitationService';
import { addMember } from '../services/organizationService';
import type { OrgMember } from '../types';
import { X, Loader2, UserPlus, Mail, User, Phone, FileText } from 'lucide-react';
import { useLanguage } from './LanguageContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteUserModalProps {
  orgId: string;
  role: 'org_admin' | 'user';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface InviteFormData {
  email: string;
  full_name: string;
  description: string;
  phone: string;
}

const emptyForm: InviteFormData = { email: '', full_name: '', description: '', phone: '' };

function validateInviteForm(form: InviteFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.email || !EMAIL_REGEX.test(form.email)) {
    errors.email = 'org_invite_email_invalid';
  }
  if (!form.full_name || form.full_name.trim().length === 0) {
    errors.full_name = 'org_invite_fullname_required';
  }
  return errors;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ orgId, role, isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState<InviteFormData>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

  if (!isOpen) return null;

  const roleLabel = role === 'org_admin' ? t('org_invite_org_admin') : t('org_invite_student');

  const handleClose = () => {
    setForm(emptyForm);
    setFieldErrors({});
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    const errors = validateInviteForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError(null);

    try {
      // 1. Create Cognito user via invitation service
      const result = await inviteUser({
        email: form.email,
        full_name: form.full_name,
        role,
        org_id: orgId,
        description: form.description || undefined,
        phone: form.phone || undefined,
      });

      // 2. Add member to organization record
      const member: OrgMember = {
        user_id: result.user_id,
        email: form.email,
        full_name: form.full_name,
        role,
        description: form.description || undefined,
        phone: form.phone || undefined,
        joined_at: new Date().toISOString(),
      };
      await addMember(orgId, member);

      // 3. Reset and notify success
      setForm(emptyForm);
      setFieldErrors({});
      setError(null);
      onSuccess();
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes('ya está registrado') || e.name === 'UsernameExistsException')) {
        setError(t('org_invite_email_exists'));
      } else {
        setError(e instanceof Error ? e.message : t('org_invite_error'));
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Styles (matching OrgManagement.tsx patterns) ──────────────────────────

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '480px',
    position: 'relative',
    maxHeight: '90vh',
    overflowY: 'auto',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid var(--border)',
    borderRadius: 8,
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    marginBottom: '0.25rem',
    fontWeight: 600,
    fontSize: '0.85rem',
  };

  const errorTextStyle: React.CSSProperties = {
    color: '#dc2626',
    fontSize: '0.8rem',
    marginTop: '0.25rem',
  };

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={20} /> {roleLabel}
        </h3>

        {/* Global error */}
        {error && (
          <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0 0 1rem', padding: '0.5rem 0.75rem', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Email */}
          <div>
            <label style={labelStyle}><Mail size={14} /> {t('org_invite_email_label')}</label>
            <input
              style={{ ...inputStyle, borderColor: fieldErrors.email ? '#dc2626' : 'var(--border)' }}
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder={t('org_invite_email_placeholder')}
            />
            {fieldErrors.email && <p style={errorTextStyle}>{t(fieldErrors.email)}</p>}
          </div>

          {/* Full Name */}
          <div>
            <label style={labelStyle}><User size={14} /> {t('org_invite_fullname_label')}</label>
            <input
              style={{ ...inputStyle, borderColor: fieldErrors.full_name ? '#dc2626' : 'var(--border)' }}
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder={t('org_invite_fullname_placeholder')}
            />
            {fieldErrors.full_name && <p style={errorTextStyle}>{t(fieldErrors.full_name)}</p>}
          </div>

          {/* Description (optional) */}
          <div>
            <label style={labelStyle}><FileText size={14} /> {t('org_invite_description_label')}</label>
            <textarea
              style={{ ...inputStyle, minHeight: '3rem', resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={t('org_invite_description_placeholder')}
            />
          </div>

          {/* Phone (optional) */}
          <div>
            <label style={labelStyle}><Phone size={14} /> {t('org_invite_phone_label')}</label>
            <input
              style={inputStyle}
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder={t('org_invite_phone_placeholder')}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClose}
            style={{
              padding: '0.625rem 1.25rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '0.625rem 1.25rem',
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {saving && <Loader2 size={14} style={{ animation: 'spin 0.9s linear infinite' }} />}
            {t('org_invite_send')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteUserModal;
