import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { Hub } from 'aws-amplify/utils';
import {
    getCurrentUser,
    fetchUserAttributes,
    signOut,
    signInWithRedirect,
    signUp as amplifySignUp,
    signIn as amplifySignIn,
    confirmSignUp as amplifyConfirmSignUp,
    resendSignUpCode as amplifyResendSignUpCode,
    type SignUpInput,
    type SignInInput,
    type ConfirmSignUpInput
} from 'aws-amplify/auth';
import { subscriptionService, computeEffectiveStatus } from '../services/subscriptionService';
import { getOrganizationById, computeOrgAccessStatus } from '../services/organizationService';
import type { Subscription, SubscriptionStatus } from '../types';

// Amplify Configuration
// Los IDs de Cognito vienen de variables de entorno generadas automáticamente
// por setup-aws-infra.sh. NO se usan Access Keys estáticas: las credenciales
// de AWS (Bedrock, DynamoDB, Translate) se obtienen via Identity Pool (STS).
Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID || 'dummy-pool',
            userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID || 'dummy-client',
            identityPoolId: import.meta.env.VITE_AWS_IDENTITY_POOL_ID || undefined,
            loginWith: {
                oauth: {
                    domain: import.meta.env.VITE_AWS_COGNITO_DOMAIN || 'dummy-domain.auth.us-east-1.amazoncognito.com',
                    scopes: ['email', 'profile', 'openid', 'aws.cognito.signin.user.admin'],
                    redirectSignIn: [window.location.origin + '/'],
                    redirectSignOut: [window.location.origin + '/'],
                    responseType: 'code'
                }
            }
        }
    }
});

interface AuthUser {
    id: string;
    username: string;
    email?: string;
    role: 'admin' | 'org_admin' | 'user';
    org_id?: string;
    subscription_status?: SubscriptionStatus;
    org_access_status?: 'active' | 'expiring_soon' | 'expired';
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    subscription?: Subscription;
    refreshSubscription: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    loginWithAmazon: () => Promise<void>;
    signUp: (input: SignUpInput) => Promise<any>;
    signIn: (input: SignInInput) => Promise<any>;
    confirmSignUp: (input: ConfirmSignUpInput) => Promise<any>;
    resendCode: (username: string) => Promise<any>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [subscription, setSubscription] = useState<Subscription | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    // Helper: fetch subscription for individual students (role=user, no org_id)
    const fetchSubscriptionForUser = async (userId: string): Promise<{ sub?: Subscription; status: SubscriptionStatus }> => {
        try {
            const sub = await subscriptionService.getSubscription(userId);
            if (!sub) {
                return { status: 'none' };
            }
            const effectiveStatus = computeEffectiveStatus(sub);
            return { sub, status: effectiveStatus };
        } catch (err) {
            console.error('Failed to fetch subscription:', err);
            return { status: 'none' };
        }
    };

