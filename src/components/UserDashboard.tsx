import React, { useState } from 'react';
import type { UserProfile, ExamAttempt, Exam } from '../types';
import { LayoutDashboard, History, BookOpen, TrendingUp, Award, Clock } from 'lucide-react';
import PerformanceChart from './PerformanceChart';

interface UserDashboardProps {
    user: UserProfile;
    attempts: ExamAttempt[];
    exams: Exam[];
    onStartExam: (examId: string) => void;
    onViewDetail: (attemptId: string) => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, attempts, exams, onStartExam, onViewDetail }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'study'>('overview');

    const completedAttempts = attempts.filter(a => a.status === 'completed');
    const averageScore = completedAttempts.length > 0
        ? Math.round(completedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedAttempts.length)
        : 0;

    return (
        <div className="user-dashboard fade-in">
            <header className="dashboard-header mb-2">
                <div>
                    <h1 className="glow-text">Bienvenido, {user.name}</h1>
                    <p className="text-secondary">Tu progreso de aprendizaje hoy</p>
                </div>
                <div className="streak-badge glass">
                    <Award size={20} className="glow-icon" />
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
                    <div className="overview-grid">
                        <section className="stats-cards grid">
                            <div className="stat-card glass">
                                <TrendingUp className="icon primary-glow" />
                                <div className="val">{averageScore}%</div>
                                <div className="lbl">Puntaje Promedio</div>
                            </div>
                            <div className="stat-card glass">
                                <Clock className="icon secondary-glow" />
                                <div className="val">{completedAttempts.length}</div>
                                <div className="lbl">Exámenes Completados</div>
                            </div>
                        </section>

                        <section className="available-exams glass card">
                            <div className="section-header">
                                <Award size={20} color="var(--primary)" />
                                <h3>Simuladores Disponibles</h3>
                            </div>
                            <div className="exam-list">
                                {exams.map(exam => (
                                    <div key={exam.id} className="exam-item glass">
                                        <div className="exam-info">
                                            <h4>{exam.name}</h4>
                                            <p className="text-secondary">{exam.provider} • {exam.duration_minutes} min</p>
                                        </div>
                                        <button className="primary-btn" onClick={() => onStartExam(exam.id)}>
                                            Iniciar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <PerformanceChart attempts={attempts} />
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="history-view glass card">
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
                                        <div key={attempt.id} className="history-item glass" onClick={() => onViewDetail(attempt.id)}>
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
                    <div className="study-guide-view glass card">
                        <div className="ai-header">
                            <h3 className="glow-text">Generador de Guía con IA</h3>
                            <div className="badge">POWERED BY BEDROCK</div>
                        </div>
                        <p className="text-secondary mb-2">Basado en tus errores recientes, la IA generará una guía personalizada de repaso para maximizar tu retención.</p>

                        <button className="ai-btn pulse">
                            <BookOpen size={18} /> Generar Guía Personalizada
                        </button>

                        <div className="placeholder-guide glass p-2 mt-2">
                            <p className="font-bold mb-1">Tus temas clave detectados:</p>
                            <ul className="text-secondary">
                                <li>• Seguridad en Infraestructura y IAM</li>
                                <li>• Optimización de Costos en Almacenamiento S3</li>
                                <li>• Estrategias de Backup y Disponibilidad</li>
                            </ul>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
                .p-3 { padding: 3rem; }
                .p-2 { padding: 1.5rem; }
                .mt-2 { margin-top: 1.5rem; }
                .section-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; }
                .ai-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .pulse { animation: pulse 2s infinite; }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
            `}</style>
        </div>
    );
};

export default UserDashboard;
