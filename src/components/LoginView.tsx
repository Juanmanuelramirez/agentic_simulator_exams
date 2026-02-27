import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { Mail, ShieldCheck, Lock, CheckCircle } from 'lucide-react';

const LoginView: React.FC = () => {
    const { loginWithGoogle, loginWithAmazon, signIn, signUp, confirmSignUp, resendCode } = useAuth();
    const { t } = useLanguage();

    const [mode, setMode] = useState<'login' | 'register' | 'confirm'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { nextStep } = await signIn({ username: email, password });
            if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
                setMode('confirm');
                setError('Tu cuenta aún no está confirmada. Por favor ingresa el código.');
            } else if (nextStep.signInStep === 'NEW_PASSWORD_REQUIRED') {
                setError('Se requiere una nueva contraseña. Por favor contacta al administrador.');
            }
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { nextStep } = await signUp({
                username: email,
                password,
                options: {
                    userAttributes: {
                        email
                    }
                }
            });

            if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
                setMode('confirm');
            } else {
                alert('Registro exitoso. Ya puedes iniciar sesión.');
                setMode('login');
            }
        } catch (err: any) {
            setError(err.message || 'Error al registrarse');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await confirmSignUp({ username: email, confirmationCode: code });
            setMode('login');
            alert('Cuenta confirmada. Ya puedes iniciar sesión.');
        } catch (err: any) {
            setError(err.message || 'Error al confirmar cuenta');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setError('');
        try {
            await resendCode(email);
            alert('Código reenviado a ' + email);
        } catch (err: any) {
            setError(err.message || 'Error al reenviar código');
        }
    };

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

                {mode === 'confirm' ? (
                    <form onSubmit={handleConfirmSignUp} className="auth-form grid">
                        <h2 className="mb-1">Confirmar Cuenta</h2>
                        <p className="text-muted mb-2">Ingresa el código enviado a {email}</p>
                        <div className="input-group">
                            <CheckCircle size={18} />
                            <input
                                type="text"
                                placeholder="Código de confirmación"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="error-text">{error}</p>}
                        <button type="submit" className="login-btn primary-btn" disabled={loading}>
                            {loading ? 'Confirmando...' : 'Confirmar Registro'}
                        </button>
                        <div className="flex-between mt-1">
                            <button type="button" className="text-btn" onClick={() => setMode('register')}>
                                Volver al registro
                            </button>
                            <button type="button" className="text-btn" onClick={handleResendCode}>
                                Reenviar código
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <form onSubmit={mode === 'login' ? handleEmailSignIn : handleEmailSignUp} className="auth-form grid">
                            <h2 className="mb-1">{mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>

                            <div className="input-group">
                                <Mail size={18} />
                                <input
                                    type="email"
                                    placeholder="Tu email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <Lock size={18} />
                                <input
                                    type="password"
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {error && <p className="error-text">{error}</p>}

                            <button type="submit" className="login-btn primary-btn" disabled={loading}>
                                {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Registrarse'}
                            </button>

                            <div className="mt-1">
                                <button type="button" className="text-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                                    {mode === 'login' ? '¿No tienes cuenta? Registrate' : '¿Ya tienes cuenta? Inicia sesión'}
                                </button>
                                {mode === 'login' && email && (
                                    <button type="button" className="text-btn d-block mt-05" onClick={() => setMode('confirm')}>
                                        ¿Tienes un código pendiente? Confirmar cuenta
                                    </button>
                                )}
                            </div>
                        </form>

                        <div className="divider">
                            <span>o continuar con</span>
                        </div>

                        <div className="login-actions grid">
                            <button className="login-btn google-btn" onClick={loginWithGoogle}>
                                <img src="https://www.google.com/favicon.ico" alt="Google" width={18} />
                                Google
                            </button>

                            <button className="login-btn amazon-btn" onClick={loginWithAmazon}>
                                <Mail size={18} />
                                Amazon
                            </button>
                        </div>
                    </>
                )}

                <div className="login-footer">
                    <p className="text-secondary">{t('welcome')}</p>
                </div>
            </div>

            <style>{`
                .login-view {
                    height: 100vh;
                    background: var(--bg-main);
                    background-image: 
                        radial-gradient(circle at 10% 10%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
                        radial-gradient(circle at 90% 90%, rgba(168, 85, 247, 0.15) 0%, transparent 50%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                }
                .login-card {
                    padding: 2.5rem 2rem;
                    max-width: 420px;
                    width: 100%;
                    text-align: center;
                    background: var(--bg-card);
                    backdrop-filter: var(--glass-blur);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                }
                .logo-icon {
                    margin-bottom: 1rem;
                    display: inline-block;
                    animation: float 3s ease-in-out infinite;
                }
                .glow-text {
                    font-size: 1.75rem;
                    margin-bottom: 0.25rem;
                }
                .auth-form {
                    margin-top: 2rem;
                    gap: 1rem;
                }
                .input-group {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .input-group svg {
                    position: absolute;
                    left: 12px;
                    color: var(--text-muted);
                }
                .input-group input {
                    width: 100%;
                    padding: 0.85rem 1rem 0.85rem 2.5rem;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--glass-border);
                    border-radius: 12px;
                    color: white;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .input-group input:focus {
                    border-color: var(--primary);
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
                .primary-btn {
                    background: var(--primary);
                    border: none;
                }
                .primary-btn:hover {
                    background: var(--primary-hover);
                    transform: translateY(-1px);
                }
                .primary-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .text-btn {
                    background: none;
                    border: none;
                    color: var(--primary);
                    font-size: 0.9rem;
                    cursor: pointer;
                    font-weight: 500;
                }
                .divider {
                    margin: 1.5rem 0;
                    position: relative;
                    text-align: center;
                    border-bottom: 1px solid var(--glass-border);
                    line-height: 0.1em;
                }
                .divider span {
                    background: #0B0E14;
                    padding: 0 10px;
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                }
                .login-actions {
                    gap: 1rem;
                    grid-template-columns: 1fr 1fr;
                }
                .google-btn { background: white; color: #444; }
                .amazon-btn { background: #232f3e; }
                .error-text {
                    color: #ff4d4d;
                    font-size: 0.85rem;
                    margin: -0.5rem 0 0.5rem;
                    text-align: left;
                }
                .login-footer {
                    margin-top: 1.5rem;
                    font-size: 0.8rem;
                }

                .flex-between {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .mt-05 { margin-top: 0.5rem; }
                .d-block { display: block; }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    );
};

export default LoginView;
