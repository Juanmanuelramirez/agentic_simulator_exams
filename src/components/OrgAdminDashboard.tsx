import React from 'react';
import type { Exam, Organization } from '../types';
import { Building2, BookOpen, Clock, HelpCircle, Zap, Play } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface OrgAdminDashboardProps {
  exams: Exam[];
  organization: Organization;
  onStartExam?: (examId: string) => void;
}

const OrgAdminDashboard: React.FC<OrgAdminDashboardProps> = ({
  exams,
  organization,
  onStartExam,
}) => {
  const assignedExams = exams.filter((exam) =>
    organization.assigned_exam_ids.includes(exam.id)
  );

  const { t } = useLanguage();

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1.5rem',
    marginBottom: '1.25rem',
  };

  const logoStyle: React.CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: 12,
    objectFit: 'cover',
    border: '1px solid var(--border)',
    flexShrink: 0,
  };

  const logoPlaceholderStyle: React.CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: 12,
    background: 'rgba(99, 102, 241, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    transition: 'all 0.2s',
  };

  const badgeStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--primary)',
    background: 'rgba(99, 102, 241, 0.08)',
    padding: '0.25rem 0.75rem',
    borderRadius: 20,
  };

  const metaItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    margin: '0 0 1rem',
    fontSize: '1.1rem',
    fontWeight: 700,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Organization header */}
      <div style={headerStyle}>
        {organization.logo_url ? (
          <img
            src={organization.logo_url}
            alt={`${organization.name} logo`}
            style={logoStyle}
          />
        ) : (
          <div style={logoPlaceholderStyle}>
            <Building2 size={28} color="var(--primary)" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem' }}>
            {organization.name}
          </h2>
          {organization.description && (
            <p
              style={{
                margin: 0,
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
              }}
            >
              {organization.description}
            </p>
          )}
        </div>
      </div>

      {/* Assigned exams section */}
      <div>
        <h3 style={sectionTitleStyle}>
          <BookOpen size={18} color="var(--primary)" />
          {t('org_assigned_exams')}
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.15rem 0.5rem',
              borderRadius: 12,
              background: 'var(--primary)',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            {assignedExams.length}
          </span>
        </h3>

        {assignedExams.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '3rem 1.5rem',
              textAlign: 'center',
            }}
          >
            <BookOpen
              size={48}
              color="var(--text-secondary)"
              style={{ opacity: 0.4, marginBottom: '0.75rem' }}
            />
            <p
              style={{
                margin: 0,
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
              }}
            >
              {t('org_no_exams_assigned')}
            </p>
            <p
              style={{
                margin: '0.5rem 0 0',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                opacity: 0.7,
              }}
            >
              {t('org_contact_admin')}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {assignedExams.map((exam) => (
              <div key={exam.id} style={cardStyle}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={badgeStyle}>{exam.provider}</span>
                </div>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  {exam.name}
                </h4>
                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={metaItemStyle}>
                    <Clock size={13} /> {exam.duration_minutes} {t('org_min')}
                  </span>
                  <span style={metaItemStyle}>
                    <HelpCircle size={13} /> {exam.total_questions_official} {t('org_questions')}
                  </span>
                  <span style={metaItemStyle}>
                    <Zap size={13} /> {exam.domains.length} {t('org_domains')}
                  </span>
                </div>
                {onStartExam && (
                  <button
                    onClick={() => onStartExam(exam.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background: 'var(--primary)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.7rem',
                      borderRadius: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: 'auto',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <Play size={16} /> {t('org_start_exam')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgAdminDashboard;
