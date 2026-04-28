import { useState } from 'react';
import { CheckSquare, Square, BookOpen, AlertCircle, Lock } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import type { Exam } from '../types';

interface ExamSelectorProps {
  exams: Exam[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  maxSelection: number;
  mode?: 'onboarding' | 'add' | 'manage';
  lockedIds?: string[];
  minSelection?: number;
}

const ExamSelector: React.FC<ExamSelectorProps> = ({
  exams,
  selectedIds,
  onSelectionChange,
  maxSelection,
  mode = 'onboarding',
  lockedIds = [],
  minSelection = 1,
}) => {
  const { t } = useLanguage();
  const isMaxReached = selectedIds.length >= maxSelection;
  const [showMinWarning, setShowMinWarning] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const renderPlaceholder = (provider: string) => (
    <div style={placeholderStyle}>
      {provider}
    </div>
  );

  const handleToggle = (examId: string) => {
    // In add mode, locked exams cannot be toggled
    if (mode === 'add' && lockedIds.includes(examId)) {
      return;
    }

    if (selectedIds.includes(examId)) {
      // Deselecting: in manage mode, enforce minSelection
      if (mode === 'manage' && selectedIds.length <= minSelection) {
        setShowMinWarning(true);
        setTimeout(() => setShowMinWarning(false), 3000);
        return;
      }
      onSelectionChange(selectedIds.filter((id) => id !== examId));
    } else if (!isMaxReached) {
      onSelectionChange([...selectedIds, examId]);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <BookOpen size={20} color="var(--primary)" />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
          {t('sub_select_exams')}
        </h3>
      </div>

      {/* Counter */}
      <div style={counterContainerStyle}>
        <span style={{
          ...counterBadgeStyle,
          background: isMaxReached ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
          color: isMaxReached ? 'var(--error)' : 'var(--primary)',
          borderColor: isMaxReached ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)',
        }}>
          {t('sub_selected_count', { n: selectedIds.length, max: maxSelection })}
        </span>
        {isMaxReached && (
          <span style={maxReachedStyle}>
            <AlertCircle size={14} />
            {t('sub_max_reached')}
          </span>
        )}
        {selectedIds.length === 0 && (
          <span style={minRequiredStyle}>
            {t('sub_min_required')}
          </span>
        )}
      </div>

      {/* Min selection warning for manage mode */}
      {showMinWarning && mode === 'manage' && (
        <div style={minWarningStyle}>
          <AlertCircle size={14} />
          {t('minOneRequired')}
        </div>
      )}

      {/* Exam list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {exams.filter((e) => e.is_active).map((exam) => {
          const selected = selectedIds.includes(exam.id);
          const isLocked = mode === 'add' && lockedIds.includes(exam.id);
          const disabled = isLocked || (!selected && isMaxReached);

          const hasImage = !!exam.image_url && !failedImages.has(exam.id);

          return (
            <div
              key={exam.id}
              role="checkbox"
              aria-checked={selected}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && handleToggle(exam.id)}
              onKeyDown={(e) => {
                if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
                  e.preventDefault();
                  handleToggle(exam.id);
                }
              }}
              style={{
                ...examCardStyle,
                background: selected ? 'rgba(99,102,241,0.06)' : 'transparent',
                borderColor: selected ? 'var(--primary)' : 'var(--border)',
                opacity: disabled ? 0.45 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {/* Exam image or placeholder */}
              {hasImage ? (
                <img
                  src={exam.image_url}
                  alt={exam.name}
                  loading="lazy"
                  onError={() => setFailedImages(prev => new Set(prev).add(exam.id))}
                  style={examImageStyle}
                />
              ) : (
                renderPlaceholder(exam.provider)
              )}

              {/* Checkbox + text content */}
              <div style={examContentRowStyle}>
                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  {isLocked ? (
                    <Lock size={18} color="var(--text-secondary)" />
                  ) : selected ? (
                    <CheckSquare size={18} color="var(--primary)" />
                  ) : (
                    <Square size={18} color={disabled ? 'var(--border)' : 'var(--text-secondary)'} />
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{exam.name}</p>
                  <p style={{ margin: '0.15rem 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {exam.provider}
                    {exam.duration_minutes ? ` · ${exam.duration_minutes} min` : ''}
                    {exam.domains?.length ? ` · ${exam.domains.length} ${t('domains')}` : ''}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

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

const counterContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '1rem',
  flexWrap: 'wrap',
};

const counterBadgeStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  padding: '0.25rem 0.75rem',
  borderRadius: 20,
  fontWeight: 600,
  border: '1px solid',
};

const maxReachedStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  fontSize: '0.8rem',
  color: 'var(--error)',
  fontWeight: 500,
};

const minRequiredStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
  fontStyle: 'italic',
};

const minWarningStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  fontSize: '0.8rem',
  color: 'var(--error)',
  fontWeight: 500,
  marginBottom: '0.75rem',
  padding: '0.5rem 0.75rem',
  background: 'rgba(239,68,68,0.08)',
  borderRadius: 6,
};

const examCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 8,
  border: '1px solid var(--border)',
  transition: 'background 0.15s, border-color 0.15s',
  overflow: 'hidden',
};

const examContentRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem',
};

const examImageStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '16/9',
  objectFit: 'cover',
  display: 'block',
};

const placeholderStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '16/9',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontWeight: 700,
  fontSize: '0.9rem',
  letterSpacing: '0.5px',
};

export default ExamSelector;
