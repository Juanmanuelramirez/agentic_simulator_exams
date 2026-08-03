import React from 'react';
import type { UserProfile, ExamAttempt, Exam, StudyGuide } from '../types';
import { History, BookOpen, TrendingUp, Award, Loader2, CheckCircle, Play, Target, Zap } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import DocumentationLinks from './StudyDayResources';
import VideoRecommendations from './VideoRecommendations';

/** Placeholder con gradiente cuando el examen no tiene imagen */
const ExamImagePlaceholder: React.FC<{ provider: string }> = ({ provider }) => (
    <div style={{
        width: '100%',
        aspectRatio: '16/9',
        borderRadius: '16px 16px 0 0',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.95rem',
        letterSpacing: '0.5px',
    }}>
        {provider}
    </div>
);

interface UserDashboardProps {
    user: UserProfile;
    attempts: ExamAttempt[];
    exams: Exam[];
    studyGuide: StudyGuide | null;
    isGeneratingGuide: boolean;
    onStartExam: (examId: string) => void;
    onResumeExam: (attempt: ExamAttempt) => void;
    onViewDetail: (attemptId: string) => void;
    onGenerateGuide: () => void;
    onToggleTask: (taskId: string) => void;
    initialTab?: 'overview' | 'history' | 'study';
    readOnly?: boolean;
    trialBanner?: React.ReactNode;
}