    // Helper: clear stale Cognito/Amplify auth state from localStorage and memory
    const clearStaleAuthState = async () => {
        // First, try to sign out locally (no redirect to Cognito logout endpoint)
        try {
            await signOut({ global: false });
        } catch (_) {
            // No active session to clear — ignore
        }
        // Then clear any residual localStorage tokens
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith('CognitoIdentityServiceProvider') || key.startsWith('amplify')) {
                localStorage.removeItem(key);
            }
        }
    };

    const checkUser = async () => {
        // DEV BYPASS: Auto-login for UI verification
        // Switch the commented blocks below to simulate different roles:
        if (import.meta.env.DEV || window.location.hostname === 'localhost') {
            // --- Super Admin (default) ---
            const devUser: AuthUser = {
                id: 'dev-user',
                username: 'DevAdmin',
                email: 'admin@example.com',
                role: 'admin'
            };
            // --- Organization Admin ---
            // const devUser: AuthUser = {
            //     id: 'dev-org-admin',
            //     username: 'DevOrgAdmin',
            //     email: 'orgadmin@example.com',
            //     role: 'org_admin',
            //     org_id: 'dev-org-001'
            // };
            // --- Student (with org) ---
            // const devUser: AuthUser = {
            //     id: 'dev-student',
            //     username: 'DevStudent',
            //     email: 'student@example.com',
            //     role: 'user',
            //     org_id: 'dev-org-001'
            // };
            // --- Student (no org, backward compat) ---
            // const devUser: AuthUser = {
            //     id: 'dev-student-free',
            //     username: 'DevFreeStudent',
            //     email: 'free@example.com',
            //     role: 'user'
            // };

            // Fetch subscription for individual students in dev mode
            if (devUser.role === 'user' && !devUser.org_id) {
                const { sub, status } = await fetchSubscriptionForUser(devUser.id);
                devUser.subscription_status = status;
                setSubscription(sub);
            }

            // Evaluate org access status for org students in dev mode
            if (devUser.role === 'user' && devUser.org_id) {
                try {
                    const org = await getOrganizationById(devUser.org_id);
                    if (org) {
                        const member = (org.members || []).find(m => m.user_id === devUser.id);
                        if (member) {
                            devUser.org_access_status = computeOrgAccessStatus(member);
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch org access status:', err);
                }
            }

            setUser(devUser);
            setLoading(false);
            return;
        }

        try {
            const currentUser = await getCurrentUser();
            const attributes = await fetchUserAttributes();

            const devAdminEmail = import.meta.env.VITE_DEV_ADMIN_EMAIL;
            const role = (attributes['custom:role'] as 'admin' | 'org_admin' | 'user') ||
                (attributes.email === devAdminEmail ? 'admin' : 'user');
            const org_id = attributes['custom:org_id'] || undefined;

            const resolvedUser: AuthUser = {
                id: currentUser.userId,
                username: currentUser.username,
                email: attributes.email,
                role,
                org_id
            };

            // Fetch subscription for individual students (role=user, no org_id)
            if (role === 'user' && !org_id) {
                const { sub, status } = await fetchSubscriptionForUser(currentUser.userId);
                resolvedUser.subscription_status = status;
                setSubscription(sub);
            }

            // Evaluate org access status for org students
            if (role === 'user' && org_id) {
                try {
                    const org = await getOrganizationById(org_id);
                    if (org) {
                        const member = (org.members || []).find(m => m.user_id === currentUser.userId);
                        if (member) {
                            resolvedUser.org_access_status = computeOrgAccessStatus(member);
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch org access status:', err);
                }
            }

            setUser(resolvedUser);
        } catch (err) {
            // Clear stale Amplify tokens so signInWithRedirect works cleanly
            await clearStaleAuthState();
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const refreshSubscription = useCallback(async () => {
        if (!user || user.role !== 'user' || user.org_id) return;
        const { sub, status } = await fetchSubscriptionForUser(user.id);
        setSubscription(sub);
        setUser(prev => prev ? { ...prev, subscription_status: status } : null);
    }, [user]);

    useEffect(() => {
        // If the URL contains ?code=, an OAuth code exchange is in progress.
        // Skip checkUser on mount and let the Hub listener handle it after
        // Amplify finishes the exchange. Running checkUser now would race
        // against the exchange and clear tokens mid-flight.
        const urlParams = new URLSearchParams(window.location.search);
        const hasOAuthCode = urlParams.has('code');

        if (!hasOAuthCode) {
            checkUser();
        }

        // Listen for OAuth redirect completion
        const unsubscribe = Hub.listen('auth', ({ payload }) => {
            if (payload.event === 'signInWithRedirect') {
                checkUser();
            }
            if (payload.event === 'signInWithRedirect_failure') {
                console.error('OAuth redirect failed:', payload.data);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        try {
            await clearStaleAuthState();
            // Small delay to let Amplify fully reset internal state after cleanup
            await new Promise(r => setTimeout(r, 100));
            await signInWithRedirect({ provider: 'Google' });
        } catch (err) {
            console.error('Google login error:', err);
        }
    };

    const loginWithAmazon = async () => {
        try {
            await clearStaleAuthState();
            await new Promise(r => setTimeout(r, 100));
            await signInWithRedirect({ provider: 'Amazon' });
        } catch (err) {
            console.error('Amazon login error:', err);
        }
    };

    const signUp = async (input: SignUpInput) => {
        try {
            const output = await amplifySignUp(input);
            return output;
        } catch (err) {
            console.error('SignUp Error:', err);
            throw err;
        }
    };

    const signIn = async (input: SignInInput) => {
        try {
            const output = await amplifySignIn(input);
            if (output.nextStep.signInStep === 'DONE') {
                await checkUser();
            }
            return output;
        } catch (err) {
            console.error('SignIn Error:', err);
            throw err;
        }
    };

    const confirmSignUp = async (input: ConfirmSignUpInput) => {
        try {
            const output = await amplifyConfirmSignUp(input);
            return output;
        } catch (err) {
            console.error('ConfirmSignUp Error:', err);
            throw err;
        }
    };

    const resendCode = async (username: string) => {
        await amplifyResendSignUpCode({ username });
    };

    const logout = async () => {
        await signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            subscription,
            refreshSubscription,
            loginWithGoogle,
            loginWithAmazon,
            signUp,
            signIn,
            confirmSignUp,
            resendCode,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

/* eslint-disable react-refresh/only-export-components */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
