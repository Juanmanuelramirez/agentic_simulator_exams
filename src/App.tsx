import { useState, useEffect } from 'react'
import './App.css'
import SimulatorView from './components/SimulatorView'
import RealExamView from './components/RealExamView'
import ExamResults from './components/ExamResults'
import UserDashboard from './components/UserDashboard'
import AdminDashboard from './components/AdminDashboard'
import StudyCommitment from './components/StudyCommitment'
import { librarian } from './agents/librarian'
import { solver } from './agents/solver'
import { mentor } from './agents/mentor'
import type { Exam, Question, ExamAttempt, UserProfile, Difficulty, StudyGuide } from './types'
import { Globe, LogOut, Loader2, Zap, Award, Target, BookOpen, AlertCircle, ChevronLeft } from 'lucide-react'
import { useLanguage } from './components/LanguageContext'
import { useAuth } from './components/AuthContext'
import LoginView from './components/LoginView'

import { dbService } from './services/db'

function App() {
  const { language, setLanguage } = useLanguage();
  const { user, loading, logout } = useAuth();

  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty>('intermediate');
  const [examMode, setExamMode] = useState<'simulator' | 'real' | null>(null);
  const [results, setResults] = useState<Question[] | null>(null);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);

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

  // Sync profile and Load User Performance from DynamoDB
  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        id: user.id || 'current-user',
        name: user.username,
        email: user.email || ''
      }));

      // Load real attempts from DB
      const loadUserHistory = async () => {
        try {
          const history = await dbService.getUserAttempts(user.id);
          setAttempts(history);
        } catch (error) {
          console.error("Failed to load history from DynamoDB", error);
        }
      };
      loadUserHistory();
    }
  }, [user]);

  const [showCommitment, setShowCommitment] = useState(false);

  // Production Load: All exams come from DynamoDB
  useEffect(() => {
    const loadProductionExams = async () => {
      if (!dbService.hasValidCredentials()) {
        console.warn("AWS Credentials not configured in .env. Persistence will fail.");
        return;
      }

      try {
        console.log("Loading exams from DynamoDB...");
        const dbExams = await dbService.getExams();
        console.log(`Loaded ${dbExams.length} exams.`);

        if (dbExams.length === 0) {
          console.log("Database empty. Performing cold start discovery...");
          const defaultExam = await librarian.discoverExam('AWS Certified Solutions Architect - Associate');
          setExams([defaultExam]);
        } else {
          setExams(dbExams);
        }
      } catch (error) {
        console.error("Database connection failure", error);
      }
    };
    loadProductionExams();
  }, []);

  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);

  const handleAddExam = async (examName: string) => {
    console.log(`Starting addition of exam: ${examName}`);
    setGeneratingQuestions(true);
    try {
      if (!dbService.hasValidCredentials()) {
        throw new Error("AWS_CREDENTIALS_MISSING: Verifica las variables de entorno en .env");
      }

      const newExam = await librarian.discoverExam(examName);
      console.log("Exam discovered and saved:", newExam);

      setExams(prev => {
        const filtered = prev.filter(e => e.id !== newExam.id);
        const updated = [...filtered, newExam];
        console.log("Updated exams state length:", updated.length);
        return updated;
      });
    } catch (error: any) {
      console.error("Failed to add exam:", error);
      const msg = error.message?.includes('AWS_CREDENTIALS_MISSING')
        ? "Error: Credenciales de AWS no configuradas."
        : "Error al añadir el simulador. Revisa la consola para más detalles.";
      alert(msg);
      throw error;
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    try {
      await dbService.deleteExam(examId);
      setExams(prev => prev.filter(e => e.id !== examId));
    } catch (error) {
      console.error("Failed to delete exam from DB", error);
    }
  };

  const handleStartExamData = async (exam: Exam, difficulty: Difficulty, mode: 'simulator' | 'real') => {
    setGeneratingQuestions(true);
    setExamMode(mode);
    try {
      const batch = await solver.generateBatch(exam, 10, difficulty, language);
      setCurrentQuestions(batch);
    } catch (error) {
      console.error("Failed to generate questions", error);
      alert("Error al generar las preguntas. Intenta de nuevo.");
      setExamMode(null);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleStartExam = (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (exam) {
      setActiveExam(exam);
      setExamMode(null);
      setCurrentQuestions([]);
    }
  };

  const handleFinishExam = async (finishedQuestions: Question[]) => {
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

    // Global persistence in DynamoDB
    if (user) {
      try {
        await dbService.saveAttempt({ ...newAttempt, user_id: user.id });
        setAttempts(prev => [newAttempt, ...prev]);
      } catch (error) {
        console.error("Failed to save attempt to DynamoDB", error);
      }
    }

    setResults(finishedQuestions);
  };

  const handleSaveCommitment = (commitment: UserProfile['study_commitment']) => {
    setProfile({ ...profile, study_commitment: commitment });
    setShowCommitment(false);
  };

  const handleGenerateStudyGuide = async () => {
    if (attempts.length === 0) {
      alert("Completa al menos un examen para generar una guía personalizada.");
      return;
    }

    setIsGeneratingGuide(true);
    try {
      const guide = await mentor.generateStudyGuide(attempts, exams, language);
      setStudyGuide(guide);
    } catch (error: any) {
      console.error("Failed to generate study guide", error);
      alert(`Error al generar la guía: ${error.message || 'Error desconocido'}. Revisa los datos de tus exámenes.`);
    } finally {
      setIsGeneratingGuide(false);
    }
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
    if (!profile.study_commitment?.days?.length && !showCommitment) {
      setShowCommitment(true);
    }

    if (generatingQuestions) {
      return (
        <div className="app-container flex-center">
          <div className="loading-state card fade-in text-center">
            <Loader2 className="animate-spin mb-1" size={48} color="var(--primary-color)" />
            <h2>Generando tu simulador...</h2>
            <p className="text-muted">El Agente AI (Bedrock) está creando 10 preguntas personalizadas para ti.</p>
          </div>
        </div>
      );
    }

    if (!examMode) {
      return (
        <div className="app-container flex-center">
          <div className="mode-selection-container glass fade-in">
            <div className="selection-header">
              <button onClick={() => setActiveExam(null)} className="back-btn">
                <ChevronLeft size={20} />
              </button>
              <div className="exam-badge">
                <BookOpen size={14} />
                <span>Examen Seleccionado</span>
              </div>
            </div>

            <h1 className="exam-title">{activeExam.name}</h1>
            <p className="exam-subtitle">Configura tu experiencia de aprendizaje para hoy</p>

            <div className="setup-grid">
              <div className="difficulty-box card">
                <div className="box-header">
                  <Target size={20} color="var(--primary-color)" />
                  <h3>Nivel de Dificultad</h3>
                </div>
                <select
                  value={activeDifficulty}
                  onChange={(e) => setActiveDifficulty(e.target.value as Difficulty)}
                  className="difficulty-select"
                >
                  <option value="beginner">Principiante (Básico)</option>
                  <option value="intermediate">Intermedio (Estándar)</option>
                  <option value="advanced">Avanzado (Complejo)</option>
                </select>
                <p className="difficulty-hint">
                  {activeDifficulty === 'beginner' && "Ideal para repasar conceptos fundamentales."}
                  {activeDifficulty === 'intermediate' && "Equilibrado para preparación de certificación."}
                  {activeDifficulty === 'advanced' && "Desafiante con escenarios críticos de negocio."}
                </p>
              </div>

              <div className="mode-options">
                <div
                  className={`mode-card ${examMode === 'simulator' ? 'active' : ''}`}
                  onClick={() => handleStartExamData(activeExam, activeDifficulty, 'simulator')}
                >
                  <div className="mode-icon simulator">
                    <Zap size={24} />
                  </div>
                  <div className="mode-info">
                    <h3>Modo Simulador</h3>
                    <p>Feedback inmediato de IA y explicaciones profundas.</p>
                  </div>
                  <div className="mode-action">
                    <span>Empezar</span>
                  </div>
                </div>

                <div
                  className={`mode-card ${examMode === 'real' ? 'active' : ''}`}
                  onClick={() => handleStartExamData(activeExam, activeDifficulty, 'real')}
                >
                  <div className="mode-icon exam">
                    <Award size={24} />
                  </div>
                  <div className="mode-info">
                    <h3>Modo Examen</h3>
                    <p>Condiciones reales, tiempo limitado y sin ayudas.</p>
                  </div>
                  <div className="mode-action">
                    <span>Empezar</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="selection-footer">
              <AlertCircle size={14} />
              <span>Puedes cambiar de modo en cualquier momento tras finalizar.</span>
            </div>
          </div>
        </div>
      );
    }

    return examMode === 'simulator'
      ? <div className="app-container"><SimulatorView exam={activeExam} initialQuestions={currentQuestions} onExit={() => { setActiveExam(null); setExamMode(null); }} onFinish={handleFinishExam} /></div>
      : <div className="app-container"><RealExamView exam={activeExam} initialQuestions={currentQuestions} onExit={() => { setActiveExam(null); setExamMode(null); }} onFinish={handleFinishExam} /></div>;
  }

  return (
    <div className="app-container">
      {user.role === 'admin' ? (
        <AdminDashboard
          users={[profile]}
          exams={exams}
          attempts={attempts}
          onAddExam={handleAddExam}
          onDeleteExam={handleDeleteExam}
        />
      ) : (
        <UserDashboard
          user={profile}
          attempts={attempts}
          exams={exams}
          studyGuide={studyGuide}
          isGeneratingGuide={isGeneratingGuide}
          onStartExam={handleStartExam}
          onViewDetail={(id) => console.log('View detail', id)}
          onGenerateGuide={handleGenerateStudyGuide}
          onToggleTask={(taskId) => {
            if (!studyGuide) return;
            const updatedTasks = studyGuide.tasks.map(t =>
              t.id === taskId ? { ...t, completed: !t.completed } : t
            );
            setStudyGuide({ ...studyGuide, tasks: updatedTasks });
          }}
        />
      )}

      {showCommitment && (
        <StudyCommitment
          onSave={handleSaveCommitment}
          onCancel={() => { setActiveExam(null); setShowCommitment(false); }}
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
