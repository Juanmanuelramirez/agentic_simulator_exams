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
import { Globe, LogOut, Loader2 } from 'lucide-react'
import { useLanguage } from './components/LanguageContext'
import { useAuth } from './components/AuthContext'
import LoginView from './components/LoginView'

function App() {
  const { language, setLanguage } = useLanguage();
  const { user, loading, logout } = useAuth();

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

  // Sync profile with authenticated user
  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        id: user.id || 'current-user',
        name: user.username,
        email: user.email || ''
      }));
    }
  }, [user]);

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
    const newExam = await librarian.discoverExam(partialExam.name || 'Nueva Certificación');
    setExams([...exams, newExam]);
    alert('Simulador añadido exitosamente por la IA.');
  };

  if (loading) {
    return (
      <div className="app-container flex-center">
        <Loader2 className="animate-spin" size={48} color="var(--primary-color)" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

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
        </div>
      );
    }

    return examMode === 'simulator'
      ? <div className="app-container"><SimulatorView exam={activeExam} onExit={() => { setActiveExam(null); setExamMode(null); }} /></div>
      : <div className="app-container"><RealExamView exam={activeExam} onExit={() => { setActiveExam(null); setExamMode(null); }} onFinish={handleFinishExam} /></div>;
  }

  return (
    <div className="app-container">
      {user.role === 'user' ? (
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
        <div className="lang-selector mb-1">
          <Globe size={14} />
          <button
            className={`lang-btn ${language === 'es' ? 'active' : ''}`}
            onClick={() => setLanguage('es')}
          >
            ES
          </button>
          <button
            className={`lang-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => setLanguage('en')}
          >
            EN
          </button>
        </div>
        <button className="switch-btn" onClick={logout}>
          <LogOut size={14} />
          Cerrar Sesión ({user.username})
        </button>
      </div>
    </div>
  )
}

export default App
