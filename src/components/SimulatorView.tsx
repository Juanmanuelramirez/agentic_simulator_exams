import React, { useState, useEffect } from 'react';
import type { Exam, Question } from '../types';
import { solver } from '../agents/solver';
import QuestionCard from './QuestionCard';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface SimulatorViewProps {
  exam: Exam;
  onExit: () => void;
}

const SimulatorView: React.FC<SimulatorViewProps> = ({ exam, onExit }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load first question on start
  useEffect(() => {
    loadNextQuestion();
  }, []);

  const loadNextQuestion = async () => {
    if (questions.length > currentIdx && currentIdx < 9) {
      setCurrentIdx(currentIdx + 1);
      return;
    }

    if (questions.length >= 10) return;

    setLoading(true);
    try {
      const newQuestion = await solver.generateQuestion(exam);
      setQuestions([...questions, newQuestion]);
      if (questions.length > 0) {
        setCurrentIdx(questions.length);
      }
    } catch (error) {
      console.error("Failed to generate question", error);
    } finally {
      setLoading(false);
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
    <div className="simulator-view fade-in">
      <nav className="simulator-nav glass">
        <button onClick={onExit} className="exit-btn"><ChevronLeft size={20} /> Salir</button>
        <div className="exam-info">
          <span className="exam-name">{exam.name}</span>
          <span className="question-count">Pregunta {currentIdx + 1}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((currentIdx + 1) / 10) * 100}%` }}></div>
        </div>
      </nav>

      <div className="simulator-content">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin" size={40} color="var(--primary-color)" />
            <p>El Agente Solver está generando tu pregunta...</p>
          </div>
        ) : currentQuestion ? (
          <>
            <QuestionCard
              question={currentQuestion}
              onAnswer={handleAnswer}
              isVerified={currentQuestion.is_verified}
              userSelectedIds={currentQuestion.user_selected_ids}
            />

            <div className="action-bar">
              {!currentQuestion.is_verified && (
                <button
                  onClick={handleVerify}
                  className="btn-verify"
                  disabled={!currentQuestion.user_selected_ids?.length}
                >
                  Verificar Respuesta
                </button>
              )}

              <div className="nav-buttons">
                <button
                  onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                  disabled={currentIdx === 0}
                  className="btn-nav"
                >
                  <ChevronLeft /> Anterior
                </button>

                <button
                  onClick={loadNextQuestion}
                  disabled={currentIdx >= 9 && !!currentQuestion.is_verified}
                  className="btn-nav primary"
                >
                  {currentIdx === questions.length - 1 ? 'Próxima' : 'Siguiente'} <ChevronRight />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <style>{`
        .simulator-view {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--bg-color);
          z-index: 2000;
          display: flex;
          flex-direction: column;
        }
        .simulator-nav {
          padding: 1rem;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 20px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .exit-btn {
          display: flex;
          align-items: center;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .exam-info {
          text-align: center;
          display: flex;
          flex-direction: column;
        }
        .exam-name { font-weight: 600; font-size: 0.9rem; }
        .question-count { font-size: 0.8rem; color: var(--text-secondary); }
        
        .progress-bar {
          grid-column: 1 / span 3;
          height: 4px;
          background: #E2E8F0;
          border-radius: 2px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--primary-color);
          transition: width 0.3s ease;
        }

        .simulator-content {
          flex: 1;
          padding: 2rem 1.5rem;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
          overflow-y: auto;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 50vh;
          gap: 20px;
          color: var(--text-secondary);
        }

        .action-bar {
          margin-top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-bottom: 4rem;
        }

        .btn-verify {
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          padding: 1rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-verify:disabled {
          background: var(--secondary-color);
          opacity: 0.5;
          cursor: not-allowed;
        }

        .nav-buttons {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }

        .btn-nav {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: var(--radius-md);
          padding: 0.75rem;
          font-weight: 500;
        }

        .btn-nav.primary {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .btn-nav:disabled {
          opacity: 0.3;
        }
      `}</style>
    </div>
  );
};

export default SimulatorView;
