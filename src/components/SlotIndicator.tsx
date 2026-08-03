import React from 'react';
import { useLanguage } from './LanguageContext';

interface SlotIndicatorProps {
  current: number;
  max: number;
}

const SlotIndicator: React.FC<SlotIndicatorProps> = ({ current, max }) => {
  const { t } = useLanguage();
  const remaining = max - current;
  const allUsed = remaining <= 0;

  return (
    <div style={containerStyle}>
      <div style={circlesRowStyle}>
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            style={{
              ...circleStyle,
              background: i < current ? 'var(--primary)' : 'transparent',
              borderColor: i < current ? 'var(--primary)' : 'var(--border)',
            }}
            aria-hidden="true"
          />
        ))}
      </div>
      <p style={textStyle}>
        {allUsed
          ? t('allSlotsUsed')
          : `${t('slotsAvailable', { n: current, max })} — ${t('canAddMore', { n: remaining })}`}
      </p>
    </div>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.5rem 0',
};

const circlesRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.35rem',
};

const circleStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  border: '2px solid',
  transition: 'background 0.2s, border-color 0.2s',
};

const textStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
  fontWeight: 500,
};

export default SlotIndicator;
