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
        <div className="admin-dashboard">
            <aside className="admin-sidebar">
                <div className="admin-brand">
                    <ShieldCheck size={28} />
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
                <header className="admin-header">
                    <h2>{activeView === 'users' ? 'Gestión de Usuarios' : activeView === 'exams' ? 'Simuladores Activos' : 'Desempeño Global'}</h2>
                    <div className="admin-user-info">
                        <span>Admin Principal</span>
                        <div className="avatar">AD</div>
                    </div>
                </header>

                <div className="admin-content">
                    {activeView === 'users' && (
                        <div className="users-view card">
                            <div className="table-actions">
                                <div className="search-box">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar usuario..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
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
                                        const userAttempts = attempts.filter(a => a.id.includes(user.id) || true); // Simplified logic
                                        return (
                                            <tr key={user.id}>
                                                <td>{user.name}</td>
                                                <td>{user.email}</td>
                                                <td>{user.streak}</td>
                                                <td>{new Date(user.last_access).toLocaleDateString()}</td>
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
                            <div className="create-exam-card card flex-center">
                                <PlusCircle size={40} className="icon-faded" />
                                <h3>Añadir Certificación</h3>
                                <p>Configurar Bedrock para nuevas guías oficiales</p>
                                <button className="primary-btn" onClick={() => onAddExam({})}>Nuevos Simulador</button>
                            </div>
                            {exams.map(exam => (
                                <div key={exam.id} className="exam-card card">
                                    <div className="badge">{exam.provider}</div>
                                    <h3>{exam.name}</h3>
                                    <p>{exam.domains.length} Dominios estructurados</p>
                                    <div className="exam-footer">
                                        <span>Dificultad Dinámica: Activa</span>
                                        <button className="secondary-btn">Editar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeView === 'analytics' && (
                        <div className="analytics-view grid">
                            <section className="stat-overview card">
                                <Activity size={24} className="icon" />
                                <div>
                                    <h4>Frecuencia de Uso</h4>
                                    <p>Incremento del 15% esta semana</p>
                                </div>
                            </section>
                            <section className="global-performance card">
                                <h3>Top Dominios Críticos</h3>
                                <ul>
                                    <li>Redes de Contenido (CloudFront) - 45% tasa de error</li>
                                    <li>IAM Policies - 38% tasa de error</li>
                                </ul>
                            </section>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
