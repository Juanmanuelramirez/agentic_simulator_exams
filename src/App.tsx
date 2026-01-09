import { useState } from 'react'
import './App.css'
import BottomBar from './components/BottomBar'
import SimulatorView from './components/SimulatorView'
import RealExamView from './components/RealExamView'
import ExamResults from './components/ExamResults'
import HistoryView from './components/HistoryView'
import StudyCommitment from './components/StudyCommitment'
import PerformanceChart from './components/PerformanceChart'
import { librarian } from './agents/librarian'
import type { Exam, Question, ExamAttempt, UserProfile } from './types'
import { Loader2, Search as SearchIcon, PlayCircle, GraduationCap, Flame, BarChart } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [examMode, setExamMode] = useState<'simulator' | 'real' | null>(null);
  const [results, setResults] = useState<Question[] | null>(null);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    preferred_language: 'es',
    streak: 5,
    study_commitment: {
      days: [],
      time: '',
      notifications: false
    }
  });
  const [showCommitment, setShowCommitment] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const exam = await librarian.discoverExam(searchQuery);
      setActiveExam(exam);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFinishExam = (finishedQuestions: Question[]) => {
    setResults(finishedQuestions);
    const newAttempt: ExamAttempt = {
      id: `att-${Date.now()}`,
      exam_id: activeExam?.id || 'unknown',
      mode: 'real',
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      questions: finishedQuestions,
      status: 'completed'
    };
    setAttempts([newAttempt, ...attempts]);
  };

  const handleSaveCommitment = (commitment: UserProfile['study_commitment']) => {
    setProfile({ ...profile, study_commitment: commitment });
    setShowCommitment(false);
  };

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
        <StudyCommitment
          onSave={handleSaveCommitment}
          onCancel={() => { setActiveExam(null); setShowCommitment(false); }}
        />
      );
    }

    if (!examMode) {
      return (
        <div className="mode-selection fade-in">
          <header className="page-header center">
            <h1>{activeExam.name}</h1>
            <p className="text-secondary">Selecciona el modo de entrenamiento</p>
          </header>

          <div className="selection-cards">
            <button className="card selection-card" onClick={() => setExamMode('simulator')}>
              <PlayCircle size={48} color="var(--primary-color)" />
              <h3>Modo Simulador</h3>
              <p>Aprendizaje activo con feedback inmediato y explicaciones de IA.</p>
              <span className="badge">Recomendado para estudiar</span>
            </button>
            <button className="card selection-card" onClick={() => setExamMode('real')}>
              <GraduationCap size={48} color="var(--primary-color)" />
              <h3>Modo Examen Real</h3>
              <p>Evaluación sumativa con tiempo limitado y resultados al final.</p>
              <span className="badge secondary">{activeExam.duration_minutes} min</span>
            </button>
          </div>
          <button onClick={() => setActiveExam(null)} className="btn-text">Cancelar</button>

          <style>{`
            .mode-selection { padding: 2rem; max-width: 800px; margin: 0 auto; text-align: center; }
            .selection-cards { display: grid; grid-template-columns: 1fr; gap: 1.5rem; margin: 2rem 0; }
            @media (min-width: 640px) { .selection-cards { grid-template-columns: 1fr 1fr; } }
            .selection-card { 
              display: flex; flex-direction: column; align-items: center; gap: 1rem; 
              text-align: center; padding: 2.5rem 1.5rem; cursor: pointer; border: 1px solid #E2E8F0;
              background: white; border-radius: var(--radius-lg);
            }
            .badge { background: #EEF2FF; color: var(--primary-color); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
            .badge.secondary { background: #F1F5F9; color: var(--text-secondary); }
            .btn-text { background: none; border: none; color: var(--text-secondary); font-weight: 500; cursor: pointer; padding: 1rem; }
          `}</style>
        </div>
      );
    }

    return examMode === 'simulator'
      ? <SimulatorView exam={activeExam} onExit={() => { setActiveExam(null); setExamMode(null); }} />
      : <RealExamView exam={activeExam} onExit={() => { setActiveExam(null); setExamMode(null); }} onFinish={handleFinishExam} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="fade-in">
            <header className="page-header">
              <h1>¡Hola de nuevo!</h1>
              <p className="text-secondary">Tu racha: <span className="streak-fire"><Flame size={16} fill="currentColor" /> {profile.streak} días</span></p>
            </header>

            <section className="dashboard-grid">
              <div className="card glass">
                <h3>Próximo Estudio</h3>
                <p>{profile.study_commitment.days.length ? `${profile.study_commitment.days.join(', ')} a las ${profile.study_commitment.time}` : 'Sin programar'}</p>
                <button className="btn-primary" onClick={() => setShowCommitment(true)}>
                  {profile.study_commitment.days.length ? 'Ajustar Horario' : 'Configurar Compromiso'}
                </button>
              </div>
              <div className="card">
                <h3>Último Intento</h3>
                {attempts.length > 0 ? (
                  <>
                    <p className="success-text">Resolviste {attempts[0].questions.length} preguntas</p>
                    <button className="btn-outline" onClick={() => setActiveTab('history')}>Revisar Historial</button>
                  </>
                ) : (
                  <>
                    <p>No has realizado exámenes todavía.</p>
                    <button className="btn-outline" onClick={() => setActiveTab('discover')}>Explorar Exámenes</button>
                  </>
                )}
              </div>
            </section>
          </div>
        );
      case 'discover':
        return (
          <div className="fade-in">
            <header className="page-header">
              <h1>Descubrir</h1>
              <p className="text-secondary">Encuentra tu próxima certificación</p>
            </header>
            <div className="search-container card glass">
              <div className="input-with-icon">
                <SearchIcon size={20} color="var(--text-secondary)" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej. AWS Solutions Architect..."
                  className="search-input"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="btn-primary"
              >
                {isSearching ? <Loader2 className="animate-spin" size={20} /> : 'Buscar con Agente Librarian'}
              </button>
            </div>
          </div>
        );
      case 'history':
        return <HistoryView attempts={attempts} />;
      case 'stats':
        return (
          <div className="fade-in">
            <header className="page-header">
              <h1>Progreso</h1>
              <p className="text-secondary">Análisis detallado por dominios técnicos</p>
            </header>
            <PerformanceChart attempts={attempts} />
            <div className="card glass stats-meta">
              <div className="stat-item">
                <BarChart size={24} color="var(--primary-color)" />
                <div>
                  <label>Total Exámenes</label>
                  <span>{attempts.length}</span>
                </div>
              </div>
            </div>
            <style>{`
              .stats-meta { margin-top: 1.5rem; display: flex; gap: 2rem; }
              .stat-item { display: flex; align-items: center; gap: 1rem; }
              .stat-item label { display: block; font-size: 0.8rem; color: var(--text-secondary); }
              .stat-item span { font-weight: 700; font-size: 1.2rem; }
            `}</style>
          </div>
        );
      default:
        return (
          <div className="fade-in">
            <header className="page-header">
              <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
              <p className="text-secondary">Próximamente...</p>
            </header>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <main className="main-content">
        {renderContent()}
      </main>
      <BottomBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}

export default App
