import React, { useState, useEffect } from 'react';
import type { UserProfile, Exam, ExamAttempt } from '../types';
import { Users, PlusCircle, Activity, Search, X, Loader2, Trash2, Info, Zap, BookOpen } from 'lucide-react';
import { librarian } from '../agents/librarian';

interface AdminDashboardProps {
    users: UserProfile[];
    exams: Exam[];
    attempts: ExamAttempt[];
    onAddExam: (examName: string) => Promise<void>;
    onDeleteExam: (examId: string) => void;
    initialView?: 'overview' | 'users' | 'exams' | 'analytics' | 'logs';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
    users,
    exams,
    attempts,
    onAddExam,
    onDeleteExam,
    initialView = 'overview'
}) => {
    const [activeView, setActiveView] = useState<'overview' | 'users' | 'exams' | 'analytics' | 'logs'>(initialView);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [discoveryQuery, setDiscoveryQuery] = useState('');
    const [discoveryResults, setDiscoveryResults] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedExam, setSelectedExam] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Sync from props if changed (Sidebar navigation)
    useEffect(() => {
        if (initialView && initialView !== activeView) {
            setActiveView(initialView);
        }
    }, [initialView]);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (discoveryQuery.length > 2) {
                setIsSearching(true);
                try {
                    const results = await librarian.searchCertifications(discoveryQuery);
                    setDiscoveryResults(results);
                } catch (error) {
                    console.error("Discovery error:", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setDiscoveryResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [discoveryQuery]);

    const handleAddSelected = async () => {
        if (selectedExam) {
            setIsAdding(true);
            try {
                await onAddExam(selectedExam);
                setShowModal(false);
                setDiscoveryQuery('');
                setSelectedExam(null);
            } catch (error) {
                console.error("Error adding exam:", error);
                alert("Error al añadir el simulador. Por favor verifica tu conexión o credenciales de AWS.");
            } finally {
                setIsAdding(false);
            }
        }
    };

    return (
        <div className="admin-dashboard fade-in">
            <header className="admin-header">
                <div className="header-content">
                    <h1>{activeView === 'overview' ? 'Visión General' : activeView === 'users' ? 'Gestión de Usuarios' : activeView === 'exams' ? 'Catálogo de Simuladores' : 'Desempeño de la Plataforma'}</h1>
                </div>
            </header>

            <div className="admin-content">
                {activeView === 'overview' && (
                    <div className="overview-view animate-up">
                        <div className="stats-row mb-3">
                            <div className="stat-card">
                                <div className="stat-icon-wrap blue">
                                    <Users size={24} />
                                </div>
                                <div className="stat-data">
                                    <span className="stat-label">Usuarios Activos</span>
                                    <span className="stat-value">1,248</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon-wrap green">
                                    <BookOpen size={24} />
                                </div>
                                <div className="stat-data">
                                    <span className="stat-label">Exámenes en Catálogo</span>
                                    <span className="stat-value">{exams.length}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon-wrap purple">
                                    <Activity size={24} />
                                </div>
                                <div className="stat-data">
                                    <span className="stat-label">Preguntas Generadas (Mes)</span>
                                    <span className="stat-value">45.2K</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon-wrap orange">
                                    <Zap size={24} />
                                </div>
                                <div className="stat-data">
                                    <span className="stat-label">Tasa Media Aprobación</span>
                                    <span className="stat-value">68%</span>
                                </div>
                            </div>
                        </div>

                        <div className="data-card mb-3">
                            <div className="card-header-actions">
                                <div>
                                    <h3 className="section-title">Catálogo de Certificaciones</h3>
                                    <p className="text-secondary text-sm">Gestiona los blueprints ingeridos por el Agente Librarian.</p>
                                </div>
                                <button className="pro-primary-btn" onClick={() => setShowModal(true)}>
                                    <PlusCircle size={20} />
                                    <span>Ingestar Nueva Guía (URL/PDF)</span>
                                </button>
                            </div>
                            <table className="pro-table">
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
                                                    <div className="exam-icon-box">{exam.provider === 'AWS' ? 'aws' : exam.provider === 'Azure' ? 'azure' : 'cert'}</div>
                                                    <div className="cell-info">
                                                        <div className="cell-name">{exam.name}</div>
                                                        <div className="cell-id text-xs text-secondary">{exam.id.toUpperCase()}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-secondary">{exam.provider}</td>
                                            <td className="text-secondary">Hace 2 días</td>
                                            <td>
                                                <span className="pill pill-success">Activo</span>
                                            </td>
                                            <td>
                                                <div className="action-row">
                                                    <button className="action-btn-minimal"><Activity size={16} /></button>
                                                    <button className="action-btn-minimal" onClick={() => onDeleteExam(exam.id)}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td>
                                            <div className="exam-cell">
                                                <div className="exam-icon-box azure">azure</div>
                                                <div className="cell-info">
                                                    <div className="cell-name">Azure Data Fundamentals (DP-900)</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-secondary">Microsoft</td>
                                        <td className="text-secondary">En progreso...</td>
                                        <td>
                                            <span className="pill pill-warning">Agente Analizando</span>
                                        </td>
                                        <td>
                                            <div className="action-row">
                                                <button className="action-btn-minimal"><Activity size={16} /></button>
                                                <button className="action-btn-minimal text-error"><X size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="dashboard-grid-2">
                            <div className="data-card p-2">
                                <div className="card-header-small mb-2">
                                    <Zap size={18} className="text-primary" />
                                    <h3>Salud de AWS Bedrock</h3>
                                </div>
                                <div className="health-metrics">
                                    <div className="health-item mb-2">
                                        <div className="health-info">
                                            <span>Precisión de Fact-Checking (Anti-Alucinación)</span>
                                            <span className="text-success font-bold">99.8%</span>
                                        </div>
                                        <div className="progress-bg"><div className="progress-fill success" style={{ width: '99.8%' }}></div></div>
                                    </div>
                                    <div className="health-item">
                                        <div className="health-info">
                                            <span>Latencia Media de Generación (JIT)</span>
                                            <span className="font-bold">1.2s</span>
                                        </div>
                                        <div className="progress-bg"><div className="progress-fill primary" style={{ width: '30%' }}></div></div>
                                    </div>
                                </div>
                            </div>

                            <div className="data-card p-2">
                                <div className="card-header-small mb-2">
                                    <Activity size={18} className="text-secondary" />
                                    <h3>Últimos Logs de Agentes</h3>
                                </div>
                                <div className="logs-container">
                                    <div className="log-entry">
                                        <span className="log-time">[10:42:01]</span>
                                        <span className="log-status success">SUCCESS</span>
                                        <span className="log-msg">(Router) -&gt; Solicitud de examen para user_9821</span>
                                    </div>
                                    <div className="log-entry">
                                        <span className="log-time">[10:42:01]</span>
                                        <span className="log-status invoke">INVOKE</span>
                                        <span className="log-msg">(SolverAWS) -&gt; Generando pregunta de S3 (Dificultad: Pro)</span>
                                    </div>
                                    <div className="log-entry">
                                        <span className="log-time">[10:42:01]</span>
                                        <span className="log-status success">SUCCESS</span>
                                        <span className="log-msg">(SolverAWS) -&gt; Pregunta validada (Consistency: 0.98)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'users' && (
                    <div className="users-view animate-up">
                        <div className="content-toolbar mb-2">
                            <div className="search-bar">
                                <Search size={20} className="text-secondary" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o correo..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="data-card">
                            <table className="pro-table">
                                <thead>
                                    <tr>
                                        <th>ESTUDIANTE</th>
                                        <th>ESTADO</th>
                                        <th>RACHA</th>
                                        <th>ACCESO</th>
                                        <th>SIMULACIONES</th>
                                        <th>ACCIONES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => {
                                        const userAttempts = attempts.filter(a => a.id.includes(user.id) || true);
                                        return (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className="user-cell">
                                                        <div className="cell-avatar">{user.name.charAt(0)}</div>
                                                        <div className="cell-info">
                                                            <div className="cell-name">{user.name}</div>
                                                            <div className="cell-email">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="pill pill-success">Activo</span>
                                                </td>
                                                <td>
                                                    <div className="streak-badge">
                                                        <Zap size={14} />
                                                        <span>{user.streak} días</span>
                                                    </div>
                                                </td>
                                                <td className="text-secondary">
                                                    {new Date(user.last_access).toLocaleDateString()}
                                                </td>
                                                <td className="font-bold">{userAttempts.length}</td>
                                                <td>
                                                    <button className="action-btn-circle" title="Ver Detalles">
                                                        <Info size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeView === 'exams' && (
                    <div className="exams-view animate-up">
                        <div className="grid-header mb-2">
                            <h2 className="section-title">Certificaciones Disponibles</h2>
                            <button className="pro-primary-btn" onClick={() => setShowModal(true)}>
                                <PlusCircle size={20} />
                                <span>Añadir Nueva</span>
                            </button>
                        </div>

                        <div className="exams-grid">
                            {exams.map(exam => (
                                <div key={exam.id} className="pro-exam-card">
                                    <div className="card-top">
                                        <div className="exam-provider">{exam.provider}</div>
                                        <button className="delete-btn-minimal" onClick={() => onDeleteExam(exam.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <h3 className="exam-name">{exam.name}</h3>
                                    <p className="exam-desc">
                                        {exam.description || `Simulador IA basado en la guía oficial con ${exam.domains.length} dominios técnicos.`}
                                    </p>
                                    <div className="card-bottom">
                                        <div className="ia-badge-pro">
                                            <Activity size={14} />
                                            <span>Agente AI Activo</span>
                                        </div>
                                        <div className="stat-compact">
                                            <Users size={14} />
                                            <span>45 Est.</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeView === 'analytics' && (
                    <div className="analytics-view animate-up">
                        <div className="stats-row mb-2">
                            <div className="stat-card">
                                <div className="stat-icon-wrap" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
                                    <Users size={24} />
                                </div>
                                <div className="stat-data">
                                    <span className="stat-label">Total Estudiantes</span>
                                    <span className="stat-value">{users.length}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon-wrap" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                                    <BookOpen size={24} />
                                </div>
                                <div className="stat-data">
                                    <span className="stat-label">Exámenes Activos</span>
                                    <span className="stat-value">{exams.length}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon-wrap" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                                    <Activity size={24} />
                                </div>
                                <div className="stat-data">
                                    <span className="stat-label">Tasa de Aprobación</span>
                                    <span className="stat-value">68.5%</span>
                                </div>
                            </div>
                        </div>

                        <div className="analytics-grid">
                            <div className="data-card p-3">
                                <h3 className="mb-2">Áreas de Mayor Dificultad</h3>
                                <div className="fail-list">
                                    <div className="fail-item">
                                        <div className="fail-info">
                                            <span className="fail-name">Seguridad y Cumplimiento (AWS)</span>
                                            <span className="fail-percent">45% error</span>
                                        </div>
                                        <div className="progress-bg"><div className="progress-fill" style={{ width: '45%' }}></div></div>
                                    </div>
                                    <div className="fail-item mt-2">
                                        <div className="fail-info">
                                            <span className="fail-name">Diseño de Arquitecturas Resilientes</span>
                                            <span className="fail-percent">38% error</span>
                                        </div>
                                        <div className="progress-bg"><div className="progress-fill" style={{ width: '38%' }}></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="discovery-modal animate-up">
                        <div className="modal-header">
                            <div className="header-title">
                                <div className="title-icon">
                                    <PlusCircle size={22} className="text-primary" />
                                </div>
                                <div>
                                    <h3>Añadir Certificación</h3>
                                    <p className="text-secondary text-xs">El Agente AI descubrirá la guía oficial.</p>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X /></button>
                        </div>
                        <div className="modal-body">
                            <div className="discovery-search-wrap">
                                <Search size={20} className="text-secondary" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Ej: AWS Solutions Architect Associate"
                                    value={discoveryQuery}
                                    onChange={(e) => setDiscoveryQuery(e.target.value)}
                                />
                            </div>

                            <div className="discovery-results">
                                {isSearching ? (
                                    <div className="discovery-status">
                                        <Loader2 className="animate-spin text-primary" size={40} />
                                        <span>Consultando Bedrock...</span>
                                    </div>
                                ) : discoveryResults.length > 0 ? (
                                    <div className="results-list">
                                        {discoveryResults.map(res => (
                                            <div
                                                key={res}
                                                className={`discovery-item ${selectedExam === res ? 'active' : ''}`}
                                                onClick={() => setSelectedExam(res)}
                                            >
                                                <div className="item-radio"></div>
                                                <div className="item-content">
                                                    <div className="item-name">{res}</div>
                                                    <div className="item-desc">Verificada oficialmente</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : discoveryQuery.length > 2 ? (
                                    <div className="discovery-status-empty">
                                        <Info size={32} />
                                        <span>No se encontraron certificaciones.</span>
                                    </div>
                                ) : (
                                    <div className="discovery-empty-state">
                                        <Search size={48} className="text-faded" />
                                        <p>Escribe el nombre de la certificación para buscar.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="pro-secondary-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button
                                className="pro-primary-btn"
                                disabled={!selectedExam || isAdding}
                                onClick={handleAddSelected}
                            >
                                {isAdding ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar Adición'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .admin-dashboard {
                    padding: 1rem 0;
                }

                .admin-header {
                    margin-bottom: 3rem;
                }

                .admin-header h1 {
                    font-size: 2rem;
                    font-weight: 800;
                    letter-spacing: -0.025em;
                    color: var(--text-main);
                    margin-bottom: 0.5rem;
                }

                .stats-row {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                }

                .stat-card {
                    background: white;
                    border: 1px solid var(--border-default);
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    box-shadow: var(--shadow-sm);
                }

                .stat-icon-wrap {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .stat-icon-wrap.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .stat-icon-wrap.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .stat-icon-wrap.purple { background: rgba(139, 92, 246, 0.1); color: #a855f7; }
                .stat-icon-wrap.orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

                .stat-label {
                    display: block;
                    font-size: 0.8125rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }

                .stat-value {
                    display: block;
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: var(--text-main);
                    line-height: 1;
                    margin-top: 0.25rem;
                }

                .card-header-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--border-default);
                }

                .section-title {
                    font-size: 1.125rem;
                    font-weight: 700;
                    margin: 0;
                }

                .exam-cell {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .exam-icon-box {
                    width: 36px;
                    height: 36px;
                    background: #F3F4FB;
                    color: var(--primary);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.65rem;
                    text-transform: lowercase;
                    border: 1px solid var(--border-default);
                }
                .exam-icon-box.azure { color: #0089D6; }

                .pill {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .pill-success {
                    background: #ECFDF5;
                    color: #059669;
                    border: 1px solid rgba(5, 150, 105, 0.2);
                }

                .pill-warning {
                    background: #FFFBEB;
                    color: #D97706;
                    border: 1px solid rgba(217, 119, 6, 0.2);
                }

                .action-row {
                    display: flex;
                    gap: 0.5rem;
                }

                .action-btn-minimal {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 6px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .action-btn-minimal:hover {
                    background: #F3F4FB;
                    color: var(--primary);
                }

                .text-error { color: #EF4444; }

                .dashboard-grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }

                .card-header-small {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border-default);
                }

                .health-info {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.875rem;
                    margin-bottom: 0.5rem;
                    color: var(--text-secondary);
                }

                .progress-bg {
                    height: 8px;
                    background: #F3F4F6;
                    border-radius: 10px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    border-radius: 10px;
                }
                .progress-fill.success { background: #10B981; }
                .progress-fill.primary { background: var(--primary); }

                .logs-container {
                    background: #F9FAFB;
                    border-radius: 12px;
                    padding: 1rem;
                    font-family: monospace;
                    font-size: 0.75rem;
                    max-height: 200px;
                    overflow-y: auto;
                    border: 1px solid var(--border-default);
                }

                .log-entry {
                    margin-bottom: 0.5rem;
                    white-space: nowrap;
                }

                .log-time { color: #9CA3AF; margin-right: 0.5rem; }
                .log-status { font-weight: 700; margin-right: 0.5rem; }
                .log-status.success { color: #10B981; }
                .log-status.invoke { color: #6366F1; }
                .log-msg { color: var(--text-main); }

                .fail-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                }

                .fail-name { font-weight: 600; font-size: 0.9375rem; }
                .fail-percent { color: #EF4444; font-weight: 700; }

                .progress-bg { height: 8px; background: #F3F4F6; border-radius: 4px; overflow: hidden; }
                .progress-fill { height: 100%; background: #EF4444; border-radius: 4px; }

                /* Modal Adjustments */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.7);
                    backdrop-filter: blur(8px);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                }

                .discovery-modal {
                    background: white;
                    width: 100%;
                    max-width: 600px;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }

                .discovery-search-wrap {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem 1.5rem;
                    background: #F9FAFB;
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    margin-bottom: 2rem;
                }

                .discovery-search-wrap input {
                    border: none;
                    background: none;
                    width: 100%;
                    font-size: 1.125rem;
                    outline: none;
                    color: var(--text-main);
                }

                .discovery-item {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    padding: 1.25rem;
                    border-radius: 14px;
                    border: 2px solid transparent;
                    background: #F9FAFB;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .discovery-item:hover {
                    background: #F3F4F6;
                    border-color: var(--border);
                }

                .discovery-item.active {
                    background: #F5F7FF;
                    border-color: var(--primary);
                }

                .item-radio {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid var(--border);
                    flex-shrink: 0;
                }

                .discovery-item.active .item-radio {
                    border-color: var(--primary);
                    background: var(--primary);
                    box-shadow: inset 0 0 0 4px white;
                }

                .item-name { font-weight: 700; color: var(--text-main); }
                .item-desc { font-size: 0.8125rem; color: var(--text-secondary); }

                .pro-secondary-btn {
                    padding: 0.75rem 1.5rem;
                    border-radius: 10px;
                    border: 1px solid var(--border);
                    background: white;
                    font-weight: 600;
                    cursor: pointer;
                }

                .animate-up {
                    animation: slideUp 0.4s ease-out forwards;
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
