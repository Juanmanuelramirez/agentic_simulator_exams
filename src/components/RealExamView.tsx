import React, { useState, useEffect, useCallback } from 'react';
import type { Exam, Question } from '../types';
import QuestionCard from './QuestionCard';
import { ChevronLeft, ChevronRight, Clock, Send } from 'lucide-react';

interface RealExamViewProps {
    exam: Exam;
    initialQuestions: Question[];
    onExit: () => void;
    onFinish: (questions: Question[]) => void;
}

const RealExamView: React.FC<RealExamViewProps> = ({ exam, initialQuestions, onExit, onFinish }) => {
    const [questions, setQuestions] = useState<Question[]>(initialQuestions);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);

    const handleFinish = useCallback(() => {
        onFinish(questions);
    }, [questions, onFinish]);

    useEffect(() => {
        if (timeLeft <= 0) {
            handleFinish();
            return;
        }
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, handleFinish]);

    const handleAnswer = (selectedIds: string[]) => {
        const updated = [...questions];
        updated[currentIdx] = { ...updated[currentIdx], user_selected_ids: selectedIds };
        setQuestions(updated);
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    const currentQuestion = questions[currentIdx];

    return (
        <div className="real-exam-view animate-fade-in">
            <nav className="exam-header">
                <div className="header-left">
                    <button onClick={onExit} className="back-link"><ChevronLeft size={20} /> Abortar</button>
                    <div className="exam-meta-info">
                        <span className="exam-title">{exam.name}</span>
                        <span className="question-index">Pregunta {currentIdx + 1} de {questions.length}</span>
                    </div>
                </div>

                <div className="header-center">
                    <div className={`timer-badge ${timeLeft < 300 ? 'urgent' : ''}`}>
                        <Clock size={18} />
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                </div>

                <div className="header-right">
                    <button onClick={handleFinish} className="submit-btn"><Send size={18} /> Entregar Examen</button>
                </div>
            </nav>

            <div className="exam-main-layout">
                <aside className="navigation-sidebar">
                    <h3 className="sidebar-title">Navegación</h3>
                    <div className="nav-grid">
                        {questions.map((q, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIdx(idx)}
                                className={`nav-item ${currentIdx === idx ? 'active' : ''} ${q.user_selected_ids?.length ? 'answered' : ''}`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="question-workspace">
                    {currentQuestion && (
                        <QuestionCard
                            question={currentQuestion}
                            onAnswer={handleAnswer}
                            isVerified={false}
                            userSelectedIds={currentQuestion.user_selected_ids}
                        />
                    )}

                    <div className="question-navigation">
                        <button
                            disabled={currentIdx === 0}
                            onClick={() => setCurrentIdx(currentIdx - 1)}
                            className="nav-btn secondary"
                        >
                            <ChevronLeft size={20} /> Anterior
                        </button>
                        <button
                            disabled={currentIdx === questions.length - 1}
                            onClick={() => setCurrentIdx(currentIdx + 1)}
                            className="nav-btn primary"
                        >
                            Siguiente <ChevronRight size={20} />
                        </button>
                    </div>
                </main>
            </div>

            <style>{`
                .real-exam-view {
                    position: fixed; inset: 0; background: var(--bg-main); z-index: 3000;
                    display: flex; flex-direction: column;
                }
                .exam-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 1rem 2.5rem; background: var(--bg-card); backdrop-filter: var(--glass-blur); border-bottom: 1px solid var(--border-default);
                    height: 80px; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
                }
                .header-left { display: flex; align-items: center; gap: 2.5rem; flex: 1; }
                .back-link { 
                    display: flex; align-items: center; gap: 0.5rem; 
                    background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-default); 
                    color: var(--text-secondary); padding: 0.5rem 1rem; border-radius: 12px;
                    font-weight: 600; cursor: pointer; font-size: 0.875rem;
                    transition: all 0.2s;
                }
                .back-link:hover { background: rgba(244, 63, 94, 0.1); color: var(--error); border-color: rgba(244, 63, 94, 0.2); }
                .exam-meta-info { display: flex; flex-direction: column; }
                .exam-title { font-weight: 800; color: var(--text-main); font-size: 1.125rem; letter-spacing: -0.01em; }
                .question-index { font-size: 0.875rem; color: var(--text-secondary); font-weight: 500; }

                .header-center { flex: 1; display: flex; justify-content: center; }
                .timer-badge {
                    display: flex; align-items: center; gap: 0.75rem;
                    padding: 0.625rem 1.5rem; border-radius: 99px;
                    background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-default);
                    font-family: 'Inter', sans-serif; font-weight: 750; font-size: 1.25rem;
                    color: var(--text-main); min-width: 160px; justify-content: center;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
                }
                .timer-badge.urgent { background: rgba(244, 63, 94, 0.1); border-color: rgba(244, 63, 94, 0.3); color: #f43f5e; animation: pulse 2s infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }

                .header-right { flex: 1; display: flex; justify-content: flex-end; }
                .submit-btn {
                    display: flex; align-items: center; gap: 0.75rem;
                    background: var(--primary); color: white; border: none;
                    padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 700;
                    cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 12px -2px rgba(79, 70, 229, 0.25);
                }
                .submit-btn:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 6px 16px -2px rgba(79, 70, 229, 0.35); }

                .exam-main-layout { flex: 1; display: flex; overflow: hidden; }
                
                .navigation-sidebar {
                    width: 280px; background: rgba(255, 255, 255, 0.02); border-right: 1px solid var(--border-default);
                    padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem;
                    overflow-y: auto; backdrop-filter: var(--glass-blur);
                }
                .sidebar-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); font-weight: 700; }
                .nav-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; }
                .nav-item {
                    aspect-ratio: 1; border-radius: 8px; border: 1px solid var(--border-default);
                    background: rgba(255, 255, 255, 0.03); font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);
                    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
                }
                .nav-item:hover { border-color: var(--primary); color: var(--primary); background: rgba(99, 102, 241, 0.05); }
                .nav-item.active { background: var(--primary); border-color: var(--primary); color: white; box-shadow: 0 0 15px rgba(99, 102, 241, 0.4); }
                .nav-item.answered:not(.active) { background: rgba(99, 102, 241, 0.05); color: var(--primary); border-color: rgba(99, 102, 241, 0.3); }

                .question-workspace {
                    flex: 1; padding: 3rem; overflow-y: auto; display: flex; flex-direction: column;
                    align-items: center; gap: 3rem; background: var(--bg-main);
                }
                .question-navigation {
                    display: flex; gap: 1rem; width: 100%; max-width: 800px; justify-content: space-between;
                    padding-bottom: 4rem;
                }
                .nav-btn {
                    display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem;
                    border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                }
                .nav-btn.primary { background: var(--primary); color: white; border: none; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
                .nav-btn.primary:hover { box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5); transform: translateY(-1px); }
                .nav-btn.secondary { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-default); color: var(--text-main); }
                .nav-btn.secondary:hover { background: rgba(255, 255, 255, 0.1); }
                .nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default RealExamView;
