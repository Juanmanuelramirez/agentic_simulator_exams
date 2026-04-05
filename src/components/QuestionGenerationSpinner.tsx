import type { GenerationProgress } from '../types';

interface QuestionGenerationSpinnerProps {
  progress: GenerationProgress;
  isFirstBlock?: boolean;
}

const QuestionGenerationSpinner: React.FC<QuestionGenerationSpinnerProps> = ({
  progress,
  isFirstBlock = false,
}) => {
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        maxWidth: 480,
        margin: '0 auto',
        gap: '1.25rem',
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: 56,
          height: 56,
          border: '5px solid var(--border)',
          borderTop: '5px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <p style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>
        {isFirstBlock ? 'Generando primeras preguntas…' : 'Generando preguntas del examen…'}
      </p>

      {/* Progress bar */}
      <div style={{ width: '100%' }}>
        <div
          style={{
            height: 10,
            background: 'var(--border)',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: 'var(--primary)',
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <p style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
          {pct}%
        </p>
      </div>

      {/* Details */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <Detail label="Pregunta" value={`${progress.current} de ${progress.total}`} />
        <Detail label="Dominio actual" value={progress.currentDomain} />
        {progress.estimatedTimeRemaining > 0 && (
          <Detail label="Tiempo estimado" value={`${progress.estimatedTimeRemaining}s`} />
        )}
      </div>

      {/* Counts */}
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {progress.successCount} generadas</span>
        {progress.failureCount > 0 && (
          <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ {progress.failureCount} fallidas</span>
        )}
      </div>
    </div>
  );
};

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ color: 'var(--text-main)', fontWeight: 500, maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
  </div>
);

export default QuestionGenerationSpinner;
