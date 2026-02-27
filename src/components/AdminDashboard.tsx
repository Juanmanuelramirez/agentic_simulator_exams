import React, { useState, useEffect } from 'react';
import type { UserProfile, Exam, ExamAttempt } from '../types';
import { Users, PlusCircle, BarChart3, ShieldCheck, Activity, Search, X, Loader2, Trash2, Info } from 'lucide-react';
import { librarian } from '../agents/librarian';

interface AdminDashboardProps {
    users: UserProfile[];
    exams: Exam[];
    attempts: ExamAttempt[];
    onAddExam: (examName: string) => Promise<void>;
    onDeleteExam: (examId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, exams, attempts, onAddExam, onDeleteExam }) => {
    const [activeView, setActiveView] = useState<'users' | 'exams' | 'analytics'>('users');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [discoveryQuery, setDiscoveryQuery] = useState('');
    const [discoveryResults, setDiscoveryResults] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedExam, setSelectedExam] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

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
            <aside className="admin-sidebar glass">
                <div className="admin-brand glow-text">
                    <ShieldCheck size={28} color="var(--primary)" />
                    <span>Admin Panel</span>
                </div>
                <nav className="admin-nav">
                    <button
                        className={activeView === 'users' ? 'active' : ''}
                        onClick={() => setActiveView('users')}
                    >
                        <Users size={20} /> Usuarios
                    </button>
                    <button
                        className={activeView === 'exams' ? 'active' : ''}
                        onClick={() => setActiveView('exams')}
                    >
                        <PlusCircle size={20} /> Simuladores
                    </button>
                    <button
                        className={activeView === 'analytics' ? 'active' : ''}
                        onClick={() => setActiveView('analytics')}
                    >
                        <BarChart3 size={20} /> Analíticas
                    </button>
                </nav>
            </aside>

            <main className="admin-main">
                <header className="admin-header mb-2">
                    <h2 className="glow-text">{activeView === 'users' ? 'Gestión de Usuarios' : activeView === 'exams' ? 'Simuladores Activos' : 'Desempeño Global'}</h2>
                    <div className="admin-user-info glass p-1">
                        <div className="avatar glow-icon">AD</div>
                        <span>Admin Principal</span>
                    </div>
                </header>

                <div className="admin-content">
                    {activeView === 'users' && (
                        <div className="users-view glass card">
                            <div className="table-actions mb-1">
                                <div className="search-box glass">
                                    <Search size={18} color="var(--text-secondary)" />
                                    <input
                                        type="text"
                                        placeholder="Buscar usuario..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="transparent-input"
                                    />
                                </div>
                            </div>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Email</th>
                                        <th>Racha</th>
                                        <th>Último Acceso</th>
                                        <th>Intentos</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => {
                                        const userAttempts = attempts.filter(a => a.id.includes(user.id) || true);
                                        return (
                                            <tr key={user.id} className="table-row">
                                                <td className="font-semibold">{user.name}</td>
                                                <td className="text-secondary">{user.email}</td>
                                                <td><span className="badge-outline">{user.streak}🔥</span></td>
                                                <td className="text-secondary">{new Date(user.last_access).toLocaleDateString()}</td>
                                                <td>{userAttempts.length}</td>
                                                <td>
                                                    <button className="text-btn">Ver Detalle</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeView === 'exams' && (
                        <div className="exams-view grid">
                            <div className="create-exam-card glass card flex-center pulse">
                                <PlusCircle size={40} className="icon-faded mb-1" color="var(--primary)" />
                                <h3>Añadir Certificación</h3>
                                <p className="text-secondary mb-1">Configurar Bedrock para nuevas guías oficiales</p>
                                <button className="primary-btn" onClick={() => setShowModal(true)}>Añadir Nuevo</button>
                            </div>
                            {exams.map(exam => (
                                <div key={exam.id} className="exam-card glass card">
                                    <div className="exam-card-header">
                                        <div className="badge">{exam.provider}</div>
                                        <button className="icon-btn delete-btn" onClick={() => onDeleteExam(exam.id)} title="Eliminar Simulador">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <h3 className="mb-05">{exam.name}</h3>
                                    <p className="description-text text-secondary mb-1">
                                        {exam.description || `Plan de estudio optimizado con ${exam.domains.length} dominios técnicos.`}
                                    </p>
                                    <div className="exam-footer">
                                        <div className="ia-badge">
                                            <Activity size={12} />
                                            <span>IA Solver Activa</span>
                                        </div>
                                        <button className="secondary-btn">Configurar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeView === 'analytics' && (
                        <div className="analytics-view grid">
                            <section className="stat-overview glass card flex-row">
                                <Activity size={32} color="var(--secondary)" className="glow-icon" />
                                <div>
                                    <h4>Frecuencia de Uso</h4>
                                    <p className="text-secondary">Incremento del 15% esta semana</p>
                                </div>
                            </section>
                            <section className="global-performance glass card">
                                <h3 className="mb-1">Top Dominios Críticos</h3>
                                <ul className="list-none">
                                    <li className="list-item border-bottom py-1">
                                        <div className="flex-between">
                                            <span>CloudFront Content Delivery</span>
                                            <span className="text-error">45% err</span>
                                        </div>
                                    </li>
                                    <li className="list-item py-1">
                                        <div className="flex-between">
                                            <span>IAM Security Policies</span>
                                            <span className="text-error">38% err</span>
                                        </div>
                                    </li>
                                </ul>
                            </section>
                        </div>
                    )}
                </div>
            </main>

            {showModal && (
                <div className="modal-overlay">
                    <div className="discovery-modal glass-heavy fade-in">
                        <div className="modal-header">
                            <div className="header-title">
                                <PlusCircle className="text-primary" />
                                <h3>Descubrimiento de IA</h3>
                            </div>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X /></button>
                        </div>
                        <div className="modal-body">
                            <p className="modal-hint">Introduce el nombre de la certificación. Bedrock validará su existencia y estructura oficial.</p>
                            <div className="discovery-search glass">
                                <Search size={20} className="text-secondary" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Ej: AWS Certified Solutions Architect..."
                                    value={discoveryQuery}
                                    onChange={(e) => setDiscoveryQuery(e.target.value)}
                                />
                            </div>

                            <div className="discovery-results">
                                {isSearching ? (
                                    <div className="discovery-status">
                                        <Loader2 className="spin" />
                                        <span>Bedrock validando certificación...</span>
                                    </div>
                                ) : discoveryResults.length > 0 ? (
                                    <div className="results-list">
                                        {discoveryResults.map(res => (
                                            <div
                                                key={res}
                                                className={`result-item ${selectedExam === res ? 'selected' : ''}`}
                                                onClick={() => setSelectedExam(res)}
                                            >
                                                <div className="result-info">
                                                    <ShieldCheck size={18} className="text-primary" />
                                                    <span>{res}</span>
                                                </div>
                                                <div className="selection-indicator" />
                                            </div>
                                        ))}
                                    </div>
                                ) : discoveryQuery.length > 2 ? (
                                    <div className="discovery-status empty">
                                        <Info size={20} />
                                        <span>No se encontró una certificación oficial con ese nombre.</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="secondary-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button
                                className="primary-btn"
                                disabled={!selectedExam || isAdding}
                                onClick={handleAddSelected}
                            >
                                {isAdding ? (
                                    <>
                                        <Loader2 className="spin" size={18} />
                                        <span>Añadiendo...</span>
                                    </>
                                ) : (
                                    'Añadir Simulador'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .p-1 { padding: 0.5rem 1rem; border-radius: 99px; }
                .flex-row { display: flex; align-items: center; gap: 1rem; }
                .list-none { list-style: none; }
                .py-1 { padding: 0.75rem 0; }
                .flex-between { display: flex; justify-content: space-between; align-items: center; }
                .text-xs { font-size: 0.75rem; }
                .border-bottom { border-bottom: 1px solid var(--glass-border); }
                .avatar { background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }
                .badge-outline { border: 1px solid var(--glass-border); padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; }
                
                .mb-05 { margin-bottom: 0.5rem; }
                .exam-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
                .description-text { font-size: 0.9rem; line-height: 1.4; color: var(--text-secondary); }
                .delete-btn { color: #f87171; background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.2); }
                .delete-btn:hover { background: #f87171; color: white; }
                
                .ia-badge { display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #34d399; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
                
                /* Modal Styles */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 5000; padding: 2rem; }
                .discovery-modal { width: 100%; max-width: 600px; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
                .modal-header { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--glass-border); }
                .header-title { display: flex; align-items: center; gap: 12px; }
                .header-title h3 { font-size: 1.25rem; font-weight: 700; }
                .close-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; }
                
                .modal-body { padding: 2rem; }
                .modal-hint { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.5; }
                
                .discovery-search { display: flex; align-items: center; gap: 12px; padding: 1rem 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; }
                .discovery-search input { flex: 1; background: none; border: none; color: white; font-size: 1.1rem; outline: none; }
                
                .discovery-results { min-height: 200px; max-height: 300px; overflow-y: auto; }
                .discovery-status { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; height: 200px; color: var(--text-secondary); }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                .results-list { display: flex; flex-direction: column; gap: 10px; }
                .result-item { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); cursor: pointer; transition: all 0.2s; }
                .result-item:hover { background: rgba(255,255,255,0.08); border-color: rgba(99, 102, 241, 0.3); }
                .result-item.selected { background: rgba(99, 102, 241, 0.1); border-color: var(--primary); }
                .result-info { display: flex; align-items: center; gap: 15px; font-weight: 600; color: #e2e8f0; }
                .selection-indicator { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--text-secondary); }
                .result-item.selected .selection-indicator { background: var(--primary); border-color: var(--primary); box-shadow: 0 0 10px var(--primary); }
                
                .modal-footer { padding: 1.5rem; display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid var(--glass-border); background: rgba(0,0,0,0.2); }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
