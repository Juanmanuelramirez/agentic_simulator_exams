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
        <div className="user-dashboard">
            <header className="dashboard-header">
                <div>
                    <h1>Bienvenido, {user.name}</h1>
                    <p className="subtitle">Tu progreso de aprendizaje hoy</p>
                </div>
                <div className="streak-badge">
                    <Award size={20} />
                    <span>{user.streak} días de racha</span>
                </div>
            </header>

            <nav className="dashboard-nav">
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
                        <section className="stats-cards">
                            <div className="stat-card p-stats">
                                <TrendingUp className="icon" />
                                <div className="val">{averageScore}%</div>
                                <div className="lbl">Puntaje Promedio</div>
                            </div>
                            <div className="stat-card e-stats">
                                <Clock className="icon" />
                                <div className="val">{completedAttempts.length}</div>
                                <div className="lbl">Exámenes Completados</div>
                            </div>
                        </section>

                        <section className="chart-section card">
                            <h3>Desempeño por Dominios</h3>
                            <div className="chart-container">
                                <PerformanceChart attempts={attempts} />
                            </div>
                        </section>

                        <section className="available-exams card">
                            <h3>Simuladores Disponibles</h3>
                            <div className="exam-list">
                                {exams.map(exam => (
                                    <div key={exam.id} className="exam-item">
                                        <div className="exam-info">
                                            <h4>{exam.name}</h4>
                                            <p>{exam.provider} • {exam.duration_minutes} min</p>
                                        </div>
                                        <button className="primary-btn" onClick={() => onStartExam(exam.id)}>
                                            Iniciar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="history-view card">
                        <h3>Tus Intentos Anteriores</h3>
                        <div className="history-list">
                            {completedAttempts.length === 0 ? (
                                <p className="empty-state">No has completado exámenes aún.</p>
                            ) : (
                                completedAttempts.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()).map(attempt => {
                                    const exam = exams.find(e => e.id === attempt.exam_id);
                                    return (
                                        <div key={attempt.id} className="history-item" onClick={() => onViewDetail(attempt.id)}>
                                            <div className="item-main">
                                                <h4>{exam?.name}</h4>
                                                <p>{new Date(attempt.start_time).toLocaleDateString()}</p>
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
                        <h3>Generador de Guía con IA (Bedrock)</h3>
                        <p>Basado en tus errores recientes, la IA generará una guía personalizada de repaso.</p>
                        <button className="ai-btn">
                            <BookOpen size={18} /> Generar Guía Personalizada
                        </button>
                        <div className="placeholder-guide">
                            <p>Tus temas débiles detectados:</p>
                            <ul>
                                <li>Seguridad en Infraestructura</li>
                                <li>Optimización de Costos en S3</li>
                            </ul>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default UserDashboard;
