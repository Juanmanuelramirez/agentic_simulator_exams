import React, { useState } from 'react';
import type { UserProfile, ExamAttempt, Exam, StudyGuide } from '../types';
import { LayoutDashboard, History, BookOpen, TrendingUp, Award, Loader2, CheckCircle } from 'lucide-react';

interface UserDashboardProps {
    user: UserProfile;
    attempts: ExamAttempt[];
    exams: Exam[];
    studyGuide: StudyGuide | null;
    isGeneratingGuide: boolean;
    onStartExam: (examId: string) => void;
    onViewDetail: (attemptId: string) => void;
    onGenerateGuide: () => void;
    onToggleTask: (taskId: string) => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({
    user, attempts, exams, studyGuide, isGeneratingGuide,
    onStartExam, onViewDetail, onGenerateGuide, onToggleTask
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'study'>('overview');

    const completedAttempts = attempts.filter(a => a.status === 'completed');
    const averageScore = completedAttempts.length > 0
        ? Math.round(completedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedAttempts.length)
        : 0;

    return (
        <div className="user-dashboard animate-fade-in">
            <header className="dashboard-header mb-2">
                <div>
                    <h1>Bienvenido, {user.name}</h1>
                    <p className="text-secondary">Tu progreso de aprendizaje hoy</p>
                </div>
                <div className="streak-badge">
                    <Award size={20} />
                    <span>{user.streak} días de racha</span>
                </div>
            </header>

            <nav className="dashboard-nav mb-2">
                <button
                    className={activeTab === 'overview' ? 'active' : ''}
                    onClick={() => setActiveTab('overview')}
                >
                    <LayoutDashboard size={18} /> Resumen
                </button>
                <button
                    className={activeTab === 'history' ? 'active' : ''}
                    onClick={() => setActiveTab('history')}
                >
                    <History size={18} /> Historial
                </button>
                <button
                    className={activeTab === 'study' ? 'active' : ''}
                    onClick={() => setActiveTab('study')}
                >
                    <BookOpen size={18} /> Guía de Estudio
                </button>
            </nav>

            <main className="dashboard-content">
                {activeTab === 'overview' && (
                    <div className="overview-container animate-fade-in">
                        <section className="stats-grid mb-3">
                            <div className="stat-card card">
                                <div className="stat-icon users"><TrendingUp size={24} /></div>
                                <div className="stat-info">
                                    <div className="stat-label">Usuarios Activos</div>
                                    <div className="stat-value">1,248</div>
                                </div>
                            </div>
                            <div className="stat-card card">
                                <div className="stat-icon exams"><BookOpen size={24} /></div>
                                <div className="stat-info">
                                    <div className="stat-label">Exámenes en Catálogo</div>
                                    <div className="stat-value">{exams.length}</div>
                                </div>
                            </div>
                            <div className="stat-card card">
                                <div className="stat-icon questions"><Award size={24} /></div>
                                <div className="stat-info">
                                    <div className="stat-label">Preguntas Generadas (Mes)</div>
                                    <div className="stat-value">45.2K</div>
                                </div>
                            </div>
                            <div className="stat-card card">
                                <div className="stat-icon rate"><CheckCircle size={24} /></div>
                                <div className="stat-info">
                                    <div className="stat-label">Tasa Media Aprobación</div>
                                    <div className="stat-value">{averageScore}%</div>
                                </div>
                            </div>
                        </section>

                        <section className="catalog-section card">
                            <div className="catalog-header mb-2">
                                <div>
                                    <h3>Catálogo de Certificaciones</h3>
                                    <p className="text-secondary">Gestiona los blueprints ingeridos por el Agente Librarian.</p>
                                </div>
                                <button className="primary" onClick={() => onGenerateGuide()}>
                                    Ingestar Nueva Guía (URL/PDF)
                                </button>
                            </div>

                            <div className="table-responsive">
                                <table className="catalog-table">
                                    <thead>
                                        <tr>
                                            <th>CERTIFICACIÓN / BLUEPRINT</th>
                                            <th>PROVEEDOR</th>
                                            <th>ÚLTIMA INGESTA (AI)</th>
                                            <th>ESTADO</th>
                                            <th>ACCIONES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {exams.map(exam => (
                                            <tr key={exam.id}>
                                                <td>
                                                    <div className="exam-cell">
                                                        <div className="exam-avatar">{exam.provider.charAt(0)}</div>
                                                        <div>
                                                            <div className="exam-name">{exam.name}</div>
                                                            <div className="exam-id">{exam.id.toUpperCase()}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{exam.provider}</td>
                                                <td>Hace 2 días</td>
                                                <td>
                                                    <span className="status-badge active">Activo</span>
                                                </td>
                                                <td>
                                                    <button className="secondary sm" onClick={() => onStartExam(exam.id)}>
                                                        Iniciar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="history-view card">
                        <h3>Tus Intentos Anteriores</h3>
                        <div className="history-list">
                            {completedAttempts.length === 0 ? (
                                <div className="empty-state text-center p-3">
                                    <History className="icon-faded mb-1" size={48} />
                                    <p>No has completado exámenes aún.</p>
                                </div>
                            ) : (
                                completedAttempts.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()).map(attempt => {
                                    const exam = exams.find(e => e.id === attempt.exam_id);
                                    return (
                                        <div key={attempt.id} className="history-item card mb-1" onClick={() => onViewDetail(attempt.id)}>
                                            <div className="item-main">
                                                <h4>{exam?.name}</h4>
                                                <p className="text-secondary">{new Date(attempt.start_time).toLocaleDateString()}</p>
                                            </div>
                                            <div className={`item-score ${attempt.score && attempt.score >= 70 ? 'pass' : 'fail'}`}>
                                                {attempt.score}%
                                            </div>
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
                            <h3>Generador de Guía con IA</h3>
                            <div className="badge">POWERED BY BEDROCK</div>
                        </div>
                        <p className="text-secondary mb-2">Basado en tus errores recientes, la IA generará una guía personalizada de repaso para maximizar tu retención.</p>

                        {!studyGuide ? (
                            <div className="empty-guide-state text-center p-2">
                                <button
                                    className="ai-btn pulse"
                                    onClick={onGenerateGuide}
                                    disabled={isGeneratingGuide}
                                >
                                    {isGeneratingGuide ? (
                                        <><Loader2 size={18} className="animate-spin" /> Generando Guía...</>
                                    ) : (
                                        <><BookOpen size={18} /> Generar Guía Personalizada</>
                                    )}
                                </button>
                                <div className="placeholder-guide card p-2 mt-2 text-left">
                                    <p className="font-bold mb-1">Tus temas clave detectados:</p>
                                    <ul className="text-secondary">
                                        <li>• Seguridad en Infraestructura y IAM</li>
                                        <li>• Optimización de Costos en Almacenamiento S3</li>
                                        <li>• Estrategias de Backup y Disponibilidad</li>
                                    </ul>
                                </div>
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
                                                                    onChange={() => onToggleTask(task.id)}
                                                                    className="task-checkbox"
                                                                />
                                                                <span className={task.completed ? 'completed-text' : ''}>{task.text}</span>
                                                            </div>
                                                            {task.official_link && (
                                                                <a
                                                                    href={task.official_link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="link-icon"
                                                                    title="Ver documentación oficial"
                                                                >
                                                                    <BookOpen size={16} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="guide-content markdown-body card p-2 mt-2">
                                    <p className="text-secondary mb-1">Información Adicional:</p>
                                    {studyGuide.content.split('\n').map((line, i) => {
                                        if (line.startsWith('# ')) return <h1 key={i}>{line.substring(2)}</h1>;
                                        if (line.startsWith('## ')) return <h2 key={i}>{line.substring(3)}</h2>;
                                        if (line.startsWith('### ')) return <h3 key={i}>{line.substring(4)}</h3>;
                                        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-1">{line.substring(2)}</li>;
                                        if (line.trim() === '') return <br key={i} />;
                                        return <p key={i}>{line}</p>;
                                    })}
                                </div>

                                <button className="outline-btn mt-2" onClick={onGenerateGuide} disabled={isGeneratingGuide}>
                                    Actualizar Plan de Estudio
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <style>{`
                .dashboard-header { display: flex; justify-content: space-between; align-items: center; }
                .streak-badge { padding: 0.5rem 1rem; border-radius: 2rem; display: flex; align-items: center; gap: 0.5rem; background: var(--bg-surface); border: 1px solid var(--border-default); font-weight: 600; color: #f59e0b; }
                .dashboard-nav { display: flex; gap: 1rem; border-bottom: 1px solid var(--border-default); }
                .dashboard-nav button { background: none; border: none; padding: 0.75rem 1rem; color: var(--text-secondary); border-radius: 0; min-height: auto; }
                .dashboard-nav button.active { color: var(--primary); border-bottom: 2px solid var(--primary); font-weight: 600; }
                
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
                .stat-card { display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-default); }
                .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .stat-icon.users { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .stat-icon.exams { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .stat-icon.questions { background: rgba(139, 92, 246, 0.1); color: #a855f7; }
                .stat-icon.rate { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
                .stat-label { font-size: 0.875rem; color: var(--text-secondary); }
                .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--text-main); }

                .catalog-header { display: flex; justify-content: space-between; align-items: center; }
                .catalog-table { width: 100%; border-collapse: collapse; text-align: left; }
                .catalog-table th { padding: 1rem; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid var(--border-default); }
                .catalog-table td { padding: 1rem; border-bottom: 1px solid var(--border-default); }
                .exam-cell { display: flex; align-items: center; gap: 0.75rem; }
                .exam-avatar { width: 32px; height: 32px; background: var(--bg-main); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--primary); }
                .exam-name { font-weight: 600; color: var(--text-main); }
                .exam-id { font-size: 0.75rem; color: var(--text-secondary); }
                .status-badge { padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 600; }
                .status-badge.active { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
                
                button.sm { padding: 0.375rem 0.75rem; font-size: 0.875rem; min-height: 32px; }
                .mb-1 { margin-bottom: 0.5rem; }
                .mb-2 { margin-bottom: 1rem; }
                .mb-3 { margin-bottom: 1.5rem; }
                .primary { background: var(--primary); color: white; border: none; }
                .primary:hover { opacity: 0.9; }

                .ai-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .ai-btn { background: linear-gradient(135deg, var(--primary), #8b5cf6); color: white; border: none; padding: 1rem 2rem; border-radius: var(--radius-xl); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
                .pulse { animation: pulse 2s infinite; }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
                }

                .markdown-body h1 { font-size: 1.5rem; margin-bottom: 1rem; color: var(--primary); }
                .markdown-body h2 { font-size: 1.2rem; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid var(--border-default); }
                
                .history-item { cursor: pointer; transition: transform 0.2s; padding: 1rem; display: flex; justify-content: space-between; align-items: center; }
                .history-item:hover { transform: translateX(4px); border-color: var(--primary); }
                .item-score { font-weight: 700; font-size: 1.25rem; }
                .item-score.pass { color: var(--success); }
                .item-score.fail { color: var(--error); }
                
                .chip { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-default); border-radius: 4px; font-size: 0.75rem; color: var(--text-secondary); }

                .study-plan-container { display: flex; flex-direction: column; gap: 1rem; }
                .day-card { border-left: 4px solid var(--primary); background: rgba(255, 255, 255, 0.01); }
                .task-item { gap: 1rem; transition: background 0.2s; }
                .task-item:hover { background: rgba(255, 255, 255, 0.03); }
                .task-checkbox { width: 1.1rem; height: 1.1rem; cursor: pointer; border-radius: 4px; border: 1.5px solid var(--border-default); background: transparent; }
                .completed-text { text-decoration: line-through; color: var(--text-secondary); opacity: 0.7; }
                .link-icon { color: var(--primary); opacity: 0.7; transition: opacity 0.2s; }
                .link-icon:hover { opacity: 1; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .justify-between { justify-content: space-between; }
                .gap-1 { gap: 0.5rem; }
                .ml-1 { margin-left: 1rem; }
                .border-bottom-subtle { border-bottom: 1px solid var(--border-default); }
                .text-xs { font-size: 0.75rem; }
            `}</style>
        </div>
    );
};

export default UserDashboard;
