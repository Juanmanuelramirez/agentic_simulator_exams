import React, { useState } from 'react';
import type { UserProfile } from '../types';
import { Calendar, Clock, Bell, ShieldCheck, ChevronRight } from 'lucide-react';

interface StudyCommitmentProps {
    onSave: (profile: UserProfile['study_commitment']) => void;
    onCancel: () => void;
}

const StudyCommitment: React.FC<StudyCommitmentProps> = ({ onSave, onCancel }) => {
    const [days, setDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
    const [time, setTime] = useState('20:00');
    const [notifications, setNotifications] = useState(false);

    const allDays = [
        { id: 'Mon', label: 'L' },
        { id: 'Tue', label: 'M' },
        { id: 'Wed', label: 'X' },
        { id: 'Thu', label: 'J' },
        { id: 'Fri', label: 'V' },
        { id: 'Sat', label: 'S' },
        { id: 'Sun', label: 'D' },
    ];

    const toggleDay = (dayId: string) => {
        setDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    };

    const handleRequestNotifications = async () => {
        // In a real browser this would call Notification.requestPermission()
        setNotifications(true);
    };

    return (
        <div className="study-commitment glass fade-in">
            <div className="commitment-header">
                <div className="icon-ring">
                    <ShieldCheck size={32} color="var(--primary-color)" />
                </div>
                <h2>Compromiso de Estudio</h2>
                <p>Para maximizar tu retención, establece un horario obligatorio.</p>
            </div>

            <div className="commitment-body">
                <section className="setting-group">
                    <label><Calendar size={18} /> Días de entrenamiento</label>
                    <div className="days-picker">
                        {allDays.map(day => (
                            <button
                                key={day.id}
                                onClick={() => toggleDay(day.id)}
                                className={`day-btn ${days.includes(day.id) ? 'active' : ''}`}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="setting-group">
                    <label><Clock size={18} /> Hora de la sesión</label>
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="time-input"
                    />
                </section>

                <section className="setting-group glass-inset">
                    <div className="notif-row">
                        <div className="notif-text">
                            <label><Bell size={18} /> Notificaciones</label>
                            <p>Te avisaremos 10 min antes y vía email si faltas.</p>
                        </div>
                        <button
                            onClick={handleRequestNotifications}
                            className={`toggle-btn ${notifications ? 'active' : ''}`}
                        >
                            {notifications ? 'Permitido' : 'Solicitar'}
                        </button>
                    </div>
                </section>
            </div>

            <div className="commitment-footer">
                <button className="btn-primary" onClick={() => onSave({ days, time, notifications })}>
                    Aceptar Compromiso <ChevronRight size={18} />
                </button>
                <button className="btn-text" onClick={onCancel}>Configurar más tarde</button>
            </div>

            <style>{`
        .study-commitment {
          max-width: 480px;
          margin: 2rem auto;
          padding: 2.5rem;
          border-radius: var(--radius-lg);
          text-align: center;
          box-shadow: var(--shadow-lg);
        }
        .icon-ring {
          width: 64px; height: 64px; border-radius: 50%;
          background: #EEF2FF; display: flex; align-items: center;
          justify-content: center; margin: 0 auto 1.5rem;
        }
        .commitment-body { text-align: left; margin: 2rem 0; display: flex; flex-direction: column; gap: 1.5rem; }
        .setting-group label { display: flex; align-items: center; gap: 10px; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-primary); }
        .days-picker { display: flex; justify-content: space-between; gap: 8px; }
        .day-btn {
          flex: 1; height: 40px; border-radius: 8px; border: 1px solid #E2E8F0;
          background: white; font-weight: 600; transition: all 0.2s;
        }
        .day-btn.active { background: var(--primary-color); border-color: var(--primary-color); color: white; }
        .time-input {
          width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #E2E8F0;
          font-family: inherit; font-size: 1.1rem;
        }
        .glass-inset { background: rgba(0,0,0,0.03); padding: 1rem; border-radius: 12px; }
        .notif-row { display: flex; justify-content: space-between; align-items: center; }
        .notif-text p { font-size: 0.8rem; color: var(--text-secondary); margin: 4px 0 0 28px; }
        .toggle-btn {
          padding: 6px 16px; border-radius: 20px; border: 1px solid var(--primary-color);
          background: transparent; color: var(--primary-color); font-weight: 600; font-size: 0.85rem;
        }
        .toggle-btn.active { background: var(--primary-color); color: white; }
        .commitment-footer { display: flex; flex-direction: column; gap: 0.5rem; }
      `}</style>
        </div>
    );
};

export default StudyCommitment;
