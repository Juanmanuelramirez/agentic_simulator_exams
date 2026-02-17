import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface LanguageContextType {
    language: string;
    setLanguage: (lang: string) => void;
    t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Static dictionary for common UI strings as requested "automatic" capabilities 
// would require heavy infra for an MVP. We'll use this for UI and Bedrock for content.
const staticTranslations: Record<string, Record<string, string>> = {
    'es': {
        'welcome': 'Bienvenido',
        'streak': 'días de racha',
        'start': 'Iniciar',
        'history': 'Historial',
        'study_guide': 'Guía de Estudio'
    },
    'en': {
        'welcome': 'Welcome',
        'streak': 'day streak',
        'start': 'Start',
        'history': 'History',
        'study_guide': 'Study Guide'
    }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        const browserLang = navigator.language.split('-')[0];
        return browserLang === 'es' ? 'es' : 'en'; // Default to en if not es for MVP
    });

    const setLanguage = (lang: string) => {
        setLanguageState(lang);
    };

    const t = (key: string) => {
        return staticTranslations[language]?.[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

/* eslint-disable react-refresh/only-export-components */
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
    return context;
};
