import React from 'react';
import type { Question } from '../types';
import { CheckCircle2, XCircle, ChevronLeft, RotateCcw, ShieldCheck, LayoutDashboard, BookOpen, History, RotateCcw as RotateIcon } from 'lucide-react';
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
        <div className="app-container animate-fade-in" style={{ zIndex: 3500, position: 'fixed', inset: 0 }}>
            <aside className="mini-sidebar">
                <div className="brand-logo mb-3" style={{ background: 'var(--primary)', color: 'white', padding: '8px', borderRadius: '10px' }}>
                    <ShieldCheck size={24} />
                </div>
                <button className="mini-nav-item"><LayoutDashboard size={20} /></button>
                <button className="mini-nav-item active"><BookOpen size={20} /></button>
                <button className="mini-nav-item"><History size={20} /></button>
                <button className="mini-nav-item"><RotateIcon size={20} /></button>

                <div style={{ marginTop: 'auto', marginBottom: '1rem' }}>
                    <div className="user-avatar" style={{ background: '#f1f5f9', color: '#64748b' }}>JD</div>
                </div>
            </aside>

            <main className="main-content">
                <header className="view-header">
                    <div className="view-header-left">
                        <div className="breadcrumbs">
                            <span className="text-sm font-medium">Resultados del Examen</span>
                            <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                            <span className="current text-indigo-600">Resumen</span>
                        </div>
                    </div>
                </header>

                <div className="results-body scrollbar-hide">
                    <div className="results-hero card mb-3 text-center">
                        <div className={`score-badge mb-2 ${isPassed ? 'passed' : 'failed'}`}>
                            <span className="text-4xl font-extrabold">{score}%</span>
                            <span className="text-xs font-bold tracking-widest">{isPassed ? 'PASSED' : 'FAILED'}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-1">¡Buen trabajo en completar el examen!</h1>
                        <p className="text-slate-500">Has respondido correctamente {correctCount} de {questions.length} preguntas.</p>

                        <div className="flex justify-center gap-4 mt-3">
                            <button onClick={onRetry} className="btn-retry">
                                <RotateCcw size={18} />
                                <span>Intentar de Nuevo</span>
                            </button>
                            <button onClick={onExit} className="btn-home">
                                <ChevronLeft size={18} />
                                <span>Volver al Panel</span>
                            </button>
                        </div>
                    </div>

                    <div className="review-section">
                        <h3 className="section-title mb-2">Revisión Detallada</h3>
                        <div className="q-review-list">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="q-review-card card mb-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-slate-400">PREGUNTA {idx + 1}</span>
                                        {q.correct_ids.every(id => q.user_selected_ids?.includes(id)) && q.correct_ids.length === q.user_selected_ids?.length ? (
                                            <div className="badge-green">
                                                <CheckCircle2 size={14} />
                                                <span>Correcta</span>
                                            </div>
                                        ) : (
                                            <div className="badge-red">
                                                <XCircle size={14} />
                                                <span>Incorrecta</span>
                                            </div>
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
                </div>
            </main>

            <style>{`
                .results-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 3rem 1.5rem;
                    background: #f8fafc;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .results-hero {
                    width: 100%;
                    max-width: 800px;
                    padding: 3rem;
                    border-radius: 24px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                }
                
                .score-badge {
                    width: 140px;
                    height: 140px;
                    border-radius: 50%;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    border: 8px solid #f1f5f9;
                }
                .score-badge.passed { color: #10b981; border-color: #ecfdf5; background: #f0fdf4; }
                .score-badge.failed { color: #ef4444; border-color: #fef2f2; background: #fff1f2; }
                
                .btn-retry {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-retry:hover { background: var(--primary-hover); transform: translateY(-1px); }
                
                .btn-home {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    background: white;
                    color: #475569;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-home:hover { background: #f8fafc; border-color: #94a3b8; }
                
                .review-section {
                    width: 100%;
                    max-width: 800px;
                    margin-top: 2rem;
                }
                
                .q-review-card {
                    padding: 2rem;
                    border-radius: 20px;
                    border: 1px solid #f1f5f9;
                }
                
                .badge-red {
                    background: #fef2f2;
                    color: #ef4444;
                    padding: 0.25rem 0.75rem;
                    border-radius: 2rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }

                .badge-green {
                    background: #f0fdf4;
                    color: #059669;
                    padding: 0.25rem 0.75rem;
                    border-radius: 2rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    border: 1px solid rgba(5, 150, 105, 0.2);
                }
                
                .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
                .font-extrabold { font-weight: 800; }
                .tracking-widest { letter-spacing: 0.1em; }
                .justify-center { justify-content: center; }
                .mt-3 { margin-top: 1.5rem; }
                
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default ExamResults;
