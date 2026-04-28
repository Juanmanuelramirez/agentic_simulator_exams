import { useState } from 'react';
import { adminService } from '../services/adminService';
import { imageService } from '../services/imageService';
import type { Exam, ExamDiscoveryResult } from '../types';
import { Loader2 } from 'lucide-react';

interface AdminExamFormProps {
  onSaved: (exam: Exam) => void;
  onCancel: () => void;
  adminUserId: string;
}

const AdminExamForm: React.FC<AdminExamFormProps> = ({ onSaved, onCancel, adminUserId }) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [guideUrl, setGuideUrl] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [discovery, setDiscovery] = useState<ExamDiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleDiscover = async () => {
    if (!name.trim()) { setError('El nombre del examen es requerido.'); return; }
    setError(null);
    setDiscovering(true);
    try {
      const result = await adminService.discoverExam(name.trim(), guideUrl.trim() || undefined);
      setDiscovery(result);
      if (!provider && result.exam.provider) setProvider(result.exam.provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al descubrir el examen.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleSave = async () => {
    if (!discovery) return;
    setSaving(true);
    setError(null);
    setImageError(null);
    try {
      const saved = await adminService.createExam(
        { ...discovery.exam, provider: provider || discovery.exam.provider },
        adminUserId
      );
      setSaving(false);

      // Generate image automatically (non-blocking for exam creation)
      setGeneratingImage(true);
      try {
        const result = await imageService.generateExamImage(saved);
        if (result.success && result.image_url) {
          onSaved({ ...saved, image_url: result.image_url });
        } else {
          setImageError(result.error || 'Error al generar la imagen del examen.');
          onSaved(saved);
        }
      } catch {
        setImageError('Error inesperado al generar la imagen. El examen fue guardado correctamente.');
        onSaved(saved);
      } finally {
        setGeneratingImage(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar el examen.');
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '0.35rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={labelStyle}>Nombre del examen</label>
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="AWS Solutions Architect Associate" />
      </div>
      <div>
        <label style={labelStyle}>Proveedor</label>
        <input style={inputStyle} value={provider} onChange={e => setProvider(e.target.value)} placeholder="AWS" />
      </div>
      <div>
        <label style={labelStyle}>URL de guía oficial (opcional)</label>
        <input style={inputStyle} value={guideUrl} onChange={e => setGuideUrl(e.target.value)} placeholder="https://..." />
      </div>

      {error && (
        <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={handleDiscover}
          disabled={discovering}
          style={{ flex: 1, padding: '0.75rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: discovering ? 'not-allowed' : 'pointer', opacity: discovering ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          {discovering && <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />}
          Descubrir con IA
        </button>
        <button
          onClick={onCancel}
          style={{ padding: '0.75rem 1.25rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          Cancelar
        </button>
      </div>

      {discovery && (
        <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, padding: '1rem' }}>
          <p style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#15803d' }}>Resultados del descubrimiento</p>
          <p style={{ fontSize: '0.85rem', margin: '0.2rem 0' }}>Dominios encontrados: <strong>{discovery.exam.domains.length}</strong></p>
          <p style={{ fontSize: '0.85rem', margin: '0.2rem 0' }}>Duración: <strong>{discovery.exam.duration_minutes} min</strong></p>
          <p style={{ fontSize: '0.85rem', margin: '0.2rem 0' }}>Preguntas oficiales: <strong>{discovery.exam.total_questions_official}</strong></p>
          <p style={{ fontSize: '0.85rem', margin: '0.2rem 0' }}>Confianza: <strong>{discovery.confidence}</strong></p>
          <button
            onClick={handleSave}
            disabled={saving || generatingImage}
            style={{ marginTop: '0.75rem', width: '100%', padding: '0.75rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: (saving || generatingImage) ? 'not-allowed' : 'pointer', opacity: (saving || generatingImage) ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {saving && <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />}
            Confirmar y Guardar
          </button>
          {generatingImage && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
              Generando imagen...
            </div>
          )}
          {imageError && (
            <p style={{ color: '#d97706', fontSize: '0.8rem', margin: '0.5rem 0 0', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
              ⚠️ {imageError}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminExamForm;
