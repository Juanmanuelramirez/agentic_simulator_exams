import React, { useState } from 'react';
import type { Question } from '../types';
import { CheckCircle, XCircle, Info, ExternalLink } from 'lucide-react';

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
  const [localSelected, setLocalSelected] = useState<string[]>(userSelectedIds);

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

  const getOptionStatus = (id: string) => {
    if (!isVerified) return '';

    const isCorrect = question.correct_ids.includes(id);
    const isSelected = localSelected.includes(id);

    if (isCorrect) return 'correct';
    if (isSelected && !isCorrect) return 'incorrect';
    return '';
  };

  return (
    <div className="question-card card fade-in">
      <div className="question-header">
        <span className="domain-tag">{question.domain}</span>
        <span className="type-tag">{question.type === 'single_select' ? 'Single Choice' : 'Multiple Choice'}</span>
      </div>

      <p className="question-text">{question.question_text}</p>

      <div className="options-list">
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => toggleOption(option.id)}
            disabled={isVerified}
            className={`option-btn ${localSelected.includes(option.id) ? 'selected' : ''} ${getOptionStatus(option.id)}`}
          >
            <span className="option-id">{option.id}</span>
            <span className="option-content">{option.text}</span>
            {isVerified && question.correct_ids.includes(option.id) && <CheckCircle size={18} className="status-icon success" />}
            {isVerified && localSelected.includes(option.id) && !question.correct_ids.includes(option.id) && <XCircle size={18} className="status-icon error" />}
          </button>
        ))}
      </div>

      {isVerified && (
        <div className="explanation-section fade-in">
          <div className="explanation-header">
            <Info size={20} />
            <h4>AI Explanation</h4>
          </div>
          <p className="explanation-text">{question.explanation}</p>
          {question.official_link && (
            <a href={question.official_link} target="_blank" rel="noopener noreferrer" className="doc-link">
              Read official documentation <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      <style>{`
        .question-card {
          margin-bottom: 2rem;
        }
        .question-header {
          display: flex;
          gap: 10px;
          margin-bottom: 1rem;
        }
        .domain-tag {
          font-size: 12px;
          background: #EEF2FF;
          color: var(--primary-color);
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 500;
        }
        .type-tag {
          font-size: 12px;
          background: #F1F5F9;
          color: var(--text-secondary);
          padding: 4px 12px;
          border-radius: 20px;
        }
        .question-text {
          font-size: 1.1rem;
          font-weight: 500;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }
        .options-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .option-btn {
          display: flex;
          align-items: center;
          text-align: left;
          padding: 1rem;
          border: 1px solid #E2E8F0;
          border-radius: var(--radius-md);
          background: white;
          transition: all 0.2s;
        }
        .option-btn.selected {
          border-color: var(--primary-color);
          background: #F5F7FF;
        }
        .option-btn.correct {
          border-color: var(--success-color);
          background: #ECFDF5;
        }
        .option-btn.incorrect {
          border-color: var(--error-color);
          background: #FEF2F2;
        }
        .option-id {
          font-weight: 700;
          margin-right: 15px;
          color: var(--text-secondary);
        }
        .option-content {
          flex: 1;
        }
        .status-icon {
          margin-left: 10px;
        }
        .status-icon.success { color: var(--success-color); }
        .status-icon.error { color: var(--error-color); }

        .explanation-section {
          margin-top: 2rem;
          padding: 1.5rem;
          background: #F8FAFC;
          border-radius: var(--radius-md);
          border-left: 4px solid var(--primary-color);
        }
        .explanation-header {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--primary-color);
          margin-bottom: 0.5rem;
        }
        .explanation-header h4 { margin: 0; }
        .explanation-text {
          font-size: 0.95rem;
          color: var(--text-primary);
          line-height: 1.5;
        }
        .doc-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 1rem;
          color: var(--primary-color);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

export default QuestionCard;
