import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Exam, Question } from '../types';
import QuestionCard from './QuestionCard';
import { useLanguage } from './LanguageContext';
import {
  ChevronLeft,
  Loader2,
  X,
  BookOpen,
  CheckCircle,
  ShieldCheck
} from 'lucide-react';

interface SimulatorViewProps {
  exam: Exam;
  initialQuestions: Question[];
  initialIndex?: number;
  onExit: () => void;
  onFinish: (questions: Question[]) => void;
  onPause?: (questions: Question[], currentIdx: number) => void;
  onAutoSave?: (questions: Question[], currentIdx: number) => void;
}

const SimulatorView: React.FC<SimulatorViewProps> = ({ exam, initialQuestions, initialIndex, onExit, onFinish, onPause, onAutoSave }) => {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [currentIdx, setCurrentIdx] = useState(initialIndex || 0);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const { t } = useLanguage();

  // Refs for event handlers to avoid stale closures
  const questionsRef = useRef(questions);
  const currentIdxRef = useRef(currentIdx);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

  // Bug 2: Auto-pause on tab close / visibility change
  useEffect(() => {
    const handleBeforeUnload = () => {
      onPause?.(questionsRef.current, currentIdxRef.current);
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onPause?.(questionsRef.current, currentIdxRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onPause]);

  // Bug 3: 10-minute inactivity auto-pause
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setShowInactivityModal(true);
    }, INACTIVITY_TIMEOUT);
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'touchstart', 'click'];
    const handler = () => {
      if (!showInactivityModal) resetInactivityTimer();
    };
    events.forEach(e => window.addEventListener(e, handler));
    resetInactivityTimer(); // start timer
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivityTimer, showInactivityModal]);

  // Sincronizar cuando llegan más preguntas del background
  // Preserve user answers when merging new background-generated questions
  useEffect(() => {
    if (initialQuestions.length > questions.length) {
      setQuestions(prev => {
        const merged = [...prev];
        // Append only the new questions that arrived from background generation
        for (let i = prev.length; i < initialQuestions.length; i++) {
          merged.push(initialQuestions[i]);
        }
        return merged;
      });
    }
  }, [initialQuestions.length]);

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      onFinish(questions);
    }
  };

  const currentQuestion = questions[currentIdx];

  const handleAnswer = (selectedIds: string[]) => {
    const updated = [...questions];
    updated[currentIdx] = { ...updated[currentIdx], user_selected_ids: selectedIds };
    setQuestions(updated);
    // Auto-save progress to DynamoDB every time user answers
    onAutoSave?.(updated, currentIdx);
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

  // Detect mobile viewport for layout adjustments
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-container animate-fade-in" style={{ zIndex: 2000, position: 'fixed', inset: 0 }}>
      {!isMobile && (
        <aside className="mini-sidebar">
          <div className="brand-logo mb-3" style={{ background: 'var(--primary)', color: 'white', padding: '8px', borderRadius: '10px' }}>
            <ShieldCheck size={24} />
          </div>
          <button className="mini-nav-item active" title={t('simulator')}>
            <BookOpen size={20} />
          </button>
        </aside>
      )}

      <main className="main-content" style={isMobile ? { marginLeft: 0 } : undefined}>
        {/* Mobile compact header */}
        {isMobile ? (
          <header className="sim-mobile-header">
            <div className="sim-mobile-header-row">
              <div className="sim-mobile-breadcrumbs">
                <span>{exam.name}</span>
                <ChevronLeft size={12} style={{ transform: 'rotate(180deg)' }} />
                <span className="sim-mobile-current">{t('simulator')}</span>
              </div>
              <div className="sim-mobile-actions">
                {onPause && (
                  <button onClick={() => setShowPauseConfirm(true)} className="sim-mobile-pause-btn">
                    ⏸
                  </button>
                )}
                <button onClick={onExit} className="sim-mobile-close-btn">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="sim-mobile-progress-row">
              <span className="sim-mobile-counter">{t('question')} {currentIdx + 1}/{questions.length}</span>
              <div className="progress-container-mini" style={{ flex: 1 }}>
                <div className="progress-bar-mini" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className="badge-green" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>
                <CheckCircle size={12} />
              </div>
            </div>
          </header>
        ) : (
          <header className="view-header">
            <div className="view-header-left">
              <div className="breadcrumbs">
                <span className="text-sm font-medium">{exam.name}</span>
                <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                <span className="current text-indigo-600">{t('simulator')}</span>
              </div>
            </div>

            <div className="header-center flex items-center gap-4">
              <span className="text-sm font-bold text-slate-700">{t('question')} {currentIdx + 1} / {questions.length}</span>
              <div className="progress-container-mini">
                <div className="progress-bar-mini" style={{ width: `${progressPercent}%` }}></div>
                <div className="progress-dot" style={{ left: `${progressPercent}%` }}></div>
              </div>
            </div>

            <div className="view-header-right flex items-center gap-4">
              <div className="badge-green">
                <CheckCircle size={14} />
                <span>{t('saved')}</span>
              </div>
              {onPause && (
                <button onClick={() => setShowPauseConfirm(true)} className="pause-btn" title="Pausar examen">
                  ⏸ Pausar
                </button>
              )}
              <button onClick={onExit} className="icon-btn-circle">
                <X size={20} />
              </button>
            </div>
          </header>
        )}

        {/* Pause confirmation modal */}
        {showPauseConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: 16, padding: '2rem', maxWidth: 400, width: '90%', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>⏸ {t('pauseTitle')}</h3>
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{t('pauseMessage')} {currentIdx + 1} {t('pauseWhenReturn')}</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={() => setShowPauseConfirm(false)} style={{ padding: '0.625rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>{t('continueExam')}</button>
                <button onClick={() => onPause?.(questions, currentIdx)} style={{ padding: '0.625rem 1.25rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>{t('pauseAndExit')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Inactivity modal (Bug 3) */}
        {showInactivityModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: 16, padding: '2rem', maxWidth: 400, width: '90%', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>⏸ {t('inactivityTitle') !== 'inactivityTitle' ? t('inactivityTitle') : 'Examen pausado'}</h3>
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{t('inactivityMessage') !== 'inactivityMessage' ? t('inactivityMessage') : 'Tu examen ha sido pausado por inactividad. ¿Deseas continuar?'}</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={() => { setShowInactivityModal(false); resetInactivityTimer(); }} style={{ padding: '0.625rem 1.25rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>{t('inactivityContinue') !== 'inactivityContinue' ? t('inactivityContinue') : 'Continuar'}</button>
                <button onClick={() => onPause?.(questions, currentIdx)} style={{ padding: '0.625rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>{t('pauseAndExit') || 'Salir'}</button>
              </div>
            </div>
          </div>
        )}

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
              <p>{t('loading')}</p>
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
            <span>{t('previous')}</span>
          </button>

          <div className="footer-actions">
            {!currentQuestion?.is_verified ? (
              <button
                onClick={handleVerify}
                className={`pro-btn-main ${currentQuestion?.user_selected_ids?.length ? 'active' : ''}`}
                disabled={!currentQuestion?.user_selected_ids?.length}
              >
                <CheckCircle size={20} />
                <span>{t('verifyAnswer')}</span>
              </button>
            ) : (
              <button onClick={handleNext} className="pro-btn-main active">
                <span>{currentIdx === questions.length - 1 ? t('finish') : t('next')}</span>
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
          padding: 1rem 2rem;
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
        
        .pause-btn {
          padding: 0.375rem 0.75rem;
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pause-btn:hover { background: #fde68a; }

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
          background: #cbd5e1;
          color: #64748b;
          border: none;
          transition: all 0.2s;
          cursor: not-allowed;
          font-size: 0.9375rem;
        }
        .pro-btn-main.active {
          background: var(--primary);
          color: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }
        .pro-btn-main.active:hover {
          background: var(--primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }
        
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-4 { gap: 1rem; }
        .font-bold { font-weight: 700; }
        .text-sm { font-size: 0.875rem; }
        .text-indigo-600 { color: #4f46e5; }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        /* Mobile optimizations for simulator */
        @media (max-width: 768px) {
          .simulator-body { padding: 0.5rem; }
          .view-footer { padding: 0.4rem 0.5rem; min-height: 44px; }
          .pro-btn-main { padding: 0.5rem 0.85rem; font-size: 0.8rem; border-radius: 10px; gap: 0.5rem; }
          .btn-ghost { padding: 0.35rem 0.5rem; font-size: 0.8rem; }
        }

        /* Mobile header styles */
        .sim-mobile-header {
          background: white;
          border-bottom: 1px solid var(--border-default, #e5e7eb);
          padding: 0.5rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .sim-mobile-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sim-mobile-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: #64748b;
          min-width: 0;
          overflow: hidden;
        }
        .sim-mobile-breadcrumbs span:first-child {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }
        .sim-mobile-current {
          color: #4f46e5;
          font-weight: 600;
          white-space: nowrap;
        }
        .sim-mobile-actions {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          flex-shrink: 0;
        }
        .sim-mobile-pause-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 0;
        }
        .sim-mobile-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: none;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          cursor: pointer;
          padding: 0;
        }
        .sim-mobile-close-btn:hover { background: #f1f5f9; }
        .sim-mobile-progress-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .sim-mobile-counter {
          font-size: 0.7rem;
          font-weight: 700;
          color: #334155;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default SimulatorView;
