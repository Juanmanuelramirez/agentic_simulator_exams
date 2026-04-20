import { useState, useEffect } from 'react';
import {
  getAvailableExams,
  assignExamsToOrg,
  removeExamFromOrg,
} from '../services/organizationService';
import type { Organization, Exam } from '../types';
import { Loader2, BookOpen, CheckSquare, Square } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface OrgExamAssignmentProps {
  organization: Organization;
  onUpdate: (updated: Organization) => void;
}

const OrgExamAssignment: React.FC<OrgExamAssignmentProps> = ({ organization, onUpdate }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const { t } = useLanguage();

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const available = await getAvailableExams();
      setExams(available);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('org_exam_load_error'));
    } finally {
      setLoading(false);
    }
  };

  const isAssigned = (examId: string): boolean => {
    return (organization.assigned_exam_ids || []).includes(examId);
  };

  const handleToggle = async (examId: string) => {
    if (togglingIds.has(examId)) return;

    setTogglingIds((prev) => new Set(prev).add(examId));
    setError(null);

    try {
      let updated: Organization;
      if (isAssigned(examId)) {
        updated = await removeExamFromOrg(organization.id, examId);
      } else {
        updated = await assignExamsToOrg(organization.id, [examId]);
      }
      onUpdate(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('org_exam_toggle_error'));
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(examId);
        return next;
      });
    }
  };

  const assignedCount = (organization.assigned_exam_ids || []).length;

  const containerStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1.25rem',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
  };

  const examRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  };

  const badgeStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    padding: '0.15rem 0.5rem',
    borderRadius: 12,
    background: 'var(--primary)',
    color: '#fff',
    fontWeight: 600,
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 size={28} style={{ animation: 'spin 0.9s linear infinite', color: 'var(--primary)' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <BookOpen size={18} color="var(--primary)" />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          {t('org_exam_assignment')}
        </h3>
        <span style={badgeStyle}>{assignedCount} {t('org_assigned')}</span>
      </div>

      {error && (
        <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{error}</p>
      )}

      {exams.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0', fontSize: '0.9rem' }}>
          {t('org_no_exams_available')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {exams.map((exam) => {
            const assigned = isAssigned(exam.id);
            const toggling = togglingIds.has(exam.id);

            return (
              <div
                key={exam.id}
                role="checkbox"
                aria-checked={assigned}
                tabIndex={0}
                onClick={() => handleToggle(exam.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    handleToggle(exam.id);
                  }
                }}
                style={{
                  ...examRowStyle,
                  background: assigned ? 'rgba(var(--primary-rgb, 59, 130, 246), 0.06)' : 'transparent',
                  opacity: toggling ? 0.6 : 1,
                  cursor: toggling ? 'not-allowed' : 'pointer',
                }}
              >
                {/* Checkbox icon */}
                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  {toggling ? (
                    <Loader2 size={18} style={{ animation: 'spin 0.9s linear infinite', color: 'var(--primary)' }} />
                  ) : assigned ? (
                    <CheckSquare size={18} color="var(--primary)" />
                  ) : (
                    <Square size={18} color="var(--text-secondary)" />
                  )}
                </span>

                {/* Exam info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{exam.name}</p>
                  <p style={{ margin: '0.15rem 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {exam.provider}
                    {exam.duration_minutes ? ` · ${exam.duration_minutes} min` : ''}
                    {exam.total_questions_official ? ` · ${exam.total_questions_official} questions` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrgExamAssignment;
