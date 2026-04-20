import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import {
  createOrganization,
  getOrganizations,
  updateOrganization,
  deactivateOrganization,
} from '../services/organizationService';
import type { Organization } from '../types';
import type { CreateOrganizationInput, UpdateOrganizationInput } from '../services/organizationService';
import { Plus, Loader2, ToggleLeft, ToggleRight, Edit, Building2, X } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface OrgFormData {
  name: string;
  description: string;
  email: string;
  phone: string;
  logo_url: string;
}

const emptyForm: OrgFormData = { name: '', description: '', email: '', phone: '', logo_url: '' };

function validateForm(form: OrgFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name || form.name.length < 2) errors.name = 'org_name_min';
  else if (form.name.length > 100) errors.name = 'org_name_max';
  if (!form.email || !EMAIL_REGEX.test(form.email)) errors.email = 'org_email_invalid';
  return errors;
}

const OrgManagement: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [form, setForm] = useState<OrgFormData>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const list = await getOrganizations();
      setOrgs(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('org_load_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrgs(); }, []);

  const openCreateForm = () => {
    setEditingOrg(null);
    setForm(emptyForm);
    setFieldErrors({});
    setError(null);
    setShowForm(true);
  };

  const openEditForm = (org: Organization) => {
    setEditingOrg(org);
    setForm({
      name: org.name,
      description: org.description,
      email: org.email,
      phone: org.phone || '',
      logo_url: org.logo_url || '',
    });
    setFieldErrors({});
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingOrg(null);
    setForm(emptyForm);
    setFieldErrors({});
  };

  const handleSubmit = async () => {
    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      if (editingOrg) {
        const input: UpdateOrganizationInput = {
          name: form.name,
          description: form.description,
          email: form.email,
          phone: form.phone || undefined,
          logo_url: form.logo_url || undefined,
        };
        await updateOrganization(editingOrg.id, input);
      } else {
        const input: CreateOrganizationInput = {
          name: form.name,
          description: form.description,
          email: form.email,
          phone: form.phone || undefined,
          logo_url: form.logo_url || undefined,
          created_by: user?.id || '',
        };
        await createOrganization(input);
      }
      closeForm();
      await loadOrgs();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('org_save_error');
      if (msg.includes('already exists')) {
        setError(t('org_name_duplicate'));
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (org: Organization) => {
    setTogglingId(org.id);
    try {
      await deactivateOrganization(org.id);
      await loadOrgs();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('org_deactivate_error'));
    } finally {
      setTogglingId(null);
    }
  };

  // Access guard: only admin can manage organizations
  if (user?.role !== 'admin') {
    return <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('org_access_denied')}</p>;
  }

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
    display: 'block',
    marginBottom: '0.25rem',
    fontWeight: 600,
    fontSize: '0.85rem',
  };

  const errorTextStyle: React.CSSProperties = {
    color: '#dc2626',
    fontSize: '0.8rem',
    marginTop: '0.25rem',
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={20} /> {t('org_title')}
        </h2>
        {!showForm && (
          <button
            onClick={openCreateForm}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={16} /> {t('org_new')}
          </button>
        )}
      </div>

      {/* Global error */}
      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

      {/* Create / Edit Form */}
      {showForm && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', position: 'relative' }}>
          <button onClick={closeForm} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} aria-label="Close form">
            <X size={18} />
          </button>
          <h3 style={{ marginTop: 0 }}>{editingOrg ? t('org_edit') : t('org_new')}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>{t('org_name_label')}</label>
              <input
                style={{ ...inputStyle, borderColor: fieldErrors.name ? '#dc2626' : 'var(--border)' }}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t('org_name_placeholder')}
                maxLength={100}
              />
              {fieldErrors.name && <p style={errorTextStyle}>{fieldErrors.name === 'org_name_min' ? t('org_name_min') : t('org_name_max')}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>{t('org_email_label')}</label>
              <input
                style={{ ...inputStyle, borderColor: fieldErrors.email ? '#dc2626' : 'var(--border)' }}
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder={t('org_email_placeholder')}
              />
              {fieldErrors.email && <p style={errorTextStyle}>{t('org_email_invalid')}</p>}
            </div>

            {/* Description */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>{t('org_description_label')}</label>
              <textarea
                style={{ ...inputStyle, minHeight: '4rem', resize: 'vertical' }}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('org_description_placeholder')}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>{t('org_phone_label')}</label>
              <input
                style={inputStyle}
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder={t('org_phone_placeholder')}
              />
            </div>

            {/* Logo URL */}
            <div>
              <label style={labelStyle}>{t('org_logo_label')}</label>
              <input
                style={inputStyle}
                value={form.logo_url}
                onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                placeholder={t('org_logo_placeholder')}
              />
            </div>
          </div>

          {/* Form actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
            <button
              onClick={closeForm}
              style={{ padding: '0.625rem 1.25rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{ padding: '0.625rem 1.25rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {saving && <Loader2 size={14} style={{ animation: 'spin 0.9s linear infinite' }} />}
              {editingOrg ? t('org_update') : t('org_create')}
            </button>
          </div>
        </div>
      )}

      {/* Organization list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 size={32} style={{ animation: 'spin 0.9s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : orgs.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>{t('org_no_orgs')}</p>
      ) : (
        orgs.map(org => (
          <div key={org.id} style={{ ...cardStyle, opacity: org.is_active ? 1 : 0.55 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: '1rem' }}>
                {org.name}
                {!org.is_active && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 400 }}>{t('org_inactive')}</span>}
              </p>
              <p style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{org.description}</p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>{org.email}</span>
                {org.phone && <span>{org.phone}</span>}
                <span>{t('org_exams_count')}: <strong>{org.assigned_exam_ids?.length ?? 0}</strong></span>
                <span>{t('org_members_count')}: <strong>{org.members?.length ?? 0}</strong></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
              {/* Edit button */}
              <button
                onClick={() => openEditForm(org)}
                title="Edit"
                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Edit size={16} color="var(--text-secondary)" />
              </button>
              {/* Toggle active */}
              {org.is_active && (
                <button
                  onClick={() => handleToggleActive(org)}
                  disabled={togglingId === org.id}
                  title="Deactivate"
                  style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {togglingId === org.id
                    ? <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
                    : <ToggleRight size={18} color="#16a34a" />
                  }
                </button>
              )}
              {!org.is_active && (
                <span title="Inactive" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem' }}>
                  <ToggleLeft size={18} color="#9ca3af" />
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default OrgManagement;
