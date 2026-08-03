import { useState, useEffect, useRef } from 'react';
import { adminService } from '../services/adminService';
import { imageService } from '../services/imageService';
import type { Exam } from '../types';
import AdminExamForm from './AdminExamForm';
import { Plus, ToggleLeft, ToggleRight, Loader2, ImageIcon, Upload } from 'lucide-react';

interface AdminExamManagementProps {
  adminUserId: string;
}

const AdminExamManagement: React.FC<AdminExamManagementProps> = ({ adminUserId }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadExamRef = useRef<Exam | null>(null);

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

  const handleUploadClick = (exam: Exam) => {
    uploadExamRef.current = exam;
    fileInputRef.current?.click();
  };

  /** Valida dimensiones de la imagen: proporción 16:9, mínimo 960×540 */
  const validateImageDimensions = (file: File): Promise<{ valid: boolean; width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve({ valid: true, width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve({ valid: false, width: 0, height: 0 });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const exam = uploadExamRef.current;
    if (!file || !exam) return;

    // Reset file input for re-selection
    e.target.value = '';

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('❌ El archivo debe ser una imagen (PNG, JPG, WebP).');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(`❌ La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. Máximo permitido: 10 MB.`);
      return;
    }

    // Validate image dimensions
    const dims = await validateImageDimensions(file);
    if (!dims.valid) {
      alert('❌ No se pudo leer la imagen. Intenta con otro archivo.');
      return;
    }

    // Check minimum dimensions
    if (dims.width < 960 || dims.height < 540) {
      alert(`❌ Imagen muy pequeña (${dims.width}×${dims.height}). Mínimo requerido: 960×540 px.`);
      return;
    }

    // Check aspect ratio (16:9 = 1.777, tolerance ±10%)
    const ratio = dims.width / dims.height;
    const target = 16 / 9; // 1.777
    if (ratio < target * 0.9 || ratio > target * 1.1) {
      alert(`❌ Proporción incorrecta (${dims.width}×${dims.height}). Se requiere 16:9.\nEjemplo: 1280×720 o 1920×1080.`);
      return;
    }

    setUploadingId(exam.id);
    setError(null);
    try {
      const result = await imageService.uploadExamImage(exam, file);
      if (result.success) {
        alert(`✅ Imagen subida correctamente para "${exam.name}".`);
      } else {
        alert(`❌ Error al subir: ${result.error || 'Error desconocido'}`);
      }
      await loadExams();
    } catch (err) {
      alert(`❌ Error al subir: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setUploadingId(null);
      uploadExamRef.current = null;
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
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

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
                onClick={() => handleUploadClick(exam)}
                disabled={uploadingId === exam.id}
                title={exam.image_url ? 'Cambiar imagen (16:9, mín 960×540, máx 10 MB)' : 'Subir imagen (16:9, mín 960×540, máx 10 MB)'}
                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {uploadingId === exam.id
                  ? <Loader2 size={16} style={{ animation: 'spin 0.9s linear infinite' }} />
                  : <Upload size={16} color="var(--text-secondary)" />
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
