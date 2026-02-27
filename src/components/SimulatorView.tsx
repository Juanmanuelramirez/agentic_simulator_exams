import React, { useState } from 'react';
import type { Exam, Question } from '../types';
import QuestionCard from './QuestionCard';
import { ChevronLeft, Loader2 } from 'lucide-react';

interface SimulatorViewProps {
  exam: Exam;
  initialQuestions: Question[];
  onExit: () => void;
  onFinish: (questions: Question[]) => void;
}

const SimulatorView: React.FC<SimulatorViewProps> = ({ exam, initialQuestions, onExit, onFinish }) => {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [currentIdx, setCurrentIdx] = useState(0);

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      // Ensure the next question metadata is initialized if it's the first time visiting it
      if (questions[nextIdx] && !questions[nextIdx].user_selected_ids) {
        const updated = [...questions];
        updated[nextIdx] = { ...updated[nextIdx], user_selected_ids: [] };
        setQuestions(updated);
      }
      setCurrentIdx(nextIdx);
    } else {
      onFinish(questions);
    }
  };

  const currentQuestion = questions[currentIdx];

  const handleAnswer = (selectedIds: string[]) => {
    const updated = [...questions];
    updated[currentIdx] = { ...updated[currentIdx], user_selected_ids: selectedIds };
    setQuestions(updated);
  };

  const handleVerify = () => {
    const updated = [...questions];
    updated[currentIdx] = { ...updated[currentIdx], is_verified: true };
    setQuestions(updated);
  };

  return (
    <div className="simulator-view animate-fade-in">
      <nav className="simulator-header">
        <div className="header-left">
          <button onClick={onExit} className="back-btn"><ChevronLeft size={20} /></button>
          <div className="exam-info-header">
            <span className="exam-name-badge">{exam.name}</span>
            <span className="question-count-badge">Pregunta {currentIdx + 1}/{questions.length}</span>
          </div>
        </div>

        <div className="header-right">
          <div className="status-badge-saved">
            <div className="save-dot" />
            ✓ Guardado
          </div>
        </div>
      </nav>

      <div className="exam-progress-container">
        <div className="exam-progress-bar" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}></div>
      </div>

      <div className="simulator-content">
        {currentQuestion ? (
          <>
            <QuestionCard
              question={currentQuestion}
              onAnswer={handleAnswer}
              isVerified={currentQuestion.is_verified}
              userSelectedIds={currentQuestion.user_selected_ids}
            />

            <div className="bottom-action-bar">
              <button
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                className="secondary"
              >
                Anterior
              </button>

              {!currentQuestion.is_verified ? (
                <button
                  onClick={handleVerify}
                  className="primary"
                  disabled={!currentQuestion.user_selected_ids?.length}
                >
                  Verificar
                </button>
              ) : (
                <button onClick={handleNext} className="primary">
                  {currentIdx === questions.length - 1 ? 'Finalizar' : 'Siguiente'}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="loading-state">
            <Loader2 className="animate-spin" size={40} />
            <p>Cargando preguntas...</p>
          </div>
        )}
      </div>

      <style>{`
        .simulator-view {
          position: fixed; inset: 0; background: var(--bg-main); z-index: 2000;
          display: flex; flex-direction: column;
        }
        .simulator-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1rem 2rem; background: var(--bg-card); backdrop-filter: var(--glass-blur); border-bottom: 1px solid var(--border-default);
        }
        .header-left { display: flex; align-items: center; gap: 1.5rem; }
        .exam-info-header { display: flex; flex-direction: column; }
        .exam-name-badge { font-weight: 700; color: var(--text-main); font-size: 0.9375rem; }
        .question-count-badge { font-size: 0.8125rem; color: var(--text-secondary); font-weight: 500; }
        
        .status-badge-saved {
            display: flex; align-items: center; gap: 0.5rem;
            padding: 0.375rem 0.75rem; border-radius: 20px;
            background: rgba(16, 185, 129, 0.1); color: #10b981; font-size: 0.8125rem; font-weight: 600;
            border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .save-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }

        .exam-progress-container { width: 100%; height: 4px; background: rgba(255, 255, 255, 0.05); }
        .exam-progress-bar { height: 100%; background: var(--secondary); transition: width 0.3s; box-shadow: 0 0 10px var(--secondary); }

        .simulator-content {
          flex: 1; padding: 2rem; max-width: 900px; margin: 0 auto; width: 100%; overflow-y: auto;
          padding-bottom: 100px;
        }

        .bottom-action-bar {
            position: fixed; bottom: 0; left: 0; right: 0;
            padding: 1.25rem 2rem; background: var(--bg-card); backdrop-filter: var(--glass-blur);
            border-top: 1px solid var(--border-default);
            display: flex; justify-content: space-between; gap: 1rem;
            max-width: 900px; margin: 0 auto;
            z-index: 10;
        }
        
        button { border-radius: 12px; font-weight: 600; padding: 0.75rem 1.5rem; cursor: pointer; transition: all 0.2s; }
        button.primary { background: var(--primary); color: white; border: none; flex: 1; max-width: 200px; }
        button.primary:hover { border-color: white; transform: translateY(-1px); box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
        button.secondary { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-default); color: var(--text-main); }
        button.secondary:hover { background: rgba(255, 255, 255, 0.1); }
        button:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

        .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; }
        .back-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0.5rem; border-radius: 50%; transition: background 0.2s; }
        .back-btn:hover { background: rgba(255, 255, 255, 0.1); }
      `}</style>
    </div>
  );
};

export default SimulatorView;
