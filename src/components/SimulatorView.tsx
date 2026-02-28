import React, { useState } from 'react';
import type { Exam, Question } from '../types';
import QuestionCard from './QuestionCard';
import {
  ChevronLeft,
  Loader2,
  X,
  LayoutDashboard,
  BookOpen,
  History,
  RotateCcw,
  CheckCircle,
  ShieldCheck
} from 'lucide-react';

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

  const handleToggleReview = () => {
    const updated = [...questions];
    updated[currentIdx] = { ...updated[currentIdx], marked_for_review: !updated[currentIdx].marked_for_review };
    setQuestions(updated);
  };

  const progressPercent = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="app-container animate-fade-in" style={{ zIndex: 2000, position: 'fixed', inset: 0 }}>
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
              <span className="current text-indigo-600">Modo Simulador</span>
            </div>
          </div>

          <div className="header-center flex items-center gap-4">
            <span className="text-sm font-bold text-slate-700">Pregunta {currentIdx + 1} / {questions.length}</span>
            <div className="progress-container-mini">
              <div className="progress-bar-mini" style={{ width: `${progressPercent}%` }}></div>
              <div className="progress-dot" style={{ left: `${progressPercent}%` }}></div>
            </div>
          </div>

          <div className="view-header-right flex items-center gap-4">
            <div className="badge-green">
              <CheckCircle size={14} />
              <span>GUARDADO</span>
            </div>
            <button onClick={onExit} className="icon-btn-circle">
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="simulator-body scrollbar-hide">
          {currentQuestion ? (
            <QuestionCard
              question={currentQuestion}
              onAnswer={handleAnswer}
              isVerified={currentQuestion.is_verified}
              userSelectedIds={currentQuestion.user_selected_ids}
              isMarkedForReview={currentQuestion.marked_for_review}
              onToggleReview={handleToggleReview}
            />
          ) : (
            <div className="loading-state">
              <Loader2 className="animate-spin" size={40} color="var(--primary)" />
              <p>Cargando preguntas...</p>
            </div>
          )}
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
            {!currentQuestion?.is_verified ? (
              <button
                onClick={handleVerify}
                className={`pro-btn-main ${currentQuestion?.user_selected_ids?.length ? 'active' : ''}`}
                disabled={!currentQuestion?.user_selected_ids?.length}
              >
                <CheckCircle size={20} />
                <span>Verificar Respuesta</span>
              </button>
            ) : (
              <button onClick={handleNext} className="pro-btn-main active">
                <span>{currentIdx === questions.length - 1 ? 'Finalizar' : 'Siguiente Pregunta'}</span>
                <ChevronLeft size={20} style={{ transform: 'rotate(180deg)' }} />
              </button>
            )}
          </div>
        </footer>
      </main>

      <style>{`
        .progress-container-mini {
          width: 120px;
          height: 6px;
          background: #f1f5f9;
          border-radius: 10px;
          position: relative;
        }
        .progress-bar-mini {
          height: 100%;
          background: var(--success);
          border-radius: 10px;
          transition: width 0.3s;
        }
        .progress-dot {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 10px;
          height: 10px;
          background: white;
          border: 2px solid var(--success);
          border-radius: 50%;
          transition: left 0.3s;
        }
        
        .simulator-body {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          background: #ffffff;
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
          background: #94a3b8;
          color: white;
          border: none;
          transition: all 0.2s;
          cursor: not-allowed;
        }
        .pro-btn-main.active {
          background: #64748b;
          cursor: pointer;
        }
        .pro-btn-main.active:hover {
          background: #475569;
          transform: translateY(-1px);
        }
        
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-4 { gap: 1rem; }
        .font-bold { font-weight: 700; }
        .text-sm { font-size: 0.875rem; }
        .text-indigo-600 { color: #4f46e5; }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default SimulatorView;
