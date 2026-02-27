import React, { useState } from 'react';
import type { UserProfile } from '../types';
import { Calendar, Clock, ChevronRight } from 'lucide-react';

interface StudyCommitmentProps {
    onSave: (profile: UserProfile['study_commitment']) => void;
    onCancel: () => void;
}

const StudyCommitment: React.FC<StudyCommitmentProps> = ({ onSave, onCancel }) => {
    const [days, setDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
    const [time, setTime] = useState('20:00');
    const [notifications, setNotifications] = useState(true);

    const allDays = [
        { id: 'Mon', label: 'L' },
        { id: 'Tue', label: 'M' },
        { id: 'Wed', label: 'M' },
        { id: 'Thu', label: 'J' },
        { id: 'Fri', label: 'V' },
        { id: 'Sat', label: 'S' },
        { id: 'Sun', label: 'D' },
    ];

    const toggleDay = (dayId: string) => {
        setDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content card animate-fade-in">
                <div className="commitment-header">
                    <div className="icon-ring">
                        <Calendar size={32} color="var(--primary)" />
                    </div>
                    <h2>Configura tu Meta de Estudio</h2>
                    <p>Para garantizar tu éxito, comprométete a un horario de práctica semanal.</p>
                </div>

                <div className="commitment-body">
                    <div className="setting-group">
                        <label className="section-label">Días de la semana:</label>
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
                    </div>

                    <div className="setting-group">
                        <label className="section-label">Hora del recordatorio:</label>
                        <div className="time-input-wrapper">
                            <Clock size={20} className="input-icon" />
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="time-input"
                            />
                        </div>
                    </div>

                    <label className="checkbox-row">
                        <input
                            type="checkbox"
                            checked={notifications}
                            onChange={(e) => setNotifications(e.target.checked)}
                        />
                        <span>Acepto recibir recordatorios (Notif/Email)</span>
                    </label>
                </div>

                <div className="commitment-footer">
                    <button className="primary w-full" onClick={() => onSave({ days, time, notifications })}>
                        Guardar y Comenzar <ChevronRight size={18} />
                    </button>
                    <button className="secondary w-full" onClick={onCancel}>
                        Configura más tarde
                    </button>
                </div>

                <style>{`
                    .modal-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(15, 23, 42, 0.6);
                        backdrop-filter: blur(4px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                        padding: 1rem;
                    }
                    .modal-content {
                        max-width: 440px;
                        width: 100%;
                        display: flex;
                        flex-direction: column;
                        gap: 1.5rem;
                        text-align: center;
                    }
                    .icon-ring {
                        width: 64px;
                        height: 64px;
                        border-radius: 50%;
                        background: #f0f4ff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 1rem;
                    }
                    .commitment-body {
                        text-align: left;
                        display: flex;
                        flex-direction: column;
                        gap: 1.25rem;
                    }
                    .section-label {
                        display: block;
                        font-weight: 600;
                        margin-bottom: 0.5rem;
                        color: var(--text-main);
                    }
                    .days-picker {
                        display: flex;
                        gap: 0.5rem;
                    }
                    .day-btn {
                        flex: 1;
                        height: 44px;
                        border-radius: var(--radius-lg);
                        border: 1px solid var(--border-default);
                        background: white;
                        font-weight: 600;
                        padding: 0;
                    }
                    .day-btn.active {
                        background: var(--primary);
                        color: white;
                        border-color: var(--primary);
                    }
                    .time-input-wrapper {
                        position: relative;
                        display: flex;
                        align-items: center;
                    }
                    .input-icon {
                        position: absolute;
                        left: 1rem;
                        color: var(--text-secondary);
                    }
                    .time-input {
                        width: 100%;
                        padding: 0.75rem 1rem 0.75rem 3rem;
                        border-radius: var(--radius-lg);
                        border: 1px solid var(--border-default);
                        font-family: inherit;
                        font-size: 1rem;
                        outline: none;
                    }
                    .time-input:focus {
                        border-color: var(--primary);
                        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
                    }
                    .checkbox-row {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        cursor: pointer;
                        font-size: 0.9375rem;
                        color: var(--text-secondary);
                    }
                    .w-full { width: 100%; }
                    .commitment-footer {
                        display: flex;
                        flex-direction: column;
                        gap: 0.75rem;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default StudyCommitment;
