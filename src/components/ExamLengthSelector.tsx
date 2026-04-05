import { useState } from 'react';
import type { Exam } from '../types';
import { solver } from '../agents/solver';

interface ExamLengthSelectorProps {
  exam: Exam;
  onSelect: (percentage: 50 | 75 | 100, questionCount: number) => void;
  onStart: () => void;
}

const ExamLengthSelector: React.FC<ExamLengthSelectorProps> = ({ exam, onSelect, onStart }) => {
  const [selected, setSelected] = useState<50 | 75 | 100>(100);

  const options: { percentage: 50 | 75 | 100; questions: number; duration: number }[] = [
    {
      percentage: 50,
      questions: solver.calculateQuestionCount(exam.total_questions_official, 50),
      duration: Math.round(exam.duration_minutes * 0.5),
    },
    {
      percentage: 75,
      questions: solver.calculateQuestionCount(exam.total_questions_official, 75),
      duration: Math.round(exam.duration_minutes * 0.75),
    },
    {
      percentage: 100,
      questions: exam.total_questions_official,
      duration: exam.duration_minutes,
    },
  ];

  const handleSelect = (percentage: 50 | 75 | 100, questions: number) => {
    setSelected(percentage);
    onSelect(percentage, questions);
  };

  return (
    <div className="exam-length-selector">
      <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Seleccionar duración del examen</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {options.map((opt) => (
          <label
            key={opt.percentage}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              border: `2px solid ${selected === opt.percentage ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              background: selected === opt.percentage ? '#EEF2FF' : 'var(--bg-card)',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="radio"
              name="exam-length"
              checked={selected === opt.percentage}
              onChange={() => handleSelect(opt.percentage, opt.questions)}
              style={{ accentColor: 'var(--primary)' }}
            />
            <div>
              <strong style={{ color: 'var(--text-main)' }}>{opt.percentage}%</strong>
              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                — {opt.questions} preguntas · ~{opt.duration} minutos
              </span>
            </div>
          </label>
        ))}
      </div>
      <button
        onClick={onStart}
        style={{
          width: '100%',
          padding: '0.875rem',
          background: 'var(--primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Iniciar Examen
      </button>
    </div>
  );
};

export default ExamLengthSelector;
