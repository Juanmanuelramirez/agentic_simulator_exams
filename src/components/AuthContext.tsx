import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
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
                    scopes: ['email', 'profile', 'openid'],
                    redirectSignIn: [window.location.origin],
                    redirectSignOut: [window.location.origin],
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
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
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
    const [loading, setLoading] = useState(true);

    const checkUser = async () => {
        // DEV BYPASS: Auto-login for UI verification
        // Switch the commented blocks below to simulate different roles:
        if (import.meta.env.DEV || window.location.hostname === 'localhost') {
            // --- Super Admin (default) ---
            setUser({
                id: 'dev-user',
                username: 'DevAdmin',
                email: 'admin@example.com',
                role: 'admin'
            });
            // --- Organization Admin ---
            // setUser({
            //     id: 'dev-org-admin',
            //     username: 'DevOrgAdmin',
            //     email: 'orgadmin@example.com',
            //     role: 'org_admin',
            //     org_id: 'dev-org-001'
            // });
            // --- Student (with org) ---
            // setUser({
            //     id: 'dev-student',
            //     username: 'DevStudent',
            //     email: 'student@example.com',
            //     role: 'user',
            //     org_id: 'dev-org-001'
            // });
            // --- Student (no org, backward compat) ---
            // setUser({
            //     id: 'dev-student-free',
            //     username: 'DevFreeStudent',
            //     email: 'free@example.com',
            //     role: 'user'
            // });
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

            setUser({
                id: currentUser.userId,
                username: currentUser.username,
                email: attributes.email,
                role,
                org_id
            });
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkUser();
    }, []);

    const loginWithGoogle = async () => {
        await signInWithRedirect({ provider: 'Google' });
    };

    const loginWithAmazon = async () => {
        await signInWithRedirect({ provider: 'Amazon' });
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
