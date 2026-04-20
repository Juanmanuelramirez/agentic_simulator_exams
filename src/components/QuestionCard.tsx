import React from 'react';
import type { Question } from '../types';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface QuestionCardProps {
  question: Question;
  onAnswer: (selectedIds: string[]) => void;
  isVerified?: boolean;
  userSelectedIds?: string[];
  isMarkedForReview?: boolean;
  onToggleReview?: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAnswer,
  isVerified = false,
  userSelectedIds = [],
  isMarkedForReview = false,
  onToggleReview
}) => {
  const [localSelected, setLocalSelected] = React.useState<string[]>(userSelectedIds);
  const { t } = useLanguage();

  // Reset selection when the question changes
  React.useEffect(() => {
    setLocalSelected(userSelectedIds);
  }, [question.id, userSelectedIds]);

  const toggleOption = (id: string) => {
    if (isVerified) return;

    let newSelected: string[];
    if (question.type === 'single_select') {
      newSelected = [id];
    } else {
      newSelected = localSelected.includes(id)
        ? localSelected.filter(i => i !== id)
        : [...localSelected, id];
    }
    setLocalSelected(newSelected);
    onAnswer(newSelected);
  };

  const isCorrect = (id: string) => question.correct_ids.includes(id);
  const isSelected = (id: string) => localSelected.includes(id);

  return (
    <div className="question-card animate-fade-in">
      {question.domain && (
        <div className="mb-2">
          <div className="badge-indigo">
            <Info size={14} />
            <span>{question.domain}</span>
          </div>
        </div>
      )}

      <div className="question-header flex-between mb-2">
        <h2 className="question-text">{question.question_text}</h2>
        {onToggleReview && (
          <button
            onClick={onToggleReview}
            className={`bookmark-btn ${isMarkedForReview ? 'active' : ''}`}
            title="Marcar para revisión posterior"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24" height="24"
              viewBox="0 0 24 24"
              fill={isMarkedForReview ? "#fb923c" : "none"}
              stroke={isMarkedForReview ? "#fb923c" : "currentColor"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
          </button>
        )}
      </div>

      <div className="question-instruction mb-2">
        {question.type === 'single_select'
          ? `📝 ${t('selectOne')}`
          : `📝 ${t('selectMultiple', { n: question.correct_ids.length })}`}
      </div>

      <div className="options-container v-stack">
        {question.options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const selected = isSelected(option.id);
          const correct = isCorrect(option.id);

          let statusClass = '';
          if (selected) statusClass = 'selected';
          if (isVerified) {
            if (correct) statusClass = 'verified-correct';
            else if (selected && !correct) statusClass = 'verified-incorrect';
          }

          return (
            <button
              key={option.id}
              onClick={() => toggleOption(option.id)}
              disabled={isVerified}
              className={`option-row ${statusClass}`}
            >
              <div className="option-letter">{letter}</div>
              <span className="option-label">{option.text}</span>
              {isVerified && correct && <CheckCircle size={20} className="status-icon success" />}
              {isVerified && selected && !correct && <XCircle size={20} className="status-icon error" />}
            </button>
          );
        })}
      </div>

      {isVerified && (
        <div className="official-explanation mt-3 animate-fade-in">
          <div className="explanation-header mb-1 flex items-center gap-2">
            <Info size={20} className="text-primary" />
            <h3 className="m-0">{t('officialExplanation')}</h3>
          </div>
          <p className="explanation-summary mb-2">{question.explanation}</p>
          {question.why_correct && (
            <div className="why-correct-box mb-2">
              <strong style={{ color: '#059669' }}>✅ {t('whyCorrect')}:</strong>
              <p style={{ margin: '0.25rem 0 0', lineHeight: 1.6, color: '#475569' }}>{question.why_correct}</p>
            </div>
          )}
          {question.why_incorrect && question.why_incorrect.length > 0 && (
            <div className="why-incorrect-box">
              <strong style={{ color: '#dc2626' }}>❌ {t('whyIncorrect')}:</strong>
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', lineHeight: 1.6, color: '#475569' }}>
                {question.why_incorrect.map((reason, i) => (
                  <li key={i} style={{ marginBottom: '0.25rem' }}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style>{`
                .question-card { width: 100%; max-width: 900px; margin: 0 auto; padding: 2rem 0; }
                .question-text { font-size: 1.5rem; font-weight: 700; line-height: 1.4; color: #1e293b; margin: 0; flex: 1; }
                .question-instruction { font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.03em; margin-top: 2rem; padding: 0.5rem 1rem; border-radius: 8px; display: inline-block; }
                .question-card:has(.question-instruction) .question-instruction { background: #eff6ff; color: #4f46e5; border: 1px solid rgba(79, 70, 229, 0.15); }
                
                .options-container.v-stack { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
                
                .option-row {
                    width: 100%; display: flex; align-items: center; gap: 1.25rem;
                    padding: 1rem 1.5rem; border-radius: 12px;
                    border: 1px solid #e2e8f0; background: white;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); text-align: left;
                    min-height: 64px; cursor: pointer;
                    color: inherit;
                }
                
                .option-row:hover:not(:disabled) { border-color: var(--primary); background: #f8fafc; }
                .option-row.selected { border-color: var(--primary); border-width: 2px; padding: calc(1rem - 1px) calc(1.5rem - 1px); }
                
                .option-letter {
                    width: 32px; height: 32px; border-radius: 50%;
                    border: 1px solid #e2e8f0;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 700; font-size: 0.8125rem; color: #64748b;
                    background: white; flex-shrink: 0;
                }
                
                .option-row.selected .option-letter { border-color: var(--primary); color: var(--primary); background: #eff6ff; }
                .option-label { flex: 1; font-size: 1rem; color: #334155; font-weight: 500; }
                
                /* Verification */
                .option-row.verified-correct { border-color: var(--success); background: #f0fdf4; border-width: 2px; }
                .option-row.verified-incorrect { border-color: var(--error); background: #fef2f2; border-width: 2px; }
                .option-row.verified-correct .option-letter { border-color: var(--success); color: var(--success); }
                .option-row.verified-incorrect .option-letter { border-color: var(--error); color: var(--error); }

                /* Explanation */
                .official-explanation {
                    background: #f8fafc; border: 1px dashed var(--primary); border-radius: 16px; padding: 2rem;
                }
                .official-explanation h3 { color: #1e293b; font-size: 1.125rem; font-weight: 700; }
                .explanation-summary { line-height: 1.6; color: #475569; font-size: 0.9375rem; }
                
                .bookmark-btn {
                    background: none; border: none; cursor: pointer; color: #94a3b8;
                    padding: 0.5rem; border-radius: 50%; transition: all 0.2s;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .bookmark-btn:hover { background: #f1f5f9; color: var(--secondary); }
                .bookmark-btn.active { color: var(--secondary); }
                
                .flex-between { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
                .mb-1 { margin-bottom: 0.5rem; }
                .mb-2 { margin-bottom: 1rem; }
                .mt-3 { margin-top: 1.5rem; }
                .items-center { align-items: center; }
                .gap-2 { gap: 0.5rem; }
                .m-0 { margin: 0; }
            `}</style>
    </div>
  );
};

export default QuestionCard;
