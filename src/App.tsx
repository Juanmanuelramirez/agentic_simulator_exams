import { useState, useEffect } from 'react'
import './App.css'
import SimulatorView from './components/SimulatorView'
import RealExamView from './components/RealExamView'
import ExamResults from './components/ExamResults'
import UserDashboard from './components/UserDashboard'
import AdminDashboard from './components/AdminDashboard'
import StudyCommitment from './components/StudyCommitment'
import { librarian } from './agents/librarian'
import type { Exam, Question, ExamAttempt, UserProfile, Difficulty } from './types'
import { Shield, User as UserIcon } from 'lucide-react'

function App() {
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty>('intermediate');
  const [examMode, setExamMode] = useState<'simulator' | 'real' | null>(null);
  const [results, setResults] = useState<Question[] | null>(null);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  const [profile, setProfile] = useState<UserProfile>({
    id: 'user-123',
    name: 'Juan Ramirez',
    email: 'juan.ramirez@example.com',
    preferred_language: 'es',
    streak: 5,
    last_access: new Date().toISOString(),
    study_commitment: {
      days: ['Mon', 'Wed'],
      time: '20:00',
      notifications: true
    }
  });

  const [usersList] = useState<UserProfile[]>([
    profile,
    { id: 'user-456', name: 'Maria Garcia', email: 'maria@example.com', streak: 12, last_access: new Date().toISOString(), preferred_language: 'es', study_commitment: { days: [], time: '', notifications: false } }
  ]);

  const [showCommitment, setShowCommitment] = useState(false);

  // Initial data load
  useEffect(() => {
    const loadInitialExams = async () => {
      const defaultExam = await librarian.discoverExam('AWS Certified Solutions Architect - Associate');
      setExams([defaultExam]);
    };
    loadInitialExams();
  }, []);

  const handleStartExam = (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (exam) {
      setActiveExam(exam);
      setExamMode(null); // Force mode selection
    }
  };

  const handleFinishExam = (finishedQuestions: Question[]) => {
    const score = Math.round((finishedQuestions.filter(q => {
      const selected = q.user_selected_ids || [];
      const correct = q.correct_ids;
      return selected.length === correct.length && selected.every(id => correct.includes(id));
    }).length / finishedQuestions.length) * 100);

    const newAttempt: ExamAttempt = {
      id: `att-${Date.now()}`,
      exam_id: activeExam?.id || 'unknown',
      mode: examMode || 'real',
      difficulty: activeDifficulty,
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      questions: finishedQuestions,
      status: 'completed',
      score
    };

    setAttempts([newAttempt, ...attempts]);
    setResults(finishedQuestions);
  };

  const handleSaveCommitment = (commitment: UserProfile['study_commitment']) => {
    setProfile({ ...profile, study_commitment: commitment });
    setShowCommitment(false);
  };

  const handleAddExam = async (partialExam: Partial<Exam>) => {
    // Admin adding a new exam via librarian or manually
    const newExam = await librarian.discoverExam(partialExam.name || 'Nueva Certificación');
    setExams([...exams, newExam]);
    alert('Simulador añadido exitosamente por la IA.');
  };

  // Rendering logic
  if (results) {
    return (
      <ExamResults
        questions={results}
        onExit={() => { setResults(null); setActiveExam(null); setExamMode(null); }}
        onRetry={() => { setResults(null); }}
      />
    );
  }

  if (activeExam) {
    if (!profile.study_commitment.days.length && !showCommitment) {
      setShowCommitment(true);
    }

    if (showCommitment) {
      return (
        <div className="app-container">
          <StudyCommitment
            onSave={handleSaveCommitment}
            onCancel={() => { setActiveExam(null); setShowCommitment(false); }}
          />
        </div>
      );
    }

    if (!examMode) {
      return (
        <div className="app-container flex-center">
          <div className="mode-selection card fade-in">
            <h2 className="mb-1">{activeExam.name}</h2>
            <p className="text-muted mb-2">Configura tu sesión de práctica</p>

            <div className="difficulty-selector mb-2">
              <label>Dificultad:</label>
              <select
                value={activeDifficulty}
                onChange={(e) => setActiveDifficulty(e.target.value as Difficulty)}
                className="select-input"
              >
                <option value="beginner">Principiante (Focus en conceptos)</option>
                <option value="intermediate">Intermedio (Escenarios reales)</option>
                <option value="advanced">Avanzado (Casos críticos)</option>
              </select>
            </div>

            <div className="selection-cards grid">
              <button className="card selection-card" onClick={() => setExamMode('simulator')}>
                <h3>Modo Simulador</h3>
                <p>Feedback inmediato de IA (Bedrock)</p>
              </button>
              <button className="card selection-card" onClick={() => setExamMode('real')}>
                <h3>Modo Examen</h3>
                <p>Tiempo limitado, sin ayudas</p>
              </button>
            </div>
            <button onClick={() => setActiveExam(null)} className="text-btn mt-2">Cancelar</button>
          </div>
          <style>{`
            .mb-1 { margin-bottom: 0.5rem; }
            .mb-2 { margin-bottom: 1.5rem; }
            .mt-2 { margin-top: 1.5rem; }
            .select-input { 
              width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); 
              border: 1px solid var(--glass-border); border-radius: 8px; color: white; margin-top: 0.5rem;
            }
            .selection-card { cursor: pointer; transition: transform 0.2s; }
            .selection-card:hover { transform: scale(1.02); background: rgba(255,255,255,0.08); }
          `}</style>
        </div>
      );
    }

    return examMode === 'simulator'
      ? <div className="app-container"><SimulatorView exam={activeExam} onExit={() => { setActiveExam(null); setExamMode(null); }} /></div>
      : <div className="app-container"><RealExamView exam={activeExam} onExit={() => { setActiveExam(null); setExamMode(null); }} onFinish={handleFinishExam} /></div>;
  }

  return (
    <div className="app-container">
      {role === 'user' ? (
        <UserDashboard
          user={profile}
          attempts={attempts}
          exams={exams}
          onStartExam={handleStartExam}
          onViewDetail={(id) => console.log('View detail', id)}
        />
      ) : (
        <AdminDashboard
          users={usersList}
          exams={exams}
          attempts={attempts}
          onAddExam={handleAddExam}
        />
      )}

      <div className="role-switcher">
        <button className="switch-btn" onClick={() => setRole(role === 'user' ? 'admin' : 'user')}>
          {role === 'user' ? <Shield size={14} /> : <UserIcon size={14} />}
          Switch to {role === 'user' ? 'Admin' : 'User'}
        </button>
      </div>
    </div>
  )
}

export default App
