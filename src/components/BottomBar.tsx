import React from 'react';
import { Home, Search, BookOpen, BarChart2, User } from 'lucide-react';

interface BottomBarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const BottomBar: React.FC<BottomBarProps> = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'home', icon: Home, label: 'Inicio' },
        { id: 'discover', icon: Search, label: 'Descubrir' },
        { id: 'history', icon: BookOpen, label: 'Historial' },
        { id: 'stats', icon: BarChart2, label: 'Progreso' },
        { id: 'profile', icon: User, label: 'Perfil' },
    ];

    return (
        <nav className="bottom-bar glass">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        aria-label={tab.label}
                    >
                        <Icon size={24} color={isActive ? 'var(--primary-color)' : 'var(--text-secondary)'} />
                        <span className="nav-label">{tab.label}</span>
                    </button>
                );
            })}

            <style>{`
        .bottom-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 70px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 0 10px;
          z-index: 1000;
          border-top: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 -2px 10px rgba(0,0,0,0.02);
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: none;
          border: none;
          padding: 8px;
          flex: 1;
          color: var(--text-secondary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-item.active {
          color: var(--primary-color);
          transform: translateY(-4px);
        }

        .nav-label {
          font-size: 10px;
          margin-top: 4px;
          font-weight: 500;
        }

        @media (min-width: 1024px) {
          .bottom-bar {
            top: 0;
            left: 0;
            bottom: 0;
            width: 80px;
            height: 100vh;
            flex-direction: column;
            justify-content: center;
            gap: 20px;
            border-top: none;
            border-right: 1px solid rgba(0,0,0,0.05);
          }
          
          .nav-item.active {
            transform: translateX(4px);
          }
        }
      `}</style>
        </nav>
    );
};

export default BottomBar;
