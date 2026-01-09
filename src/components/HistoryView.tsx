import React, { useState } from 'react';
import type { ExamAttempt } from '../types';
import { BookOpen, Calendar, ChevronRight, Clock } from 'lucide-react';
import ExamResults from './ExamResults';

interface HistoryViewProps {
    attempts: ExamAttempt[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ attempts }) => {
    const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);

    if (selectedAttempt) {
        return (
            <ExamResults
                questions={selectedAttempt.questions}
                onExit={() => setSelectedAttempt(null)}
                onRetry={() => setSelectedAttempt(null)}
            />
        );
    }

    return (
        <div className="history-view fade-in">
            <header className="page-header">
                <h1>Tu Historial</h1>
                <p className="text-secondary">Repasa tus errores y monitorea tu progreso</p>
            </header>

            {attempts.length === 0 ? (
                <div className="empty-state card">
                    <BookOpen size={48} color="var(--secondary-color)" />
                    <h3>No hay intentos aún</h3>
                    <p>Completa un examen real para ver tu historial aquí.</p>
                </div>
            ) : (
                <div className="attempts-list">
                    {attempts.map((attempt) => {
                        const correctCount = attempt.questions.filter(q => {
                            if (!q.user_selected_ids) return false;
                            return q.correct_ids.length === q.user_selected_ids.length &&
                                q.correct_ids.every(id => q.user_selected_ids?.includes(id));
                        }).length;
                        const score = Math.round((correctCount / attempt.questions.length) * 100);
                        const isPassed = score >= 70;

                        return (
                            <button
                                key={attempt.id}
                                className="attempt-card card glass"
                                onClick={() => setSelectedAttempt(attempt)}
                            >
                                <div className="attempt-info">
                                    <div className={`score-badge ${isPassed ? 'passed' : 'failed'}`}>
                                        {score}%
                                    </div>
                                    <div className="exam-meta">
                                        <h4>{attempt.exam_id === 'saa-c03' ? 'AWS Solutions Architect' : 'Azure Fundamentals'}</h4>
                                        <div className="meta-row">
                                            <span><Calendar size={14} /> {new Date(attempt.start_time).toLocaleDateString()}</span>
                                            <span><Clock size={14} /> {attempt.mode === 'real' ? 'Examen' : 'Simulador'}</span>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={20} color="var(--secondary-color)" />
                            </button>
                        );
                    })}
                </div>
            )}

            <style>{`
        .history-view { padding-bottom: 5rem; }
        .empty-state { text-align: center; padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .attempts-list { display: flex; flex-direction: column; gap: 1rem; }
        .attempt-card { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 1.25rem; text-align: left; background: white; border: 1px solid #E2E8F0; cursor: pointer; }
        .attempt-info { display: flex; align-items: center; gap: 1.5rem; }
        .score-badge { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .score-badge.passed { background: #ECFDF5; color: var(--success-color); }
        .score-badge.failed { background: #FEF2F2; color: var(--error-color); }
        .exam-meta h4 { margin: 0 0 4px 0; font-size: 1rem; }
        .meta-row { display: flex; gap: 15px; font-size: 0.8rem; color: var(--text-secondary); align-items: center; }
        .meta-row span { display: flex; align-items: center; gap: 4px; }
      `}</style>
        </div>
    );
};

export default HistoryView;