const UserDashboard: React.FC<UserDashboardProps> = ({
    user, attempts, exams, studyGuide, isGeneratingGuide,
    onStartExam, onResumeExam, onViewDetail, onGenerateGuide, onToggleTask,
    initialTab = 'overview', readOnly = false, trialBanner
}) => {
    const [activeTab, setActiveTab] = React.useState<'overview' | 'history' | 'study'>(initialTab);
    const [failedImages, setFailedImages] = React.useState<Set<string>>(new Set());
    const { t } = useLanguage();

    React.useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const completedAttempts = attempts.filter(a => a.status === 'completed');
    const averageScore = completedAttempts.length > 0
        ? Math.round(completedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedAttempts.length)
        : 0;
    const passedAttempts = completedAttempts.filter(a => (a.score || 0) >= 70).length;
    const bestScore = completedAttempts.length > 0
        ? Math.max(...completedAttempts.map(a => a.score || 0))
        : 0;

    return (
        <div className="user-dashboard animate-fade-in">
            <header className="dashboard-header mb-2">
                <div>
                    <h1>{t('welcome')}, {user.name}</h1>
                    <p className="text-secondary">{t('yourProgress')}</p>
                </div>
            </header>

            {trialBanner}

            {/* Tabs de navegación */}
            <div className="user-tabs mb-3">
                {(['overview', 'history', 'study'] as const).map(tab => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'overview' ? t('myExams') : tab === 'history' ? t('history') : t('studyGuide')}
                    </button>
                ))}
            </div>

            <main className="dashboard-content">
                {activeTab === 'overview' && (
                    <div className="overview-container animate-fade-in">
                        {/* Stats personales del alumno */}
                        <section className="stats-row mb-3">
                            <div className="stat-card">
                                <div className="stat-icon-wrap blue">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="stat-data">
                                    <span className="stat-label">{t('examsCompleted')}</span>
                                    <span className="stat-value">{completedAttempts.length}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon-wrap green">
                                    <CheckCircle size={24} />
                                </div>
                                <div className="stat-data">
                                    <span className="stat-label">{t('passed')} (≥70%)</span>
                                    <span className="stat-value">{passedAttempts}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon-wrap purple">
                                    <Award size={24} />
                                </div>
                                <div className="stat-data">
                                    <span className="stat-label">{t('bestScore')}</span>
                                    <span className="stat-value">{bestScore}%</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon-wrap orange">
                                    <Target size={24} />
                                </div>
                                <div className="stat-data">
                                    <span className="stat-label">{t('averageScore')}</span>
                                    <span className="stat-value">{averageScore}%</span>
                                </div>
                            </div>
                        </section>

                        {/* Exámenes pausados */}
                        {(() => {
                            const pausedAttempts = attempts.filter(a => a.status === 'paused');
                            if (pausedAttempts.length === 0) return null;
                            return (
                                <section style={{ marginBottom: '1.5rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 16, padding: '1.25rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e', marginBottom: '0.75rem' }}>⏸ {t('pausedExams')}</h3>
                                    {pausedAttempts.map(attempt => {
                                        const exam = exams.find(e => e.id === attempt.exam_id);
                                        return (
                                            <div key={attempt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'white', borderRadius: 10, border: '1px solid #fde68a', marginBottom: '0.5rem' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{exam?.name || attempt.exam_id}</div>
                                                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                                        Pregunta {(attempt.paused_at_index || 0) + 1}/{attempt.questions?.length || 0} · {attempt.mode === 'simulator' ? t('simulator') : t('realExam')}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => onResumeExam(attempt)}
                                                    style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}
                                                >
                                                    <Play size={14} /> Continuar
                                                </button>
                                            </div>
                                        );
                                    })}
                                </section>
                            );
                        })()}

                        {/* Catálogo de exámenes */}
                        <section className="catalog-section card">
                            <div className="card-header-actions">
                                <div>
                                    <h3 className="section-title">{t('availableCerts')}</h3>
                                    <p className="text-secondary text-sm">{t('selectCertToStart')}</p>
                                </div>
                            </div>

                            {exams.length === 0 ? (
                                <div className="empty-state text-center p-3">
                                    <BookOpen className="icon-faded mb-1" size={48} />
                                    <p>{t('noCertsAvailable')}</p>
                                    <p className="text-secondary text-sm">{t('adminMustAdd')}</p>
                                </div>
                            ) : (
                                <div className="exams-grid-user">
                                    {exams.map(exam => {
                                        const examAttempts = completedAttempts.filter(a => a.exam_id === exam.id);
                                        const examBest = examAttempts.length > 0
                                            ? Math.max(...examAttempts.map(a => a.score || 0))
                                            : null;
                                        return (
                                            <div key={exam.id} className="exam-card-user">
                                                {/* Imagen del examen */}
                                                {exam.image_url && !failedImages.has(exam.id) ? (
                                                    <img
                                                        src={exam.image_url}
                                                        alt={exam.name}
                                                        loading="lazy"
                                                        onError={() => setFailedImages(prev => new Set(prev).add(exam.id))}
                                                        style={{ aspectRatio: '16/9', objectFit: 'cover', borderRadius: '16px 16px 0 0', margin: '-1.5rem -1.5rem 0 -1.5rem', width: 'calc(100% + 3rem)' }}
                                                    />
                                                ) : (
                                                    <div style={{ margin: '-1.5rem -1.5rem 0 -1.5rem', width: 'calc(100% + 3rem)' }}>
                                                        <ExamImagePlaceholder provider={exam.provider} />
                                                    </div>
                                                )}
                                                <div className="exam-card-header">
                                                    <div className="exam-provider-badge">{exam.provider}</div>
                                                    {examBest !== null && (
                                                        <span className={`score-badge ${examBest >= 70 ? 'pass' : 'fail'}`}>
                                                            Mejor: {examBest}%
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="exam-card-name">{exam.name}</h3>
                                                <p className="exam-card-desc text-secondary text-sm">
                                                    {exam.description || `${exam.domains.length} {t('domains')} · ${exam.total_questions_official || 65} {t('questions')} oficiales`}
                                                </p>
                                                <div className="exam-card-meta">
                                                    <span className="meta-item">
                                                        <Zap size={12} /> {exam.domains.length} {t('domains')}
                                                    </span>
                                                    <span className="meta-item">
                                                        <History size={12} /> {examAttempts.length} {t('attempts')}
                                                    </span>
                                                </div>
                                                <button
                                                    className="start-exam-btn"
                                                    onClick={() => !readOnly && onStartExam(exam.id)}
                                                    style={readOnly ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                                                    disabled={readOnly}
                                                >
                                                    <Play size={16} />
                                                    {examAttempts.length > 0 ? t('retryExam') : t('startSimulator')}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="history-view card">
                        <h3 className="mb-2">{t('attemptHistory')}</h3>
                        <div className="history-list">
                            {attempts.length === 0 ? (
                                <div className="empty-state text-center p-3">
                                    <History className="icon-faded mb-1" size={48} />
                                    <p>{t('noExamsYet')}</p>
                                    <p className="text-secondary text-sm">{t('goToMyExams')}</p>
                                </div>
                            ) : (
                                attempts
                                    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                                    .map(attempt => {
                                        const exam = exams.find(e => e.id === attempt.exam_id);
                                        return (
                                            <div key={attempt.id} className="history-item card mb-1" onClick={() => attempt.status === 'paused' ? onResumeExam(attempt) : onViewDetail(attempt.id)}>
                                                <div className="item-main">
                                                    <h4>{exam?.name || attempt.exam_id}</h4>
                                                    <p className="text-secondary text-sm">
                                                        {new Date(attempt.start_time).toLocaleDateString('es-MX', { dateStyle: 'medium' })}
                                                        {' · '}{attempt.mode === 'simulator' ? t('simulator') : t('realExam')}
                                                        {' · '}{attempt.questions?.length || 0} {t('questions')}
                                                    </p>
                                                </div>
                                                {attempt.status === 'paused' ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontWeight: 700, fontSize: '0.875rem' }}>
                                                        ⏸ {t('paused')}
                                                    </div>
                                                ) : (
                                                    <div className={`item-score ${(attempt.score || 0) >= 70 ? 'pass' : 'fail'}`}>
                                                        {attempt.score}%
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'study' && (
                    <div className="study-guide-view card">
                        <div className="ai-header">
                            <h3>{t('personalizedGuide')}</h3>
                            <div className="badge">POWERED BY BEDROCK</div>
                        </div>
                        <p className="text-secondary mb-2">
                            Basado en tus errores recientes, la IA genera un plan de repaso personalizado para maximizar tu retención.
                        </p>

                        {!studyGuide ? (
                            <div className="empty-guide-state text-center p-2">
                                <button
                                    className="ai-btn pulse"
                                    onClick={onGenerateGuide}
                                    disabled={isGeneratingGuide || completedAttempts.length === 0}
                                >
                                    {isGeneratingGuide ? (
                                        <><Loader2 size={18} className="animate-spin" /> {t('generatingGuide')}</>
                                    ) : (
                                        <><BookOpen size={18} /> {t('generateGuide')}</>
                                    )}
                                </button>
                                {completedAttempts.length === 0 && (
                                    <p className="text-secondary text-sm mt-1">
                                        {t('completeExamFirst')}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="real-guide animate-fade-in">
                                <div className="guide-header card p-1 mb-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4>{studyGuide.title}</h4>
                                        <span className="text-secondary text-xs">{new Date(studyGuide.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="weak-areas-chips">
                                        {studyGuide.weak_areas.map((area, i) => (
                                            <span key={i} className="chip">
                                                <CheckCircle size={12} /> {area}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Hint banner explaining how to use the study plan */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.75rem 1rem', marginBottom: '1rem',
                                    background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)',
                                    borderRadius: '10px', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5
                                }}>
                                    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>💡</span>
                                    <span>{t('studyGuideHint') || 'Marca cada tarea completada para registrar tu avance diario. Usa los enlaces de documentación y videos para profundizar en cada tema.'}</span>
                                </div>

                                <div className="study-plan-container">
                                    {studyGuide.plan_days.map((dayPlan) => (
                                        <div key={dayPlan.day} className="day-card card mb-2 p-2">
                                            <h5 className="mb-1 text-primary">Día {dayPlan.day}: {dayPlan.title}</h5>
                                            <div className="tasks-list">
                                                {dayPlan.tasks.map(taskId => {
                                                    const task = studyGuide.tasks.find(t => t.id === taskId);
                                                    if (!task) return null;
                                                    return (
                                                        <div key={task.id} className="task-item flex items-center justify-between p-1 border-bottom-subtle">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={task.completed}
                                                                    onChange={() => {
                                                                        if (!task.completed) {
                                                                            onToggleTask(task.id);
                                                                            // Show congratulation toast
                                                                            const toast = document.createElement('div');
                                                                            toast.className = 'congrats-toast';
                                                                            toast.textContent = '🎉 ' + (t('taskCompleted') || '¡Excelente! Sigue así');
                                                                            document.body.appendChild(toast);
                                                                            setTimeout(() => toast.classList.add('show'), 10);
                                                                            setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
                                                                        } else {
                                                                            onToggleTask(task.id);
                                                                        }
                                                                    }}
                                                                    className="task-checkbox"
                                                                    title={t('markTaskHint') || 'Marca esta tarea cuando la completes'}
                                                                />
                                                                <span className={task.completed ? 'completed-text' : ''}>{task.text}</span>
                                                            </div>
                                                            {task.official_link && (
                                                                <a href={task.official_link} target="_blank" rel="noopener noreferrer" className="link-icon" title={t('viewOfficialDoc') || 'Consulta la documentación oficial para profundizar en este tema'}>
                                                                    <BookOpen size={16} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <DocumentationLinks documentation={dayPlan.documentation} />
                                            <VideoRecommendations videos={dayPlan.videos} />
                                        </div>
                                    ))}
                                </div>

                                <button className="outline-btn mt-2" onClick={onGenerateGuide} disabled={isGeneratingGuide}>
                                    {t('updatePlan')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <style>{`
                .user-tabs { display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border-default); padding-bottom: 0; }
                .tab-btn { padding: 0.75rem 1.25rem; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; font-size: 0.9375rem; }
                .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
                .tab-btn:hover:not(.active) { color: var(--text-main); }

                .dashboard-header { display: flex; justify-content: space-between; align-items: center; }
                .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
                .stat-card { display: flex; align-items: center; gap: 1.25rem; padding: 1.5rem; background: var(--bg-surface); border: 1px solid var(--border-default); box-shadow: var(--shadow-sm); border-radius: 16px; }
                .stat-icon-wrap { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .stat-icon-wrap.blue { background: rgba(59,130,246,0.08); color: #3b82f6; }
                .stat-icon-wrap.green { background: rgba(16,185,129,0.08); color: #10b981; }
                .stat-icon-wrap.purple { background: rgba(139,92,246,0.08); color: #6366F1; }
                .stat-icon-wrap.orange { background: rgba(245,158,11,0.08); color: #f59e0b; }
                .stat-label { font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em; }
                .stat-value { font-size: 1.75rem; font-weight: 800; color: var(--text-main); line-height: 1; margin-top: 0.25rem; }

                .catalog-section { padding: 0; overflow: hidden; }
                .card-header-actions { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid var(--border-default); }
                .section-title { font-size: 1.125rem; font-weight: 700; margin: 0; }

                .exams-grid-user { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; padding: 1.5rem; }
                .exam-card-user { background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 16px; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; transition: all 0.2s; overflow: hidden; }
                .exam-card-user:hover { border-color: var(--primary); box-shadow: 0 4px 20px rgba(99,102,241,0.1); transform: translateY(-2px); }
                .exam-card-header { display: flex; justify-content: space-between; align-items: center; }
                .exam-provider-badge { font-size: 0.75rem; font-weight: 700; color: var(--primary); background: rgba(99,102,241,0.08); padding: 0.25rem 0.75rem; border-radius: 20px; }
                .score-badge { font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 20px; }
                .score-badge.pass { background: #ECFDF5; color: #059669; }
                .score-badge.fail { background: #FEF2F2; color: #DC2626; }
                .exam-card-name { font-size: 1rem; font-weight: 700; color: var(--text-main); line-height: 1.3; }
                .exam-card-desc { font-size: 0.875rem; line-height: 1.5; }
                .exam-card-meta { display: flex; gap: 1rem; }
                .meta-item { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--text-secondary); }
                .start-exam-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: var(--primary); color: white; border: none; padding: 0.75rem; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-top: auto; }
                .start-exam-btn:hover { background: var(--primary-hover); transform: translateY(-1px); }

                .history-item { cursor: pointer; transition: all 0.2s; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-default); box-shadow: var(--shadow-sm); }
                .history-item:hover { transform: translateX(8px); border-color: var(--primary); }
                .item-score { font-weight: 700; font-size: 1.5rem; }
                .item-score.pass { color: var(--success); }
                .item-score.fail { color: var(--error); }

                .ai-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .ai-btn { background: linear-gradient(135deg, var(--primary), #8b5cf6); color: white; border: none; padding: 1rem 2rem; border-radius: var(--radius-xl); font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 4px 15px rgba(99,102,241,0.3); }
                .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .pulse { animation: pulse 2s infinite; }
                @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(79,70,229,0.4); } 70% { box-shadow: 0 0 0 10px rgba(79,70,229,0); } 100% { box-shadow: 0 0 0 0 rgba(79,70,229,0); } }

                .chip { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; background: #F3F4FB; border: 1px solid var(--border-default); border-radius: 8px; font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; }
                .study-plan-container { display: flex; flex-direction: column; gap: 1rem; }
                .day-card { border-left: 4px solid var(--primary); padding: 1.5rem; }
                .task-item { gap: 1rem; transition: background 0.2s; border-bottom: 1px solid #F3F4FB; }
                .task-item:last-child { border-bottom: none; }
                .task-checkbox { width: 1.25rem; height: 1.25rem; cursor: pointer; accent-color: var(--primary); }
                .completed-text { text-decoration: line-through; color: var(--text-secondary); opacity: 0.5; }
                .link-icon { color: var(--primary); opacity: 0.7; transition: all 0.2s; }
                .link-icon:hover { opacity: 1; }
                .congrats-toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(20px); background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 700; font-size: 0.9375rem; box-shadow: 0 8px 24px rgba(16,185,129,0.3); opacity: 0; transition: all 0.3s ease; z-index: 9999; pointer-events: none; }
                .congrats-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .justify-between { justify-content: space-between; }
                .gap-1 { gap: 0.5rem; }
                .text-xs { font-size: 0.75rem; }
                .text-sm { font-size: 0.875rem; }
                .mt-1 { margin-top: 0.5rem; }
            `}</style>
        </div>
    );
};

export default UserDashboard;
