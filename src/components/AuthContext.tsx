import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchUserAttributes, signOut, signInWithRedirect } from 'aws-amplify/auth';

// Amplify Configuration (using env variables)
Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID || 'dummy-pool',
            userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID || 'dummy-client',
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
    role: 'user' | 'admin';
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    loginWithAmazon: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const checkUser = async () => {
        try {
            const currentUser = await getCurrentUser();
            const attributes = await fetchUserAttributes();

            // Determine role based on a custom attribute or group membership
            // For now, we'll use an attribute 'custom:role' or fallback to 'user'
            const role = (attributes['custom:role'] as 'user' | 'admin') || 'user';

            setUser({
                id: currentUser.userId,
                username: currentUser.username,
                email: attributes.email,
                role
            });
        } catch (error) {
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

    const logout = async () => {
        await signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithAmazon, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
