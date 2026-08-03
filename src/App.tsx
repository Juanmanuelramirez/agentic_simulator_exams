import { useState, useEffect } from 'react'
import './App.css'
import SimulatorView from './components/SimulatorView'
import RealExamView from './components/RealExamView'
import ExamResults from './components/ExamResults'
import UserDashboard from './components/UserDashboard'
import AdminDashboard from './components/AdminDashboard'
import StudyCommitment from './components/StudyCommitment'
import AdminExamManagement from './components/AdminExamManagement'
import OrgManagement from './components/OrgManagement'
import AdminStudentList from './components/AdminStudentList'
import OrgAccessExpiredView from './components/OrgAccessExpiredView'
import OrgAdminDashboard from './components/OrgAdminDashboard'
import StudentList from './components/StudentList'
import ExamSelector from './components/ExamSelector'
import SubscriptionPlans from './components/SubscriptionPlans'
import TrialBanner from './components/TrialBanner'
import SubscriptionManager from './components/SubscriptionManager'
import MySimulators from './components/MySimulators'
import { librarian } from './agents/librarian'
import { solver } from './agents/solver'
import { mentor } from './agents/mentor'
import type { Exam, Question, ExamAttempt, UserProfile, Difficulty, StudyGuide, GenerationProgress, Organization } from './types'
import { Zap, Award, BookOpen, AlertCircle, ChevronLeft, Loader2 } from 'lucide-react'
import { useLanguage } from './components/LanguageContext'
import { useAuth } from './components/AuthContext'
import LoginView from './components/LoginView'
import Sidebar from './components/Sidebar'

import { dbService } from './services/db'
import { getOrganizationById } from './services/organizationService'
import { subscriptionService, classifyExamChange, MAX_TRIAL_SIMULATIONS } from './services/subscriptionService'

