import React, { useState, useEffect, useCallback } from 'react';
import type { Exam, Question } from '../types';
import { solver } from '../agents/solver';
import QuestionCard from './QuestionCard';
import { ChevronLeft, ChevronRight, Clock, Send } from 'lucide-react';

interface RealExamViewProps {
    exam: Exam;
    onExit: () => void;
    onFinish: (questions: Question[]) => void;
}

const RealExamView: React.FC<RealExamViewProps> = ({ exam, onExit, onFinish }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);

    const handleFinish = useCallback(() => {
        onFinish(questions);
    }, [questions, onFinish]);

    useEffect(() => {
        const initExam = async () => {
            const qList: Question[] = [];
            for (let i = 0; i < 10; i++) {
                const q = await solver.generateQuestion(exam);
                qList.push({ ...q, is_verified: false });
            }
            setQuestions(qList);
            setLoading(false);
        };
        initExam();
    }, [exam]);

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

    if (loading) {
        return (
            <div className="loading-overlay">
                <Clock className="animate-pulse" size={48} color="var(--primary-color)" />
                <h2>Iniciando Examen Real...</h2>
                <p>Asegúrate de tener una conexión estable.</p>
            </div>
        );
    }

    return (
        <div className="real-exam-view fade-in">
            <nav className="exam-nav glass">
                <button onClick={onExit} className="exit-btn"><ChevronLeft size={20} /> Abortar</button>
                <div className="timer-display">
                    <Clock size={18} />
                    <span className={timeLeft < 300 ? 'urgent' : ''}>{formatTime(timeLeft)}</span>
                </div>
                <button onClick={handleFinish} className="finish-btn"><Send size={18} /> Entregar</button>
            </nav>

            <div className="exam-content">
                <div className="navigation-grid">
                    {questions.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIdx(idx)}
                            className={`nav-dot ${currentIdx === idx ? 'active' : ''} ${questions[idx].user_selected_ids?.length ? 'answered' : ''}`}
                        >
                            {idx + 1}
                        </button>
                    ))}
                </div>

                {currentQuestion && (
                    <QuestionCard
                        question={currentQuestion}
                        onAnswer={handleAnswer}
                        isVerified={false}
                        userSelectedIds={currentQuestion.user_selected_ids}
                    />
                )}

                <div className="nav-controls">
                    <button
                        disabled={currentIdx === 0}
                        onClick={() => setCurrentIdx(currentIdx - 1)}
                        className="btn-nav"
                    >
                        <ChevronLeft /> Anterior
                    </button>
                    <button
                        disabled={currentIdx === questions.length - 1}
                        onClick={() => setCurrentIdx(currentIdx + 1)}
                        className="btn-nav"
                    >
                        Siguiente <ChevronRight />
                    </button>
                </div>
            </div>

            <style>{`
        .real-exam-view {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 3000;
          display: flex;
          flex-direction: column;
        }
        .exam-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: #1E293B;
          color: white;
        }
        .exit-btn, .finish-btn {
          background: none; border: none; color: white;
          font-weight: 500; display: flex; align-items: center; gap: 8px;
        }
        .timer-display {
          display: flex; align-items: center; gap: 8px;
          font-family: monospace; font-size: 1.2rem; font-weight: 600;
          background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 4px;
        }
        .urgent { color: #F87171; animation: blink 1s infinite; }
        @keyframes blink { 50% { opacity: 0.5; } }
        .exam-content { flex: 1; padding: 1.5rem; max-width: 800px; margin: 0 auto; width: 100%; overflow-y: auto; }
        .navigation-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 2rem; justify-content: center; }
        .nav-dot {
          width: 32px; height: 32px; border-radius: 4px; border: 1px solid #E2E8F0;
          background: white; font-size: 0.8rem; display: flex; align-items: center; justify-content: center;
        }
        .nav-dot.active { border-color: var(--primary-color); background: #EEF2FF; font-weight: 700; }
        .nav-dot.answered { background: #E2E8F0; }
        .nav-controls { display: flex; justify-content: space-between; margin-top: 2rem; padding-bottom: 4rem; }
        .loading-overlay {
          position: fixed; inset: 0; background: white;
          display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 4000;
        }
      `}</style>
        </div>
    );
};

export default RealExamView;
