import React from 'react';
import type { Question } from '../types';
import { CheckCircle, XCircle, ExternalLink, Info } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  onAnswer: (selectedIds: string[]) => void;
  isVerified?: boolean;
  userSelectedIds?: string[];
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAnswer,
  isVerified = false,
  userSelectedIds = []
}) => {
  const [localSelected, setLocalSelected] = React.useState<string[]>(userSelectedIds);

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
      <div className="question-meta mb-2">
        <span className="metadata-text">{question.domain}</span>
        <span className="metadata-text">•</span>
        <span className="metadata-text">
          {question.type === 'single_select'
            ? 'Selección Única'
            : `Selección Múltiple ${!isVerified ? '(selecciona ' + question.correct_ids.length + ')' : ''}`}
        </span>
      </div>

      <h2 className="question-text mb-3">{question.question_text}</h2>

      <div className="options-container grid-2x2">
        {question.options.map((option, index) => {
          const letter = String.fromCharCode(65 + index); // A, B, C, D...
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
              className={`option-btn ${statusClass}`}
            >
              <div className="option-marker">
                {question.type === 'multi_select' ? (
                  <div className={`checkbox ${selected ? 'checked' : ''}`} />
                ) : (
                  <div className="letter-circle">{letter}</div>
                )}
              </div>
              <span className="option-label">{option.text}</span>
              {isVerified && correct && <CheckCircle size={20} className="status-icon success" />}
              {isVerified && selected && !correct && <XCircle size={20} className="status-icon error" />}
            </button>
          );
        })}
      </div>

      {isVerified && (
        <div className="official-explanation card bg-dark mt-3 animate-fade-in">
          <div className="explanation-header mb-1">
            <Info size={20} className="text-primary" />
            <h3>Explicación Oficial</h3>
          </div>
          <p className="explanation-summary mb-2">{question.explanation}</p>

          {question.official_link && (
            <a href={question.official_link} target="_blank" rel="noopener noreferrer" className="official-link">
              Fuentes: [ AWS Documentation ] <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      <style>{`
                .question-card { width: 100%; max-width: 800px; margin: 0 auto; }
                .question-meta { display: flex; gap: 0.75rem; align-items: center; }
                .metadata-text { font-size: 0.875rem; color: var(--text-secondary); font-weight: 500; }
                .question-text { font-size: 1.25rem; line-height: 1.5; color: var(--text-main); }
                
                .options-container { margin-top: 1.5rem; }
                .option-btn {
                    width: 100%; display: flex; align-items: center; gap: 1rem;
                    padding: 1.25rem; border-radius: var(--radius-xl);
                    border: 1px solid var(--border-default); background: var(--bg-surface);
                    backdrop-filter: var(--glass-blur);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); text-align: left;
                    min-height: 72px; color: var(--text-main);
                }
                .option-btn:hover:not(:disabled) { border-color: var(--primary); background: rgba(255, 255, 255, 0.05); transform: translateY(-2px); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); }
                .option-btn.selected { border-color: var(--primary); background: rgba(99, 102, 241, 0.1); box-shadow: 0 0 0 1px var(--primary); }
                
                .option-marker { flex-shrink: 0; padding-top: 2px; }
                .letter-circle {
                    width: 28px; height: 28px; border-radius: 50%;
                    border: 1px solid var(--border-default);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 700; font-size: 0.8125rem; color: var(--text-secondary);
                    background: var(--bg-main);
                }
                .option-btn.selected .letter-circle { background: var(--primary); color: white; border-color: var(--primary); }
                
                .checkbox {
                    width: 24px; height: 24px; border-radius: 6px;
                    border: 2px solid var(--border-default); background: rgba(255, 255, 255, 0.05);
                }
                .checkbox.checked { background: var(--primary); border-color: var(--primary); position: relative; }
                .checkbox.checked::after {
                    content: ''; position: absolute; left: 7px; top: 3px;
                    width: 6px; height: 11px; border: solid white;
                    border-width: 0 2px 2px 0; transform: rotate(45deg);
                }

                .option-label { flex: 1; font-size: 1rem; color: var(--text-main); font-weight: 500; line-height: 1.4; }
                
                /* Verification Styles */
                .option-btn.verified-correct { border-color: var(--success); background: rgba(16, 185, 129, 0.1); }
                .option-btn.verified-incorrect { border-color: var(--error); background: rgba(244, 63, 94, 0.1); }
                .status-icon.success { color: var(--success); }
                .status-icon.error { color: var(--error); }

                /* Explanation Card */
                .official-explanation.card.bg-dark {
                    background: rgba(255, 255, 255, 0.05); border: 1px solid var(--primary); padding: 2rem;
                    backdrop-filter: var(--glass-blur);
                }
                .official-explanation h3 { color: white; margin: 0; font-size: 1.125rem; }
                .explanation-summary { line-height: 1.6; color: #cbd5e1; font-size: 0.9375rem; }
                .official-link {
                    display: inline-flex; align-items: center; gap: 0.5rem;
                    color: #94a3b8; font-size: 0.875rem; text-decoration: none;
                    font-weight: 600;
                }
                .official-link:hover { color: white; }
                
                .mb-1 { margin-bottom: 0.5rem; }
                .mb-2 { margin-bottom: 1rem; }
                .mb-3 { margin-bottom: 1.5rem; }
                .mt-3 { margin-top: 1.5rem; }
                .text-primary { color: var(--primary); }
            `}</style>
    </div>
  );
};

export default QuestionCard;
