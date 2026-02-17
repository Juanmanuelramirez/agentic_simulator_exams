import React from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { Mail, ShieldCheck } from 'lucide-react';

const LoginView: React.FC = () => {
    const { loginWithGoogle, loginWithAmazon } = useAuth();
    const { t } = useLanguage();

    return (
        <div className="login-view">
            <div className="login-card glass fade-in">
                <div className="login-header">
                    <div className="logo-icon glow-icon">
                        <ShieldCheck size={56} color="var(--primary)" />
                    </div>
                    <h1 className="glow-text">Agentic LMS</h1>
                    <p className="text-secondary">Simulador de Certificaciones con IA</p>
                </div>

                <div className="login-actions grid">
                    <button className="login-btn google-btn" onClick={loginWithGoogle}>
                        <img src="https://www.google.com/favicon.ico" alt="Google" width={18} />
                        Continuar con Google
                    </button>

                    <button className="login-btn amazon-btn" onClick={loginWithAmazon}>
                        <Mail size={18} />
                        Continuar con Amazon
                    </button>
                </div>

                <div className="login-footer">
                    <p className="text-secondary">{t('welcome')}</p>
                </div>
            </div>

            <style>{`
                .login-view {
                    height: 100vh;
                    background: 
                        radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 40%),
                        radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 40%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                }
                .login-card {
                    padding: 3rem 2rem;
                    max-width: 400px;
                    width: 100%;
                    text-align: center;
                    border-radius: var(--radius-lg);
                }
                .logo-icon {
                    margin-bottom: 1.5rem;
                    animation: float 3s ease-in-out infinite;
                }
                h1 { font-size: 2rem; margin-bottom: 0.5rem; }
                .login-actions {
                    margin: 2.5rem 0;
                    gap: 1rem;
                }
                .login-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 0.85rem;
                    border-radius: 12px;
                    border: 1px solid var(--glass-border);
                    background: rgba(255,255,255,0.05);
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .login-btn:hover {
                    background: rgba(255,255,255,0.1);
                    transform: translateY(-2px);
                }
                .login-btn.google {
                    background: white;
                    color: #444;
                    border: none;
                }
                .login-btn.google:hover {
                    background: #f8f9fa;
                }
                .login-btn.amazon {
                    background: #232f3e;
                    border: 1px solid #37475a;
                }
                .login-footer {
                    margin-top: 1rem;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    );
};

export default LoginView;
