import React from 'react';
import type { Question } from '../types';
import { CheckCircle2, XCircle, ChevronLeft, RotateCcw } from 'lucide-react';
import QuestionCard from './QuestionCard';

interface ExamResultsProps {
    questions: Question[];
    onExit: () => void;
    onRetry: () => void;
}

const ExamResults: React.FC<ExamResultsProps> = ({ questions, onExit, onRetry }) => {
    const correctCount = questions.filter(q => {
        if (!q.user_selected_ids) return false;
        return q.correct_ids.length === q.user_selected_ids.length &&
            q.correct_ids.every(id => q.user_selected_ids?.includes(id));
    }).length;

    const score = Math.round((correctCount / questions.length) * 100);
    const isPassed = score >= 70;

    return (
        <div className="exam-results fade-in">
            <header className={`results-header ${isPassed ? 'passed' : 'failed'}`}>
                <div className="score-circle">
                    <span className="score-value">{score}%</span>
                    <span className="score-label">{isPassed ? 'APROBADO' : 'FALLIDO'}</span>
                </div>
                <h1>Resumen del Examen</h1>
                <p>{correctCount} de {questions.length} respuestas correctas</p>
            </header>

            <div className="results-content">
                <section className="action-cards">
                    <button onClick={onRetry} className="card-action">
                        <RotateCcw size={24} />
                        <span>Reintentar</span>
                    </button>
                    <button onClick={onExit} className="card-action">
                        <ChevronLeft size={24} />
                        <span>Volver al Inicio</span>
                    </button>
                </section>

                <h3>Revisión Detallada</h3>
                <div className="questions-review">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="review-item">
                            <div className="review-header">
                                <span className="q-number">Pregunta {idx + 1}</span>
                                {q.correct_ids.every(id => q.user_selected_ids?.includes(id)) && q.correct_ids.length === q.user_selected_ids?.length ? (
                                    <span className="status success"><CheckCircle2 size={16} /> Correcta</span>
                                ) : (
                                    <span className="status error"><XCircle size={16} /> Incorrecta</span>
                                )}
                            </div>
                            <QuestionCard
                                question={q}
                                onAnswer={() => { }}
                                isVerified={true}
                                userSelectedIds={q.user_selected_ids}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        .exam-results { position: absolute; top: 0; left: 0; right: 0; min-height: 100vh; background: var(--bg-color); z-index: 3500; padding-bottom: 5rem; }
        .results-header { padding: 4rem 2rem; text-align: center; color: white; background: var(--primary-color); }
        .results-header.passed { background: var(--success-color); }
        .results-header.failed { background: var(--error-color); }
        .score-circle {
          width: 140px; height: 140px; border-radius: 50%;
          border: 4px solid rgba(255,255,255,0.2); margin: 0 auto 1.5rem;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(5px);
        }
        .score-value { font-size: 2.5rem; font-weight: 800; }
        .score-label { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
        .results-content { max-width: 800px; margin: -3rem auto 0; padding: 0 1.5rem; }
        .action-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 3rem; }
        .card-action {
          background: rgba(15, 23, 42, 0.95); 
          border: 1px solid rgba(255, 255, 255, 0.1); 
          border-radius: var(--radius-md); 
          padding: 2rem 1.5rem;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); 
          font-weight: 700; color: #ffffff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-action:hover {
          transform: translateY(-5px);
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        .card-action span { font-size: 1rem; letter-spacing: 0.02em; }
        .review-header { display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; margin-bottom: 1.5rem; padding: 0 10px; }
        .q-number { font-weight: 700; color: #ffffff; font-size: 1.1rem; }
        .status { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.95rem; }
        .status.success { color: #34d399; }
        .status.error { color: #fb7185; }
        h3 { color: #ffffff; margin-top: 3rem; font-weight: 700; font-size: 1.5rem; }
      `}</style>
        </div>
    );
};

export default ExamResults;
