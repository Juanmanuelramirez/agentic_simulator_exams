import React, { useState, useMemo } from 'react';
import { Settings, Save, AlertTriangle, BookOpen, Info } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { classifyExamChange } from '../services/subscriptionService';
import SlotIndicator from './SlotIndicator';
import ExamSelector from './ExamSelector';
import type { Subscription, Exam } from '../types';

interface MySimulatorsProps {
  subscription: Subscription;
  exams: Exam[];
  isAdminFreeAccess: boolean;
  onSave: (newIds: string[]) => Promise<void>;
}

const MAX_EXAMS = 3;

const MySimulators: React.FC<MySimulatorsProps> = ({
  subscription,
  exams,
  isAdminFreeAccess,
  onSave,
}) => {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [tempSelection, setTempSelection] = useState<string[]>(subscription.selected_exam_ids);
  const [isSaving, setIsSaving] = useState(false);

  const currentExams = useMemo(
    () => exams.filter((e) => subscription.selected_exam_ids.includes(e.id)),
    [exams, subscription.selected_exam_ids],
  );

  const changeType = useMemo(
    () => classifyExamChange(subscription.selected_exam_ids, tempSelection),
    [subscription.selected_exam_ids, tempSelection],
  );

  const hasChanges = useMemo(() => {
    if (tempSelection.length !== subscription.selected_exam_ids.length) return true;
    return !tempSelection.every((id) => subscription.selected_exam_ids.includes(id));
  }, [tempSelection, subscription.selected_exam_ids]);

  const isChangeBlocked =
    !isAdminFreeAccess &&
    changeType === 'full_change' &&
    subscription.exam_change_used_this_period;

  const handleOpenEditor = () => {
    setTempSelection([...subscription.selected_exam_ids]);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!hasChanges || isChangeBlocked) return;
    setIsSaving(true);
    try {
      await onSave(tempSelection);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={containerStyle} className="animate-fade-in">
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={22} color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
            {t('mySimulators')}
          </h2>
        </div>
        <SlotIndicator current={subscription.selected_exam_ids.length} max={MAX_EXAMS} />
      </header>

      {/* Currently selected exams */}
      <section style={selectedExamsSectionStyle}>
        {currentExams.map((exam) => (
          <div key={exam.id} style={examCardStyle}>
            <div style={examProviderBadgeStyle}>{exam.provider}</div>
            <h4 style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: 700 }}>
              {exam.name}
            </h4>
            {exam.description && (
              <p style={examDescStyle}>{exam.description}</p>
            )}
            <div style={examMetaStyle}>
              {exam.domains?.length > 0 && (
                <span style={metaItemStyle}>{exam.domains.length} {t('domains')}</span>
              )}
              {exam.duration_minutes > 0 && (
                <span style={metaItemStyle}>{exam.duration_minutes} min</span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Manage button */}
      {!isEditing && (
        <button onClick={handleOpenEditor} style={manageButtonStyle}>
          <Settings size={16} />
          {t('manageSimulators')}
        </button>
      )}

      {/* Editing mode: ExamSelector */}
      {isEditing && (
        <div style={editorSectionStyle}>
          <ExamSelector
            exams={exams}
            selectedIds={tempSelection}
            onSelectionChange={setTempSelection}
            maxSelection={MAX_EXAMS}
            mode="manage"
            minSelection={1}
          />

          {/* Change type indicator */}
          {hasChanges && (
            <div
              style={{
                ...changeInfoStyle,
                background:
                  changeType === 'add_to_slots'
                    ? 'rgba(16,185,129,0.08)'
                    : 'rgba(245,158,11,0.08)',
                borderColor:
                  changeType === 'add_to_slots'
                    ? 'rgba(16,185,129,0.2)'
                    : 'rgba(245,158,11,0.2)',
              }}
            >
              <Info size={14} />
              <span>
                {changeType === 'add_to_slots'
                  ? t('addingToSlots')
                  : t('changingExams')}
              </span>
            </div>
          )}

          {/* Warning: change already used this period */}
          {isChangeBlocked && (
            <div style={warningStyle}>
              <AlertTriangle size={16} />
              <span>{t('noChangeAvailable')}</span>
            </div>
          )}

          {/* Action buttons */}
          <div style={actionsRowStyle}>
            <button
              onClick={() => setIsEditing(false)}
              style={cancelButtonStyle}
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isChangeBlocked || isSaving}
              style={{
                ...saveButtonStyle,
                opacity: !hasChanges || isChangeBlocked || isSaving ? 0.5 : 1,
                cursor: !hasChanges || isChangeBlocked || isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={16} />
              {t('saveChanges')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 16,
  padding: '1.5rem',
  boxShadow: 'var(--shadow-sm)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.25rem',
  flexWrap: 'wrap',
  gap: '0.75rem',
};

const selectedExamsSectionStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: '1rem',
  marginBottom: '1.25rem',
};

const examCardStyle: React.CSSProperties = {
  background: 'var(--bg-card, #fff)',
  border: '1px solid var(--border-default)',
  borderRadius: 12,
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const examProviderBadgeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  color: 'var(--primary)',
  background: 'rgba(99,102,241,0.08)',
  padding: '0.2rem 0.6rem',
  borderRadius: 20,
  alignSelf: 'flex-start',
};

const examDescStyle: React.CSSProperties = {
  margin: '0.25rem 0 0',
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.4,
};

const examMetaStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  marginTop: '0.5rem',
};

const metaItemStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  fontWeight: 500,
};

const manageButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.65rem 1.25rem',
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const editorSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  marginTop: '0.5rem',
};

const changeInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.6rem 0.85rem',
  borderRadius: 8,
  fontSize: '0.85rem',
  fontWeight: 500,
  border: '1px solid',
};

const warningStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.65rem 0.85rem',
  background: 'rgba(239,68,68,0.08)',
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: 8,
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--error)',
};

const actionsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  marginTop: '0.25rem',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '0.6rem 1.25rem',
  background: 'transparent',
  border: '1px solid var(--border-default)',
  borderRadius: 10,
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
};

const saveButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.6rem 1.25rem',
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontWeight: 600,
  fontSize: '0.875rem',
  transition: 'opacity 0.2s',
};

export default MySimulators;
