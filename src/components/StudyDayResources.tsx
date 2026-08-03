import React from 'react';
import type { DocumentationReference } from '../types';
import { BookOpen } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface DocumentationLinksProps {
    documentation: DocumentationReference[] | undefined;
}

const DocumentationLinks: React.FC<DocumentationLinksProps> = ({ documentation }) => {
    const { t } = useLanguage();
    if (!documentation || documentation.length === 0) return null;

    return (
        <div style={{ marginTop: '1rem' }}>
            <h6 style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem',
            }}>
                {t('officialDocs') || 'Documentación oficial'}
            </h6>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {documentation.map((doc, index) => (
                    <a
                        key={index}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.875rem',
                            background: 'rgba(99, 102, 241, 0.06)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '10px',
                            color: 'var(--primary)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.06)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <BookOpen size={14} />
                        <span>{doc.title}</span>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default DocumentationLinks;
