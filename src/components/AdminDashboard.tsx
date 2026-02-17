import React, { useState } from 'react';
import type { UserProfile, Exam, ExamAttempt } from '../types';
import { Users, PlusCircle, BarChart3, ShieldCheck, Activity, Search } from 'lucide-react';

interface AdminDashboardProps {
    users: UserProfile[];
    exams: Exam[];
    attempts: ExamAttempt[];
    onAddExam: (exam: Partial<Exam>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, exams, attempts, onAddExam }) => {
    const [activeView, setActiveView] = useState<'users' | 'exams' | 'analytics'>('users');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                                <button className="primary-btn" onClick={() => onAddExam({})}>Añadir Nuevo</button>
                            </div>
                            {exams.map(exam => (
                                <div key={exam.id} className="exam-card glass card">
                                    <div className="badge mb-1">{exam.provider}</div>
                                    <h3 className="mb-1">{exam.name}</h3>
                                    <p className="text-secondary mb-1">{exam.domains.length} Dominios estructurados</p>
                                    <div className="exam-footer">
                                        <span className="text-xs text-secondary italic">IA Solver Activa</span>
                                        <button className="secondary-btn">Editar</button>
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
            `}</style>
        </div>
    );
};

export default AdminDashboard;
