import React, { useState, useEffect, useCallback } from 'react';
import type { Exam, Question } from '../types';
import QuestionCard from './QuestionCard';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Send,
    X,
    LayoutDashboard,
    BookOpen,
    History,
    RotateCcw,
    ShieldCheck
} from 'lucide-react';

interface RealExamViewProps {
    exam: Exam;
    initialQuestions: Question[];
    onExit: () => void;
    onFinish: (questions: Question[]) => void;
    onPause?: (questions: Question[], currentIdx: number) => void;
}

const RealExamView: React.FC<RealExamViewProps> = ({ exam, initialQuestions, onExit, onFinish, onPause }) => {
    const [questions, setQuestions] = useState<Question[]>(initialQuestions);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [showPauseConfirm, setShowPauseConfirm] = useState(false);

    // Sincronizar cuando llegan más preguntas del background
    useEffect(() => {
        if (initialQuestions.length > questions.length) {
            setQuestions(initialQuestions);
        }
    }, [initialQuestions.length]);
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

    const handleToggleReview = () => {
        const updated = [...questions];
        updated[currentIdx] = { ...updated[currentIdx], marked_for_review: !updated[currentIdx].marked_for_review };
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
        <div className="app-container animate-fade-in" style={{ zIndex: 3000, position: 'fixed', inset: 0 }}>
            <aside className="mini-sidebar">
                <div className="brand-logo mb-3" style={{ background: 'var(--primary)', color: 'white', padding: '8px', borderRadius: '10px' }}>
                    <ShieldCheck size={24} />
                </div>
                <button className="mini-nav-item"><LayoutDashboard size={20} /></button>
                <button className="mini-nav-item active"><BookOpen size={20} /></button>
                <button className="mini-nav-item"><History size={20} /></button>
                <button className="mini-nav-item"><RotateCcw size={20} /></button>

                <div style={{ marginTop: 'auto', marginBottom: '1rem' }}>
                    <div className="user-avatar" style={{ background: '#f1f5f9', color: '#64748b' }}>JD</div>
                </div>
            </aside>

            <main className="main-content">
                <header className="view-header">
                    <div className="view-header-left">
                        <div className="breadcrumbs">
                            <span className="text-sm font-medium">{exam.name}</span>
                            <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                            <span className="current text-indigo-600">Examen Real</span>
                        </div>
                    </div>

                    <div className="header-center">
                        <div className={`timer-display ${timeLeft < 300 ? 'text-error' : 'text-slate-700'}`}>
                            <Clock size={20} />
                            <span className="font-bold text-xl">{formatTime(timeLeft)}</span>
                        </div>
                    </div>

                    <div className="view-header-right flex items-center gap-4">
                        <button onClick={handleFinish} className="submit-btn-pro">
                            <Send size={18} />
                            <span>Entregar Examen</span>
                        </button>
                        <button onClick={onExit} className="icon-btn-circle">
                            <X size={20} />
                        </button>
                        {onPause && (
                            <button onClick={() => setShowPauseConfirm(true)} style={{ padding: '0.375rem 0.75rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 8, fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}>
                                ⏸ Pausar
                            </button>
                        )}
                    </div>
                </header>

                {showPauseConfirm && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', borderRadius: 16, padding: '2rem', maxWidth: 400, width: '90%', textAlign: 'center' }}>
                            <h3 style={{ marginBottom: '0.5rem' }}>⏸ Pausar Examen</h3>
                            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Tu progreso se guardará. Podrás continuar desde la pregunta {currentIdx + 1}.</p>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                <button onClick={() => setShowPauseConfirm(false)} style={{ padding: '0.625rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Continuar</button>
                                <button onClick={() => onPause?.(questions, currentIdx)} style={{ padding: '0.625rem 1.25rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Pausar y Salir</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="exam-body-layout">
                    <aside className="nav-panel">
                        <div className="panel-header">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Navegación</h3>
                        </div>
                        <div className="q-grid scrollbar-hide">
                            {questions.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIdx(idx)}
                                    className={`q-nav-item ${currentIdx === idx ? 'active' : ''} ${q.user_selected_ids?.length ? 'answered' : ''}`}
                                >
                                    {idx + 1}
                                    {q.marked_for_review && <div className="q-flag-dot" />}
                                </button>
                            ))}
                        </div>
                    </aside>

                    <div className="question-content-area">
                        {currentQuestion && (
                            <QuestionCard
                                question={currentQuestion}
                                onAnswer={handleAnswer}
                                isVerified={false}
                                userSelectedIds={currentQuestion.user_selected_ids}
                                isMarkedForReview={currentQuestion.marked_for_review}
                                onToggleReview={handleToggleReview}
                            />
                        )}
                    </div>
                </div>

                <footer className="view-footer">
                    <button
                        onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                        disabled={currentIdx === 0}
                        className="btn-ghost"
                    >
                        <ChevronLeft size={20} />
                        <span>Anterior</span>
                    </button>

                    <div className="footer-actions">
                        <button
                            onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
                            disabled={currentIdx === questions.length - 1}
                            className="pro-btn-main active"
                        >
                            <span>Siguiente Pregunta</span>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </footer>
            </main>

            <style>{`
                .exam-body-layout {
                    display: flex;
                    flex: 1;
                    min-height: 0;
                }
                
                .nav-panel {
                    width: 240px;
                    border-right: 1px solid var(--border-default);
                    background: #f8fafc;
                    display: flex;
                    flex-direction: column;
                }
                
                .panel-header { padding: 1.5rem; border-bottom: 1px solid var(--border-default); }
                
                .q-grid {
                    padding: 1.25rem;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.5rem;
                    overflow-y: auto;
                }
                
                .q-nav-item {
                    aspect-ratio: 1;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    font-size: 0.8125rem;
                    font-weight: 700;
                    color: #64748b;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    transition: all 0.2s;
                    padding: 0;
                }
                
                .q-nav-item:hover { border-color: var(--primary); color: var(--primary); }
                .q-nav-item.active { background: var(--primary); border-color: var(--primary); color: white; }
                .q-nav-item.answered:not(.active) { background: #eff6ff; color: var(--primary); border-color: #bfdbfe; }
                
                .q-flag-dot {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 6px;
                    height: 6px;
                    background: #fb923c;
                    border-radius: 50%;
                }
                
                .question-content-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 2rem;
                }
                
                .timer-display {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.5rem 1rem;
                    background: #f1f5f9;
                    border-radius: 12px;
                }
                
                .submit-btn-pro {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.625rem 1.25rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .submit-btn-pro:hover { background: var(--primary-hover); transform: translateY(-1px); }
                
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                
                .text-error { color: #ef4444; }
                .btn-ghost {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #64748b;
                    font-weight: 600;
                    background: none;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .btn-ghost:hover:not(:disabled) { background: #f8fafc; color: var(--text-main); }
                .btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
                
                .pro-btn-main {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1.75rem;
                    border-radius: 12px;
                    font-weight: 700;
                    background: #64748b;
                    color: white;
                    border: none;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .pro-btn-main:hover {
                    background: #475569;
                    transform: translateY(-1px);
                }
                
                .icon-btn-circle {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                    background: none;
                    border: none;
                    cursor: pointer;
                }
                .icon-btn-circle:hover { background: #f1f5f9; color: var(--text-main); }
            `}</style>
        </div>
    );
};

export default RealExamView;
