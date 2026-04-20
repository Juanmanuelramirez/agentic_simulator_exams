import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { Mail, ShieldCheck, Lock, CheckCircle, KeyRound } from 'lucide-react';

const LoginView: React.FC = () => {
    const { loginWithGoogle, loginWithAmazon, signIn, signUp, confirmSignUp, resendCode } = useAuth();
    const { t } = useLanguage();

    const [mode, setMode] = useState<'login' | 'register' | 'confirm' | 'new_password'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Clear any stale session before attempting sign-in
            try {
                const { signOut } = await import('aws-amplify/auth');
                await signOut();
            } catch (_) { /* no session to clear — ignore */ }

            const { nextStep } = await signIn({ username: email, password });
            if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
                setMode('confirm');
                setError('Tu cuenta aún no está confirmada. Por favor ingresa el código.');
            } else if (nextStep.signInStep === 'NEW_PASSWORD_REQUIRED') {
                setMode('new_password');
            }
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    const handleNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword !== newPasswordConfirm) {
            setError(t('passwordsDontMatch'));
            return;
        }
        if (newPassword.length < 8) {
            setError(t('passwordMinLength'));
            return;
        }
        if (!/[A-Z]/.test(newPassword)) {
            setError(t('passwordNeedsUppercase'));
            return;
        }
        if (!/[a-z]/.test(newPassword)) {
            setError(t('passwordNeedsLowercase'));
            return;
        }
        if (!/[0-9]/.test(newPassword)) {
            setError(t('passwordNeedsNumber'));
            return;
        }
        setLoading(true);
        try {
            const { confirmSignIn } = await import('aws-amplify/auth');
            const { nextStep } = await confirmSignIn({ challengeResponse: newPassword });
            if (nextStep.signInStep === 'DONE') {
                // Recargar para que AuthContext detecte la sesión activa
                window.location.reload();
            }
        } catch (err: any) {
            setError(err.message || 'Error al actualizar la contraseña');
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

                {mode === 'new_password' ? (
                    <form onSubmit={handleNewPassword} className="auth-form grid">
                        <div className="logo-icon" style={{ marginBottom: '0.5rem' }}>
                            <KeyRound size={32} color="var(--primary)" />
                        </div>
                        <h2 className="mb-1">{t('updatePassword')}</h2>
                        <p className="text-muted mb-2">{t('newPasswordRequired')}</p>
                        <div className="input-group">
                            <Lock size={18} />
                            <input
                                type="password"
                                placeholder={t('newPassword')}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="input-group">
                            <Lock size={18} />
                            <input
                                type="password"
                                placeholder={t('confirmNewPassword')}
                                value={newPasswordConfirm}
                                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        {error && <p className="error-text">{error}</p>}
                        <button type="submit" className="login-btn primary-btn" disabled={loading}>
                            {loading ? t('updating') : t('setNewPassword')}
                        </button>
                    </form>
                ) : mode === 'confirm' ? (
                    <form onSubmit={handleConfirmSignUp} className="auth-form grid">
                        <h2 className="mb-1">{t('confirmAccount')}</h2>
                        <p className="text-muted mb-2">{t('enterCodeSent')} {email}</p>
                        <div className="input-group">
                            <CheckCircle size={18} />
                            <input
                                type="text"
                                placeholder={t('confirmCode')}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="error-text">{error}</p>}
                        <button type="submit" className="login-btn primary-btn" disabled={loading}>
                            {loading ? t('confirming') : t('confirmRegister')}
                        </button>
                        <div className="flex-between mt-1">
                            <button type="button" className="text-btn" onClick={() => setMode('register')}>
                                {t('backToRegister')}
                            </button>
                            <button type="button" className="text-btn" onClick={handleResendCode}>
                                {t('resendCode')}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <form onSubmit={mode === 'login' ? handleEmailSignIn : handleEmailSignUp} className="auth-form grid">
                            <h2 className="mb-1">{mode === 'login' ? t('signIn') : t('createAccount')}</h2>

                            <div className="input-group">
                                <Mail size={18} />
                                <input
                                    type="email"
                                    placeholder={t('yourEmail')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <Lock size={18} />
                                <input
                                    type="password"
                                    placeholder={t('password')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {error && <p className="error-text">{error}</p>}

                            <button type="submit" className="login-btn primary-btn" disabled={loading}>
                                {loading ? t('loading') : mode === 'login' ? t('enter') : t('register')}
                            </button>

                            <div className="mt-1">
                                <button type="button" className="text-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                                    {mode === 'login' ? t('noAccount') : t('hasAccount')}
                                </button>
                                {mode === 'login' && email && (
                                    <button type="button" className="text-btn d-block mt-05" onClick={() => setMode('confirm')}>
                                        {t('pendingCode')}
                                    </button>
                                )}
                            </div>
                        </form>

                        <div className="divider">
                            <span>{t('orContinueWith')}</span>
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
                    min-height: 100vh;
                    background: #0b0e14;
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
                    background: #161b27;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
                    color: #e2e8f0;
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
                    color: rgba(255, 255, 255, 0.4);
                }
                .input-group input {
                    width: 100%;
                    padding: 0.85rem 1rem 0.85rem 2.5rem;
                    background: rgba(255, 255, 255, 0.07);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 12px;
                    color: #e2e8f0;
                    outline: none;
                    transition: border-color 0.2s;
                    font-size: 1rem;
                }
                .input-group input::placeholder {
                    color: rgba(255, 255, 255, 0.35);
                }
                .input-group input:focus {
                    border-color: #6366f1;
                    background: rgba(255, 255, 255, 0.1);
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
                    background: #161b27;
                    padding: 0 10px;
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 0.8rem;
                }
                .login-actions {
                    gap: 1rem;
                    grid-template-columns: 1fr 1fr;
                }
                @media (max-width: 400px) {
                    .login-actions { grid-template-columns: 1fr; }
                }
                .google-btn { background: white; color: #444; }
                .amazon-btn { background: #232f3e; }
                .error-text {
                    color: #ff6b6b;
                    font-size: 0.85rem;
                    margin: 0.25rem 0 0.5rem;
                    text-align: left;
                    background: rgba(255, 77, 77, 0.12);
                    border: 1px solid rgba(255, 77, 77, 0.25);
                    border-radius: 8px;
                    padding: 0.6rem 0.75rem;
                    line-height: 1.4;
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