function App() {
  const { language, t } = useLanguage();
  const { user, loading, logout, subscription, refreshSubscription } = useAuth();

  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty>('intermediate');
  const [examMode, setExamMode] = useState<'simulator' | 'real' | null>(null);
  const [results, setResults] = useState<Question[] | null>(null);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(() => {
    try {
      const saved = localStorage.getItem('studyGuide');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);

  // Persist study guide to localStorage whenever it changes
  useEffect(() => {
    if (studyGuide) {
      localStorage.setItem('studyGuide', JSON.stringify(studyGuide));
    }
  }, [studyGuide]);

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

          // Auto-pause: mark any in_progress attempts older than 30 minutes as paused
          const THIRTY_MINUTES = 30 * 60 * 1000;
          const now = Date.now();
          for (const a of history) {
            if (a.status === 'in_progress' || (a.status === 'paused' && !a.paused_at_index && a.paused_at_index !== 0)) {
              const startTime = new Date(a.start_time).getTime();
              if (now - startTime > THIRTY_MINUTES) {
                // Mark as paused in DB
                a.status = 'paused';
                try {
                  await dbService.saveAttempt({ ...a, user_id: user.id, status: 'paused' });
                } catch (_) {}
              }
            }
          }

          // Dedup paused: keep latest per exam, delete old duplicates from DB
          const pausedByExam = new Map<string, ExamAttempt[]>();
          const nonPaused: ExamAttempt[] = [];
          for (const a of history) {
            if (a.status === 'paused') {
              const key = a.exam_id;
              if (!pausedByExam.has(key)) pausedByExam.set(key, []);
              pausedByExam.get(key)!.push(a);
            } else {
              nonPaused.push(a);
            }
          }
          const deduped = [...nonPaused];
          for (const [, pausedList] of pausedByExam) {
            // Sort by start_time desc, keep newest
            pausedList.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
            deduped.push(pausedList[0]);
            // Delete older duplicates from DB
            for (let i = 1; i < pausedList.length; i++) {
              try { await dbService.deleteAttempt(pausedList[i].id); } catch (_) {}
            }
          }
          setAttempts(deduped);
        } catch (error) {
          console.error("Failed to load history from DynamoDB", error);
        }
      };
      loadUserHistory();
    }
  }, [user]);

  const [showCommitment, setShowCommitment] = useState(false);

  // Subscription: selected exam IDs for the exam selector flow
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [showSubscriptionFlow, setShowSubscriptionFlow] = useState(false);

  // Organization data for org_admin and users with org_id
  const [userOrganization, setUserOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    if (!user || !user.org_id) {
      setUserOrganization(null);
      return;
    }
    const loadOrg = async () => {
      try {
        const org = await getOrganizationById(user.org_id!);
        setUserOrganization(org);
      } catch (error) {
        console.error('Failed to load user organization', error);
      }
    };
    loadOrg();
  }, [user]);

  // Production Load: All exams come from DynamoDB - espera a que el usuario esté autenticado
  useEffect(() => {
    if (!user) return; // No cargar hasta tener sesión activa

    const loadProductionExams = async () => {
      try {
        console.log("Loading exams from DynamoDB...");
        const dbExams = await dbService.getExams();
        console.log(`Loaded ${dbExams.length} exams.`);

        if (dbExams.length === 0) {
          console.log("Database empty. Performing cold start discovery...");
          const discovery = await librarian.discoverExam('AWS Certified Solutions Architect - Associate');
          setExams([discovery.exam]);
        } else {
          setExams(dbExams);
        }
      } catch (error) {
        console.error("Database connection failure", error);
      }
    };
    loadProductionExams();
  }, [user]); // Re-ejecutar cuando cambie el usuario (login/logout)

  // Filter exams by organization assignment when user has org_id
  const filteredExams = (() => {
    if (user?.org_id && userOrganization) {
      return exams.filter(e => userOrganization.assigned_exam_ids.includes(e.id));
    }
    return exams;
  })();

  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [examLengthPercentage, setExamLengthPercentage] = useState<50 | 75 | 100>(100);
  // Generación en background: total solicitado vs generadas hasta ahora
  const [bgGenerationTotal, setBgGenerationTotal] = useState<number>(0);
  const [bgGenerationDone, setBgGenerationDone] = useState<number>(0);

  const handleAddExam = async (examName: string) => {
    console.log(`Starting addition of exam: ${examName}`);
    setGeneratingQuestions(true);
    try {
      if (!(await dbService.hasValidCredentials())) {
        throw new Error("AWS_CREDENTIALS_MISSING: El usuario debe estar autenticado para generar preguntas.");
      }

      const discovery = await librarian.discoverExam(examName);
      const newExam = discovery.exam;
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

  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(75);
  const FIRST_BLOCK = 5; // preguntas para mostrar el examen inmediatamente

  const handleStartExamData = async (exam: Exam, difficulty: Difficulty, mode: 'simulator' | 'real', count?: number) => {
    setGeneratingQuestions(true);
    setGenerationProgress(null);
    setExamMode(mode);
    const questionsToGenerate = count || selectedQuestionCount;

    try {
      // ── Bloque inicial: 5 preguntas para arrancar rápido ──────────────────
      const firstBlock: Question[] = [];
      const initialCount = Math.min(FIRST_BLOCK, questionsToGenerate);

      for (let i = 0; i < initialCount; i++) {
        const domain = exam.domains[i % exam.domains.length];
        const q = await solver.generateQuestion(exam, difficulty, language, domain);
        firstBlock.push(q);
        setGenerationProgress({
          current: i + 1,
          total: questionsToGenerate,
          currentDomain: domain.name,
          successCount: firstBlock.length,
          failureCount: 0,
          estimatedTimeRemaining: Math.ceil((questionsToGenerate - i - 1) * 4)
        });
      }

      // Mostrar el examen con las primeras 5 preguntas
      setCurrentQuestions(firstBlock);
      setGeneratingQuestions(false);
      setGenerationProgress(null);

      // ── Generación en background del resto ────────────────────────────────
      const remaining = questionsToGenerate - initialCount;
      if (remaining > 0) {
        setBgGenerationTotal(questionsToGenerate);
        setBgGenerationDone(initialCount);

        // No await — corre en background
        (async () => {
          let generated = initialCount;
          for (let i = initialCount; i < questionsToGenerate; i++) {
            const domain = exam.domains[i % exam.domains.length];
            let success = false;
            for (let attempt = 0; attempt < 3 && !success; attempt++) {
              try {
                const q = await solver.generateQuestion(exam, difficulty, language, domain);
                setCurrentQuestions(prev => [...prev, q]);
                generated++;
                setBgGenerationDone(generated);
                success = true;
              } catch (err) {
                console.warn(`Background question ${i + 1} attempt ${attempt + 1} failed`, err);
                if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
              }
            }
            if (!success) {
              console.warn(`Background question ${i + 1} failed after 3 retries, skipping`);
            }
          }
          // Generación completa
          setBgGenerationTotal(0);
          setBgGenerationDone(0);
        })();
      }

    } catch (error: any) {
      console.error("Failed to generate questions", error);
      const errorMessage = error.message?.includes('ThrottlingException')
        ? "La cuota de Bedrock se ha excedido. Intenta de nuevo en unos minutos."
        : `Error al generar las preguntas: ${error.message || 'Error desconocido'}.`;
      alert(errorMessage);
      setExamMode(null);
      setGeneratingQuestions(false);
      setGenerationProgress(null);
    }
  };

  const handleStartExam = (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (exam) {
      setActiveExam(exam);
      setExamMode(null);
      setCurrentQuestions([]);
      // Default to 50% of official questions or 10 if missing
      setSelectedQuestionCount(Math.ceil((exam.total_questions_official || 20) * 0.5));
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
      exam_length_percentage: examLengthPercentage,
      total_questions_requested: finishedQuestions.length,
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      questions: finishedQuestions,
      status: 'completed',
      score,
      ...(user?.org_id ? { org_id: user.org_id } : {})
    };

    // Global persistence in DynamoDB
    if (user) {
      try {
        // Delete any auto-saved paused record for this exam (from onAutoSave)
        const examId = activeExam?.id || 'unknown';
        try {
          await dbService.deleteAttempt(`att-paused-${examId}`);
        } catch (_) { /* may not exist, that's fine */ }

        await dbService.saveAttempt({ ...newAttempt, user_id: user.id });
        // Remove paused attempts from state and add the completed one
        setAttempts(prev => [newAttempt, ...prev.filter(a => !(a.status === 'paused' && a.exam_id === examId))]);

        // Increment trial simulation counter if user is in trial
        const effectiveStatus = subscription ? subscriptionService.computeEffectiveStatus(subscription) : 'none';
        if (effectiveStatus === 'trial') {
          await subscriptionService.incrementTrialSimulation(user.id);
          await refreshSubscription();
        }
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


  // Bug 1: Track resume position
  const [resumeAtIndex, setResumeAtIndex] = useState(0);

  const [dashboardView, setDashboardViewRaw] = useState<string>('overview');

  // Bug 4: Confirm before leaving subscription flow
  const [pendingNavView, setPendingNavView] = useState<string | null>(null);
  const setDashboardView = (view: string) => {
    if (showSubscriptionFlow) {
      setPendingNavView(view);
    } else {
      setDashboardViewRaw(view);
    }
  };

  if (loading) {
    return (
      <div className="app-container flex-center">
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
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
          {generationProgress ? (
            <div className="loading-state card fade-in text-center">
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {generationProgress.current}/{generationProgress.total}
                </div>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{t('questionsGenerated')}</p>
              </div>
              <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: '8px', height: '8px', marginBottom: '1rem', overflow: 'hidden' }}>
                <div style={{
                  background: 'var(--primary)',
                  height: '100%',
                  width: `${(generationProgress.current / generationProgress.total) * 100}%`,
                  transition: 'width 0.3s ease',
                  borderRadius: '8px'
                }} />
              </div>
              <p className="text-secondary">{t('domain')}: {generationProgress.currentDomain}</p>
              {generationProgress.estimatedTimeRemaining > 0 && (
                <p className="text-secondary small">~{generationProgress.estimatedTimeRemaining}s restantes</p>
              )}
            </div>
          ) : (
            <div className="loading-state card fade-in text-center">
              <Loader2 className="animate-spin mb-1" size={48} color="var(--primary)" />
              <h2>{t('generatingSimulator')}</h2>
              <p className="text-secondary">{t('aiCreating', { n: selectedQuestionCount })}</p>
            </div>
          )}
        </div>
      );
    }

    if (!examMode) {
      const qOptions = [
        { pct: 50 as const, count: Math.ceil((activeExam.total_questions_official || 60) * 0.5), dur: Math.round(activeExam.duration_minutes * 0.5) },
        { pct: 75 as const, count: Math.ceil((activeExam.total_questions_official || 60) * 0.75), dur: Math.round(activeExam.duration_minutes * 0.75) },
        { pct: 100 as const, count: activeExam.total_questions_official || 60, dur: activeExam.duration_minutes },
      ];

      return (
        <div className="app-container flex-center">
          <div style={{ maxWidth: 520, width: '100%', padding: '2rem' }} className="fade-in">
            <button onClick={() => setActiveExam(null)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1.25rem', fontWeight: 600, fontSize: '0.875rem', padding: '0.5rem 1rem', borderRadius: 10, transition: 'all 0.2s' }}>
              <ChevronLeft size={16} /> {t('back')}
            </button>

            <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <BookOpen size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('configureSimulator')}</span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0.5rem 0 1.5rem' }}>{activeExam.name}</h2>

              {/* Dificultad */}
              <label style={{ display: 'block', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>{t('difficultyLevel')}</span>
                <select
                  value={activeDifficulty}
                  onChange={(e) => setActiveDifficulty(e.target.value as Difficulty)}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.9375rem', color: '#1e293b', background: '#f8fafc', cursor: 'pointer' }}
                >
                  <option value="beginner">{t('beginner')}</option>
                  <option value="intermediate">{t('intermediate')}</option>
                  <option value="advanced">{t('advanced')}</option>
                </select>
              </label>

              {/* Número de preguntas */}
              <label style={{ display: 'block', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>{t('questionCount')}</span>
                <select
                  value={examLengthPercentage}
                  onChange={(e) => {
                    const pct = Number(e.target.value) as 50 | 75 | 100;
                    const opt = qOptions.find(o => o.pct === pct)!;
                    setExamLengthPercentage(pct);
                    setSelectedQuestionCount(opt.count);
                  }}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.9375rem', color: '#1e293b', background: '#f8fafc', cursor: 'pointer' }}
                >
                  {qOptions.map(o => (
                    <option key={o.pct} value={o.pct}>{o.pct}% — {o.count} preguntas · ~{o.dur} min</option>
                  ))}
                </select>
              </label>

              {/* Botones de modo */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => handleStartExamData(activeExam, activeDifficulty, 'simulator')}
                  style={{ flex: 1, padding: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.9375rem', transition: 'all 0.2s' }}
                >
                  <Zap size={18} /> Simulador
                </button>
                <button
                  onClick={() => handleStartExamData(activeExam, activeDifficulty, 'real')}
                  style={{ flex: 1, padding: '0.75rem', background: '#1e293b', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.9375rem', transition: 'all 0.2s' }}
                >
                  <Award size={18} /> Examen Real
                </button>
              </div>

              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem', textAlign: 'center' }}>
                <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {activeExam.domains.length} {t('officialDomains')} · {t('simulatorWithAI')} · {t('examNoHelp')}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return examMode === 'simulator'
      ? <div className="simulator-fullscreen"><SimulatorView exam={activeExam} initialQuestions={currentQuestions} initialIndex={resumeAtIndex} onExit={() => { setActiveExam(null); setExamMode(null); setResumeAtIndex(0); }} onFinish={handleFinishExam} onAutoSave={async (qs, idx) => {
          if (!user) return;
          const pausedAttempt: ExamAttempt = {
            id: `att-paused-${activeExam.id}`,
            exam_id: activeExam.id,
            mode: 'simulator',
            difficulty: activeDifficulty,
            exam_length_percentage: examLengthPercentage,
            total_questions_requested: selectedQuestionCount,
            start_time: new Date().toISOString(),
            end_time: '',
            questions: qs,
            status: 'paused',
            score: 0,
            paused_at_index: idx
          };
          try { await dbService.saveAttempt({ ...pausedAttempt, user_id: user.id }); } catch (e) { console.error('AutoSave failed', e); }
        }} onPause={async (qs, idx) => {
          // Delete any existing paused attempts for this exam first
          const existingPaused = attempts.filter(a => a.status === 'paused' && a.exam_id === activeExam.id);
          for (const old of existingPaused) {
            try { await dbService.deleteAttempt(old.id); } catch (e) { console.error('Failed to delete old paused', e); }
          }
          const pausedAttempt: ExamAttempt = {
            id: `att-paused-${activeExam.id}`,
            exam_id: activeExam.id,
            mode: 'simulator',
            difficulty: activeDifficulty,
            exam_length_percentage: examLengthPercentage,
            total_questions_requested: selectedQuestionCount,
            start_time: new Date().toISOString(),
            end_time: '',
            questions: qs,
            status: 'paused',
            score: 0,
            paused_at_index: idx
          };
          setBgGenerationTotal(0);
          setBgGenerationDone(0);
          // Remove any existing paused attempt for this exam, then add new one
          setAttempts(prev => [pausedAttempt, ...prev.filter(a => !(a.status === 'paused' && a.exam_id === activeExam.id))]);
          if (user) {
            try { await dbService.saveAttempt({ ...pausedAttempt, user_id: user.id }); } catch (e) { console.error('Failed to save paused attempt', e); }
          }
          setActiveExam(null);
          setExamMode(null);
        }} /></div>
      : <div className="simulator-fullscreen"><RealExamView exam={activeExam} initialQuestions={currentQuestions} initialIndex={resumeAtIndex} onExit={() => { setActiveExam(null); setExamMode(null); setResumeAtIndex(0); }} onFinish={handleFinishExam} onAutoSave={async (qs, idx) => {
          if (!user) return;
          const pausedAttempt: ExamAttempt = {
            id: `att-paused-${activeExam.id}`,
            exam_id: activeExam.id,
            mode: 'real',
            difficulty: activeDifficulty,
            exam_length_percentage: examLengthPercentage,
            total_questions_requested: selectedQuestionCount,
            start_time: new Date().toISOString(),
            end_time: '',
            questions: qs,
            status: 'paused',
            score: 0,
            paused_at_index: idx
          };
          try { await dbService.saveAttempt({ ...pausedAttempt, user_id: user.id }); } catch (e) { console.error('AutoSave failed', e); }
        }} onPause={async (qs, idx) => {
          const existingPaused2 = attempts.filter(a => a.status === 'paused' && a.exam_id === activeExam.id);
          for (const old of existingPaused2) {
            try { await dbService.deleteAttempt(old.id); } catch (e) { console.error('Failed to delete old paused', e); }
          }
          const pausedAttempt: ExamAttempt = {
            id: `att-paused-${activeExam.id}`,
            exam_id: activeExam.id,
            mode: 'real',
            difficulty: activeDifficulty,
            exam_length_percentage: examLengthPercentage,
            total_questions_requested: selectedQuestionCount,
            start_time: new Date().toISOString(),
            end_time: '',
            questions: qs,
            status: 'paused',
            score: 0,
            paused_at_index: idx
          };
          setBgGenerationTotal(0);
          setBgGenerationDone(0);
          setAttempts(prev => [pausedAttempt, ...prev.filter(a => !(a.status === 'paused' && a.exam_id === activeExam.id))]);
          if (user) {
            try { await dbService.saveAttempt({ ...pausedAttempt, user_id: user.id }); } catch (e) { console.error('Failed to save paused attempt', e); }
          }
          setActiveExam(null);
          setExamMode(null);
        }} /></div>;
  }

  return (
    <div className="app-container">
      <Sidebar
        user={profile}
        role={user.role}
        activeView={dashboardView}
        onViewChange={setDashboardView}
        onLogout={logout}
      />

      <main className="main-content">
        {user.role === 'admin' ? (
          dashboardView === 'admin-students' || dashboardView === 'users' ? (
            <AdminStudentList />
          ) : dashboardView === 'organizations' ? (
            <OrgManagement />
          ) : (
            <>
              <AdminDashboard
                users={[profile]}
                exams={exams}
                attempts={attempts}
                onAddExam={handleAddExam}
                onDeleteExam={handleDeleteExam}
                initialView={dashboardView as any}
              />
              {dashboardView === 'exam-management' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <AdminExamManagement adminUserId={user.id} />
                </div>
              )}
            </>
          )
        ) : user.role === 'org_admin' ? (
          dashboardView === 'org-students' && userOrganization ? (
            <StudentList
              orgId={userOrganization.id}
              members={userOrganization.members || []}
              onMemberAdded={async () => {
                if (user.org_id) {
                  try {
                    const org = await getOrganizationById(user.org_id);
                    setUserOrganization(org);
                  } catch (e) {
                    console.error('Failed to reload organization', e);
                  }
                }
              }}
            />
          ) : userOrganization ? (
            <OrgAdminDashboard
              exams={filteredExams}
              organization={userOrganization}
              onStartExam={(examId) => {
                const hasPaused = attempts.some(a => a.status === 'paused');
                if (hasPaused) {
                  alert(t('hasPausedAlert'));
                  return;
                }
                handleStartExam(examId);
              }}
            />
          ) : (
            <div className="flex-center" style={{ padding: '2rem' }}>
              <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
          )
        ) : (
          // ── User role: subscription-based rendering ──────────────────────
          (() => {
            const isIndividualStudent = user.role === 'user' && !user.org_id;
            const subStatus = user.subscription_status || 'none';

            // Individual student without org_id: subscription-gated flow
            if (isIndividualStudent) {
              const hasAdminFreeAccess = subscription?.admin_free_access === true;

              // Admin-granted free access: show message instead of subscription manager
              if (dashboardView === 'subscription' && hasAdminFreeAccess) {
                return (
                  <div style={{ maxWidth: 600, margin: '2rem auto', padding: '2rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, background: 'rgba(16,185,129,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                    </div>
                    <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>{t('admin_free_access_badge')}</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                      Tu acceso fue otorgado por el administrador. No necesitas suscripción ni período de prueba.
                    </p>
                  </div>
                );
              }

              // ── EXPIRED/NO SUBSCRIPTION: Force payment screen ──────────────
              // This check MUST come before specific view checks to prevent
              // expired users from accessing simulators or other gated views.
              if ((subStatus === 'none' || subStatus === 'expired') && !hasAdminFreeAccess) {
                const isExpired = subStatus === 'expired';
                const wasTrial = subscription?.trial_used && !subscription?.paypal_subscription_id;
                // Use previously selected exams if available, otherwise fall back to state
                const previousExams = subscription?.selected_exam_ids?.length
                  ? subscription.selected_exam_ids
                  : selectedExamIds;
                const hasExamsAlready = previousExams.length > 0;

                return (
                  <div style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Expiration banner */}
                    {isExpired && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '1rem 1.25rem',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 'var(--radius, 12px)',
                        color: '#92400e',
                      }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                          {wasTrial ? t('sub_trial_expired_banner') : t('sub_expired_banner')}
                        </span>
                      </div>
                    )}

                    {/* Payment plans + coupon (shown directly if user already has exams) */}
                    {hasExamsAlready ? (
                      <SubscriptionPlans
                        selectedExamIds={previousExams}
                        onSubscriptionActivated={async () => {
                          await refreshSubscription();
                          setSelectedExamIds([]);
                        }}
                        onTrialActivated={async () => {
                          await refreshSubscription();
                          setSelectedExamIds([]);
                        }}
                        trialAvailable={subscriptionService.isTrialAvailable(subscription ?? null)}
                        userId={user.id}
                      />
                    ) : (
                      <>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {t('sub_select_exams_renew')}
                        </p>
                        <ExamSelector
                          exams={exams}
                          selectedIds={selectedExamIds}
                          onSelectionChange={setSelectedExamIds}
                          maxSelection={3}
                          minSelection={1}
                        />
                        {selectedExamIds.length > 0 && (
                          <SubscriptionPlans
                            selectedExamIds={selectedExamIds}
                            onSubscriptionActivated={async () => {
                              await refreshSubscription();
                              setSelectedExamIds([]);
                            }}
                            onTrialActivated={async () => {
                              await refreshSubscription();
                              setSelectedExamIds([]);
                            }}
                            trialAvailable={subscriptionService.isTrialAvailable(subscription ?? null)}
                            userId={user.id}
                          />
                        )}
                      </>
                    )}
                  </div>
                );
              }

              // Simulators management view
              if (dashboardView === 'simulators' && subscription) {
                return (
                  <MySimulators
                    subscription={subscription}
                    exams={exams}
                    isAdminFreeAccess={hasAdminFreeAccess}
                    onSave={async (newIds) => {
                      const changeType = classifyExamChange(subscription.selected_exam_ids, newIds);
                      if (changeType === 'add_to_slots') {
                        await subscriptionService.addExamsToSlots(user.id, newIds.filter(id => !subscription.selected_exam_ids.includes(id)));
                      } else {
                        await subscriptionService.updateSelectedExams(user.id, newIds);
                      }
                      await refreshSubscription();
                    }}
                  />
                );
              }

              // SubscriptionManager view (only for non-admin-free-access users)
              if (dashboardView === 'subscription' && subscription && !hasAdminFreeAccess) {
                return (
                  <SubscriptionManager
                    subscription={subscription}
                    exams={exams}
                    userId={user.id}
                    onCancel={async () => {
                      await subscriptionService.cancelSubscription(user.id);
                      await refreshSubscription();
                    }}
                    onChangeExams={async (ids) => {
                      await subscriptionService.updateSelectedExams(user.id, ids);
                      await refreshSubscription();
                    }}
                    onRenew={async () => {
                      // Navigate to subscription plans flow
                      setSelectedExamIds(subscription.selected_exam_ids || []);
                      setDashboardView('overview');
                      await refreshSubscription();
                    }}
                    onSubscriptionUpdated={async () => {
                      await refreshSubscription();
                    }}
                  />
                );
              }

              // Compute filtered exams for subscribed users
              const subscribedExams = subscription?.selected_exam_ids
                ? exams.filter(e => subscription.selected_exam_ids.includes(e.id))
                : exams;

              // Grace period: read-only dashboard with banner
              if (subStatus === 'grace_period') {
                return (
                  <UserDashboard
                    user={profile}
                    attempts={attempts}
                    exams={subscribedExams}
                    studyGuide={studyGuide}
                    isGeneratingGuide={isGeneratingGuide}
                    readOnly={true}
                    trialBanner={
                      subscription?.grace_period_end ? (
                        <TrialBanner
                          type="grace_period"
                          endDate={subscription.grace_period_end}
                          onSubscribe={() => { setShowSubscriptionFlow(true); }}
                          onRenew={async () => {
                            setSelectedExamIds(subscription.selected_exam_ids || []);
                            await refreshSubscription();
                          }}
                        />
                      ) : undefined
                    }
                    onStartExam={() => {}}
                    onResumeExam={() => {}}
                    onViewDetail={(attemptId) => {
                      const attempt = attempts.find(a => a.id === attemptId);
                      if (attempt && attempt.questions?.length > 0) {
                        setResults(attempt.questions);
                      }
                    }}
                    onGenerateGuide={handleGenerateStudyGuide}
                    onToggleTask={(taskId) => {
                      if (!studyGuide) return;
                      const updatedTasks = studyGuide.tasks.map(t =>
                        t.id === taskId ? { ...t, completed: !t.completed } : t
                      );
                      setStudyGuide({ ...studyGuide, tasks: updatedTasks });
                    }}
                    initialTab={dashboardView as any}
                  />
                );
              }

              // Trial, active, or cancelled (still within period): normal dashboard with filtered exams
              const showTrialBanner = subStatus === 'trial' && !hasAdminFreeAccess;

              // If user clicked "Subscribe" from trial banner, show subscription plans
              if (showSubscriptionFlow) {
                return (
                  <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <SubscriptionPlans
                      selectedExamIds={selectedExamIds.length > 0 ? selectedExamIds : (subscription?.selected_exam_ids || [])}
                      onSubscriptionActivated={async () => {
                        await refreshSubscription();
                        setSelectedExamIds([]);
                        setShowSubscriptionFlow(false);
                      }}
                      onTrialActivated={async () => {
                        await refreshSubscription();
                        setSelectedExamIds([]);
                        setShowSubscriptionFlow(false);
                      }}
                      trialAvailable={false}
                      userId={user.id}
                    />
                    <button
                      onClick={() => setShowSubscriptionFlow(false)}
                      style={{ alignSelf: 'center', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 1.25rem', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600 }}
                    >
                      {t('back')}
                    </button>
                  </div>
                );
              }

              return (
                <UserDashboard
                  user={profile}
                  attempts={attempts}
                  exams={subscribedExams}
                  studyGuide={studyGuide}
                  isGeneratingGuide={isGeneratingGuide}
                  trialBanner={
                    showTrialBanner ? (
                      <TrialBanner
                        type="trial"
                        trialSimulationsRemaining={MAX_TRIAL_SIMULATIONS - (subscription?.trial_simulations_used ?? 0)}
                        onSubscribe={() => {
                          setSelectedExamIds(subscription!.selected_exam_ids || []);
                          setShowSubscriptionFlow(true);
                        }}
                        onRenew={() => {}}
                      />
                    ) : undefined
                  }
                  onStartExam={(examId) => {
                    const hasPaused = attempts.some(a => a.status === 'paused');
                    if (hasPaused) {
                      alert(t('hasPausedAlert'));
                      return;
                    }
                    handleStartExam(examId);
                  }}
                  onResumeExam={async (attempt) => {
                    const exam = exams.find(e => e.id === attempt.exam_id);
                    if (!exam) return;
                    setActiveExam(exam);
                    setExamMode(attempt.mode);
                    setResumeAtIndex(attempt.paused_at_index || 0);
                    setActiveDifficulty(attempt.difficulty);
                    setSelectedQuestionCount(attempt.total_questions_requested);
                    const existingQuestions = attempt.questions || [];
                    setCurrentQuestions(existingQuestions);
                    setAttempts(prev => prev.filter(a => a.id !== attempt.id));
                    if (user) {
                      try { await dbService.deleteAttempt(attempt.id); } catch (e) { console.error('Failed to delete paused attempt', e); }
                    }
                    const totalNeeded = attempt.total_questions_requested || existingQuestions.length;
                    const remaining = totalNeeded - existingQuestions.length;
                    if (remaining > 0) {
                      setBgGenerationTotal(totalNeeded);
                      setBgGenerationDone(existingQuestions.length);
                      (async () => {
                        for (let i = existingQuestions.length; i < totalNeeded; i++) {
                          try {
                            const domain = exam.domains[i % exam.domains.length];
                            const q = await solver.generateQuestion(exam, attempt.difficulty, language, domain);
                            setCurrentQuestions(prev => [...prev, q]);
                            setBgGenerationDone(i + 1);
                          } catch (err) {
                            console.warn(`Resume bg question ${i + 1} failed`, err);
                          }
                        }
                        setBgGenerationTotal(0);
                        setBgGenerationDone(0);
                      })();
                    }
                  }}
                  onViewDetail={(attemptId) => {
                    const attempt = attempts.find(a => a.id === attemptId);
                    if (attempt && attempt.questions?.length > 0) {
                      setResults(attempt.questions);
                    }
                  }}
                  onGenerateGuide={handleGenerateStudyGuide}
                  onToggleTask={(taskId) => {
                    if (!studyGuide) return;
                    const updatedTasks = studyGuide.tasks.map(t =>
                      t.id === taskId ? { ...t, completed: !t.completed } : t
                    );
                    setStudyGuide({ ...studyGuide, tasks: updatedTasks });
                  }}
                  initialTab={dashboardView as any}
                />
              );
            }

            // User with org_id: check if org access expired
            if (user.org_access_status === 'expired' && userOrganization) {
              return (
                <OrgAccessExpiredView
                  organization={userOrganization}
                  onSubscribeIndividually={() => {
                    // TODO: Implement remove from org + redirect to PayPal flow
                    // For now, navigate to subscription flow
                    setDashboardViewRaw('overview');
                  }}
                />
              );
            }

            // User with org_id: existing flow unchanged
            return (
              <UserDashboard
                user={profile}
                attempts={attempts}
                exams={filteredExams}
                studyGuide={studyGuide}
                isGeneratingGuide={isGeneratingGuide}
                onStartExam={(examId) => {
                  const hasPaused = attempts.some(a => a.status === 'paused');
                  if (hasPaused) {
                    alert(t('hasPausedAlert'));
                    return;
                  }
                  handleStartExam(examId);
                }}
                onResumeExam={async (attempt) => {
                  const exam = exams.find(e => e.id === attempt.exam_id);
                  if (!exam) return;
                  setActiveExam(exam);
                  setExamMode(attempt.mode);
                  setResumeAtIndex(attempt.paused_at_index || 0);
                  setActiveDifficulty(attempt.difficulty);
                  setSelectedQuestionCount(attempt.total_questions_requested);
                  const existingQuestions = attempt.questions || [];
                  setCurrentQuestions(existingQuestions);
                  setAttempts(prev => prev.filter(a => a.id !== attempt.id));
                  if (user) {
                    try { await dbService.deleteAttempt(attempt.id); } catch (e) { console.error('Failed to delete paused attempt', e); }
                  }
                  const totalNeeded = attempt.total_questions_requested || existingQuestions.length;
                  const remaining = totalNeeded - existingQuestions.length;
                  if (remaining > 0) {
                    setBgGenerationTotal(totalNeeded);
                    setBgGenerationDone(existingQuestions.length);
                    (async () => {
                      for (let i = existingQuestions.length; i < totalNeeded; i++) {
                        try {
                          const domain = exam.domains[i % exam.domains.length];
                          const q = await solver.generateQuestion(exam, attempt.difficulty, language, domain);
                          setCurrentQuestions(prev => [...prev, q]);
                          setBgGenerationDone(i + 1);
                        } catch (err) {
                          console.warn(`Resume bg question ${i + 1} failed`, err);
                        }
                      }
                      setBgGenerationTotal(0);
                      setBgGenerationDone(0);
                    })();
                  }
                }}
                onViewDetail={(attemptId) => {
                  const attempt = attempts.find(a => a.id === attemptId);
                  if (attempt && attempt.questions?.length > 0) {
                    setResults(attempt.questions);
                  }
                }}
                onGenerateGuide={handleGenerateStudyGuide}
                onToggleTask={(taskId) => {
                  if (!studyGuide) return;
                  const updatedTasks = studyGuide.tasks.map(t =>
                    t.id === taskId ? { ...t, completed: !t.completed } : t
                  );
                  setStudyGuide({ ...studyGuide, tasks: updatedTasks });
                }}
                initialTab={dashboardView as any}
              />
            );
          })()
        )}
      </main>

      {showCommitment && (
        <StudyCommitment
          onSave={handleSaveCommitment}
          onCancel={() => { setActiveExam(null); setShowCommitment(false); }}
        />
      )}

      {/* Bug 4: Confirmation dialog when leaving subscription flow */}
      {pendingNavView !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '2rem', maxWidth: 400, width: '90%', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>⚠️ {t('back')}</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Estás en el proceso de suscripción. ¿Deseas salir? Perderás el progreso actual.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setPendingNavView(null)} style={{ padding: '0.625rem 1.25rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => { setShowSubscriptionFlow(false); setDashboardViewRaw(pendingNavView); setPendingNavView(null); }} style={{ padding: '0.625rem 1.25rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Salir</button>
            </div>
          </div>
        </div>
      )}

      {/* Spinner flotante de generación en background */}
      {bgGenerationTotal > 0 && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 9999,
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          minWidth: '220px',
          fontSize: '0.875rem'
        }}>
          <Loader2 size={18} color="#6366f1" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#1e1e2d', marginBottom: '4px' }}>
              Generando preguntas...
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
              <div style={{
                background: '#6366f1',
                height: '100%',
                width: `${(bgGenerationDone / bgGenerationTotal) * 100}%`,
                transition: 'width 0.3s ease',
                borderRadius: '4px'
              }} />
            </div>
            <div style={{ color: '#64748b', marginTop: '3px', fontSize: '0.75rem' }}>
              {bgGenerationDone}/{bgGenerationTotal} preguntas listas
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
