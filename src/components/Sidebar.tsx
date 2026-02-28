import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  LogOut,
  ShieldCheck,
  Activity,
  AlertTriangle
} from 'lucide-react';
import type { UserProfile } from '../types';

interface SidebarProps {
  user: UserProfile;
  activeView: string;
  onViewChange: (view: any) => void;
  onLogout: () => void;
  isAdmin: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeView, onViewChange, onLogout, isAdmin }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLogoutConfirm(true);
  };

  return (
    <aside className="app-sidebar">
      {showLogoutConfirm && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-card">
            <h3>Cerrar Sesión</h3>
            <p>¿Estás seguro de que deseas salir?</p>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowLogoutConfirm(false)}>
                Cancelar
              </button>
              <button className="primary-danger" onClick={onLogout}>
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-logo">
            <ShieldCheck size={22} color="white" />
          </div>
          <span className="brand-name">Agentic LMS</span>
        </div>
      </div>

      <div className="sidebar-section">
        <span className="section-title">PRINCIPAL</span>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'overview' ? 'active' : ''}`}
            onClick={() => onViewChange('overview')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeView === 'exams' || activeView === 'history' ? 'active' : ''}`}
            onClick={() => onViewChange(isAdmin ? 'exams' : (isAdmin ? 'exams' : 'history'))}
          >
            <BookOpen size={20} />
            <span>{isAdmin ? 'Catálogo de Exámenes' : 'Historial'}</span>
          </button>

          {isAdmin && (
            <button
              className={`nav-item ${activeView === 'users' ? 'active' : ''}`}
              onClick={() => onViewChange('users')}
            >
              <Users size={20} />
              <span>Estudiantes</span>
            </button>
          )}

          {!isAdmin && (
            <button
              className={`nav-item ${activeView === 'study' ? 'active' : ''}`}
              onClick={() => onViewChange('study')}
            >
              <Users size={20} />
              <span>Estudiantes</span>
            </button>
          )}
        </nav>
      </div>

      <div className="sidebar-section">
        <span className="section-title">MONITOREO DE IA (BEDROCK)</span>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'logs' ? 'active' : ''}`}
            onClick={() => onViewChange('logs')}
          >
            <Activity size={20} />
            <span>Logs de Generación</span>
          </button>
          <button className="nav-item">
            <AlertTriangle size={20} />
            <span>Alertas de Alucinación</span>
            <span className="notification-badge">2</span>
          </button>
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {user.name.charAt(0)}
          </div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
          </div>
          <button className="logout-btn-small" onClick={handleLogoutClick} title="Cerrar Sesión">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .app-sidebar {
          width: 250px;
          background: var(--bg-sidebar);
          color: white;
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
        }

        .sidebar-header {
          padding: 1.5rem 1.25rem;
          margin-bottom: 1rem;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .brand-logo {
          width: 32px;
          height: 32px;
          background: var(--primary);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-name {
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .sidebar-section {
          padding: 0 0.75rem;
          margin-bottom: 1.5rem;
        }

        .section-title {
          display: block;
          padding: 0 0.5rem;
          font-size: 0.6875rem;
          font-weight: 700;
          color: #4b5563;
          margin-bottom: 0.75rem;
          letter-spacing: 0.05em;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          color: #9ca3af;
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          text-align: left;
          font-weight: 500;
          position: relative;
        }

        .nav-item:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-item.active {
          color: white;
          background: var(--primary);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
        }

        .notification-badge {
          position: absolute;
          right: 0.75rem;
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-footer {
          margin-top: auto;
          padding: 1.25rem;
          background: rgba(0, 0, 0, 0.1);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .user-name {
          font-size: 0.8125rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-email {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.4);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .logout-btn-small {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.4rem;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .logout-btn-small:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
        }

        .modal-card {
            background: white;
            padding: 2rem;
            border-radius: 16px;
            width: 100%;
            max-width: 320px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            text-align: center;
            color: #111827;
        }

        .modal-card h3 {
            margin-bottom: 0.5rem;
            color: #111827;
        }

        .modal-card p {
            color: #4B5563;
            margin-bottom: 1.5rem;
        }

        .modal-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
        }

        .modal-actions button {
            flex: 1;
            padding: 0.75rem;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        button.primary-danger {
            background: #EF4444;
            color: white;
            border: none;
        }

        button.primary-danger:hover {
            background: #DC2626;
            transform: translateY(-1px);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
