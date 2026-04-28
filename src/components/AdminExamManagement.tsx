import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { imageService } from '../services/imageService';
import type { Exam } from '../types';
import AdminExamForm from './AdminExamForm';
import { Plus, ToggleLeft, ToggleRight, Loader2, ImageIcon, RefreshCw } from 'lucide-react';

interface AdminExamManagementProps {
  adminUserId: string;
}

const AdminExamManagement: React.FC<AdminExamManagementProps> = ({ adminUserId }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const loadExams = async () => {
    setLoading(true);
    try {
      const list = await adminService.listExams();
      setExams(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar exámenes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadExams(); }, []);

  const handleToggleActive = async (exam: Exam) => {
    setTogglingId(exam.id);
    try {
      if (exam.is_active) {
        await adminService.deactivateExam(exam.id);
      } else {
        await adminService.activateExam(exam.id);
      }
      await loadExams();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar el examen.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaved = async (_exam: Exam) => {
    setShowForm(false);
    await loadExams();
  };

  const handleRegenerateImage = async (exam: Exam) => {
    setRegeneratingId(exam.id);
    try {
      await imageService.generateExamImage(exam);
      await loadExams();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al regenerar la imagen.');
    } finally {
      setRegeneratingId(null);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Gestión de Exámenes</h2>
        <button
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={16} /> Agregar Examen
        </button>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>}

      {showForm && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Agregar nuevo examen de certificación</h3>
          <AdminExamForm adminUserId={adminUserId} onSaved={handleSaved} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 size={32} style={{ animation: 'spin 0.9s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : exams.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No hay exámenes registrados.</p>
      ) : (
        exams.map(exam => (
          <div key={exam.id} style={{ ...cardStyle, opacity: exam.is_active ? 1 : 0.6 }}>
            {exam.image_url ? (
              <img
                src={exam.image_url}
                alt={exam.name}
                style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ImageIcon size={24} color="#9ca3af" />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: '1rem' }}>{exam.name}</p>
              <p style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Proveedor: {exam.provider}</p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Preguntas: <strong>{exam.total_questions_official}</strong></span>
                <span>Dominios: <strong>{exam.domains.length}</strong></span>
                {exam.usage_stats && (
                  <>
                    <span>Intentos: <strong>{exam.usage_stats.total_attempts}</strong></span>
                    <span>Promedio: <strong>{exam.usage_stats.average_score}%</strong></span>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
              <button
                onClick={() => handleRegenerateImage(exam)}
                disabled={regeneratingId === exam.id}
                title="Regenerar imagen"
                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {regeneratingId === exam.id
                  ? <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
                  : <RefreshCw size={16} color="var(--text-secondary)" />
                }
              </button>
              <button
                onClick={() => handleToggleActive(exam)}
                disabled={togglingId === exam.id}
                title={exam.is_active ? 'Desactivar' : 'Activar'}
                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {togglingId === exam.id
                  ? <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
                  : exam.is_active
                    ? <ToggleRight size={18} color="#16a34a" />
                    : <ToggleLeft size={18} color="#9ca3af" />
                }
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminExamManagement;
