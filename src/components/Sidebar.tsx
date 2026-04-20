import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  LogOut,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Building2
} from 'lucide-react';
import type { UserProfile } from '../types';
import { useLanguage, LANGUAGES } from './LanguageContext';

interface SidebarProps {
  user: UserProfile;
  activeView: string;
  onViewChange: (view: any) => void;
  onLogout: () => void;
  role: 'admin' | 'org_admin' | 'user';
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeView, onViewChange, onLogout, role }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { language, setLanguage, t } = useLanguage();

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLogoutConfirm(true);
  };

  const handleNavClick = (view: string) => {
    onViewChange(view);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Hamburger button — solo visible en mobile */}
      <button
        className="mobile-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <span /><span /><span />
      </button>

      {/* Overlay para cerrar el sidebar en mobile */}
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

    <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {showLogoutConfirm && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-card">
            <h3>{t('logout')}</h3>
            <p>{t('logoutConfirm')}</p>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowLogoutConfirm(false)}>
                {t('cancel')}
              </button>
              <button className="primary-danger" onClick={onLogout}>
                {t('exit')}
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
        <span className="section-title">{t('principal')}</span>
        <nav className="sidebar-nav">
          {/* Dashboard — visible for all roles */}
          <button
            className={`nav-item ${activeView === 'overview' ? 'active' : ''}`}
            onClick={() => handleNavClick('overview')}
          >
            <LayoutDashboard size={20} />
            <span>{t('dashboard')}</span>
          </button>

          {/* admin: History / Exams */}
          {role === 'admin' && (
            <button
              className={`nav-item ${activeView === 'exams' || activeView === 'history' ? 'active' : ''}`}
              onClick={() => handleNavClick('exams')}
            >
              <BookOpen size={20} />
              <span>{t('history')}</span>
            </button>
          )}

          {/* admin: Students */}
          {role === 'admin' && (
            <button
              className={`nav-item ${activeView === 'users' ? 'active' : ''}`}
              onClick={() => handleNavClick('users')}
            >
              <Users size={20} />
              <span>{t('students')}</span>
            </button>
          )}

          {/* admin: Organizations */}
          {role === 'admin' && (
            <button
              className={`nav-item ${activeView === 'organizations' ? 'active' : ''}`}
              onClick={() => handleNavClick('organizations')}
            >
              <Building2 size={20} />
              <span>{t('organizations')}</span>
            </button>
          )}

          {/* org_admin: My Organization */}
          {role === 'org_admin' && (
            <button
              className={`nav-item ${activeView === 'org-dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('org-dashboard')}
            >
              <Building2 size={20} />
              <span>{t('myOrganization')}</span>
            </button>
          )}

          {/* org_admin: Students */}
          {role === 'org_admin' && (
            <button
              className={`nav-item ${activeView === 'org-students' ? 'active' : ''}`}
              onClick={() => handleNavClick('org-students')}
            >
              <Users size={20} />
              <span>{t('students')}</span>
            </button>
          )}

          {/* user: History */}
          {role === 'user' && (
            <button
              className={`nav-item ${activeView === 'history' ? 'active' : ''}`}
              onClick={() => handleNavClick('history')}
            >
              <BookOpen size={20} />
              <span>{t('history')}</span>
            </button>
          )}

          {/* user: Study */}
          {role === 'user' && (
            <button
              className={`nav-item ${activeView === 'study' ? 'active' : ''}`}
              onClick={() => handleNavClick('study')}
            >
              <BookOpen size={20} />
              <span>{t('studyGuide')}</span>
            </button>
          )}
        </nav>
      </div>

      {/* AI Monitoring — visible only for admin */}
      {role === 'admin' && (
      <div className="sidebar-section">
        <span className="section-title">{t('aiMonitoring')}</span>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'logs' ? 'active' : ''}`}
            onClick={() => handleNavClick('logs')}
          >
            <Activity size={20} />
            <span>{t('generationLogs')}</span>
          </button>
          <button className="nav-item">
            <AlertTriangle size={20} />
            <span>{t('hallucinationAlerts')}</span>
            <span className="notification-badge">2</span>
          </button>
        </nav>
      </div>
      )}

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">{user.email?.split('@')[0] || user.name}</span>
            <span className="user-email">{user.email}</span>
          </div>
        </div>
        <button className="logout-btn-full" onClick={handleLogoutClick}>
          <LogOut size={16} />
          <span>{t('logout')}</span>
        </button>

        {/* Language selector */}
        <div className="lang-selector">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`lang-btn ${language === lang.code ? 'active' : ''}`}
              onClick={() => setLanguage(lang.code)}
              title={lang.name}
            >
              <span className="lang-flag">{lang.flag}</span>
            </button>
          ))}
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
          display: none;
        }

        .logout-btn-full {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.625rem 1rem;
          margin-top: 0.75rem;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: 10px;
          color: #f87171;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn-full:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .lang-selector {
          display: flex;
          gap: 0.375rem;
          margin-top: 0.75rem;
          justify-content: center;
        }
        .lang-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-size: 1.25rem;
        }
        .lang-btn:hover { background: rgba(255,255,255,0.12); }
        .lang-btn.active {
          border-color: var(--primary);
          background: rgba(99,102,241,0.15);
          box-shadow: 0 0 0 1px var(--primary);
        }
        .lang-flag { line-height: 1; }

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

        /* ── Mobile responsive ─────────────────────────────────── */
        .mobile-hamburger {
          display: none;
          position: fixed;
          top: 0.75rem;
          left: 0.75rem;
          z-index: 1100;
          background: var(--bg-sidebar, #0f1219);
          border: none;
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          flex-direction: column;
          gap: 4px;
          width: 36px;
          height: 36px;
          align-items: center;
          justify-content: center;
        }
        .mobile-hamburger span {
          display: block;
          width: 18px;
          height: 2px;
          background: white;
          border-radius: 2px;
        }
        .mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 999;
        }

        @media (max-width: 768px) {
          .mobile-hamburger { display: flex; }
          .mobile-overlay { display: block; }
          .app-sidebar {
            position: fixed;
            left: -260px;
            top: 0;
            bottom: 0;
            z-index: 1000;
            transition: left 0.25s ease;
          }
          .app-sidebar.mobile-open {
            left: 0;
          }
        }
      `}</style>
    </aside>
    </>
  );
};

export default Sidebar;
