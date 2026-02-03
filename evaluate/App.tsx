
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Question, AnswerDetail, ExamResult, InterviewEvaluation, AssessmentSettings } from './types';
import { apiService } from './services/api';
import { TOTAL_QUESTIONS, OVERALL_TIME_LIMIT_SEC, QUESTION_TIME_LIMIT_SEC } from './constants';
import { ExamView } from './components/ExamView';
import { AdminDashboard } from './components/AdminDashboard';
import { InterviewEvaluationView } from './components/InterviewEvaluationView';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'landing',
    candidate: null,
    currentAttempt: null,
    lastResult: null
  });

  const [isAdminAuthVisible, setIsAdminAuthVisible] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [assessmentSettings, setAssessmentSettings] = useState<AssessmentSettings>({
    overallTimeLimitMins: OVERALL_TIME_LIMIT_SEC / 60,
    questionTimeLimitSecs: QUESTION_TIME_LIMIT_SEC,
    totalQuestions: TOTAL_QUESTIONS,
    questionsPerSection: {}
  });

  const [evalCandidate, setEvalCandidate] = useState<{ name: string, email: string } | null>(null);

  useEffect(() => {
    const initApp = async () => {
      const session = await apiService.getSession();
      if (session) {
        setState(prev => ({ ...prev, view: 'admin' }));
      }

      const settings = await apiService.getSettings();
      if (settings) {
        setAssessmentSettings(settings);
      }
    };
    initApp();
  }, []);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleStartExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    if (!name || !email) {
      setError("Identification required: Name and Email.");
      return;
    }

    try {
      const emailExists = await apiService.checkEmailExists(email);
      if (emailExists) {
        setError("Results are awaited, please contact the interview SPOC");
        return;
      }

      const allQuestionsResult = await apiService.getQuestions(true, 1, 1000);
      if (!allQuestionsResult || allQuestionsResult.data.length === 0) {
        throw new Error("Critical failure: Assessment bank is empty or unavailable.");
      }

      const allQuestionsPool = allQuestionsResult.data;
      let finalExamQuestions: Question[] = [];
      const config = assessmentSettings.questionsPerSection;

      // We process categories in a fixed order (or based on config keys)
      // and build the list strictly section-by-section.
      const categories = Object.keys(config).sort();

      categories.forEach(category => {
        const countNeeded = config[category];
        if (countNeeded > 0) {
          const categorySpecificPool = allQuestionsPool.filter(q => q.category === category);
          // Shuffle the internal section pool so the specific questions vary per candidate
          const shuffledSection = shuffleArray(categorySpecificPool);
          // Only take what is configured
          finalExamQuestions.push(...shuffledSection.slice(0, countNeeded));
        }
      });

      // If the sum of configured sections is less than totalQuestions, 
      // we might want to fill from "General" or other active categories to meet the targetTotal.
      const targetTotal = assessmentSettings.totalQuestions;
      if (finalExamQuestions.length < targetTotal) {
        const currentIds = new Set(finalExamQuestions.map(q => q.id));
        const availableRemaining = allQuestionsPool.filter(q => !currentIds.has(q.id));
        const fillCount = targetTotal - finalExamQuestions.length;
        const shuffledFill = shuffleArray(availableRemaining);

        // To maintain proper grouping even for the "extra" fill, group them by category
        const fillBatch = shuffledFill.slice(0, fillCount);
        fillBatch.sort((a, b) => a.category.localeCompare(b.category));
        finalExamQuestions.push(...fillBatch);
      }

      // Note: We DO NOT shuffle the finalExamQuestions array here, 
      // because we want them to remain in their category sequences.

      setState({
        view: 'exam',
        candidate: { name, email },
        currentAttempt: {
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          questions: finalExamQuestions,
          currentIndex: 0,
          answers: [],
          startTime: Date.now(),
          overallTimer: assessmentSettings.overallTimeLimitMins * 60,
          questionTimer: assessmentSettings.questionTimeLimitSecs
        }
      });
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to initialize assessment. Contact IT support.");
    }
  };

  const handleExamFinish = async (answers: AnswerDetail[], totalTimeSec: number) => {
    if (!state.candidate) return;
    const currentTotal = answers.length; // Use actual length of generated test
    const attemptedCount = answers.filter(a => a.status === 'ANSWERED').length;
    const correctCount = answers.filter(a => a.isCorrect).length;

    const result: ExamResult = {
      attemptId: state.currentAttempt?.id || 'unknown',
      candidateName: state.candidate.name,
      candidateEmail: state.candidate.email,
      startedAt: new Date(state.currentAttempt?.startTime || Date.now()).toISOString(),
      submittedAt: new Date().toISOString(),
      totalTimeTakenSec: totalTimeSec,
      totalQuestions: currentTotal,
      attemptedCount,
      missedCount: currentTotal - attemptedCount,
      correctCount,
      wrongCount: attemptedCount - correctCount,
      avgTimePerAnsweredSec: attemptedCount > 0 ? answers.reduce((acc, c) => acc + c.timeSpentSec, 0) / attemptedCount : 0,
      scorePercent: (correctCount / currentTotal) * 100,
      answersJson: JSON.stringify(answers)
    };

    setState(prev => ({ ...prev, view: 'completion', currentAttempt: null, lastResult: result }));
    await apiService.submitResult(result);
  };

  const handleExamCancel = () => {
    setState({ view: 'landing', candidate: null, currentAttempt: null, lastResult: null });
  };

  const handleEvaluationSubmit = async (evaluation: InterviewEvaluation) => {
    await apiService.submitInterviewEvaluation(evaluation);
    setEvalCandidate(null);
    setState(prev => ({ ...prev, view: 'admin' }));
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAdminError(null);
    try {
      await apiService.signIn(adminEmail, adminPassword);
      setState(prev => ({ ...prev, view: 'admin' }));
      setIsAdminAuthVisible(false);
      setAdminEmail('');
      setAdminPassword('');
    } catch (err: any) {
      setAdminError(err.message || "Invalid credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await apiService.signOut();
    setState({ view: 'landing', candidate: null, currentAttempt: null, lastResult: null });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {state.view === 'landing' && (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md bg-white rounded-[48px] shadow-2xl border border-slate-100 p-12">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-black text-[#002b49] uppercase tracking-tighter leading-none mb-3">Assessment<br />Gateway</h1>
              <div className="w-16 h-1 bg-[#d4af37] mx-auto"></div>
            </div>

            <form onSubmit={handleStartExam} className="space-y-8">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-3 block">Name</label>
                <input
                  name="name"
                  required
                  placeholder="Full Legal Name"
                  className="w-full p-6 border-2 border-slate-200 bg-white text-slate-900 font-bold rounded-3xl focus:ring-8 focus:ring-indigo-50/50 outline-none transition-all placeholder-slate-300 shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-3 block">Official Email</label>
                <input
                  name="email"
                  required
                  type="email"
                  placeholder="corporate@domain.com"
                  className="w-full p-6 border-2 border-slate-200 bg-white text-slate-900 font-bold rounded-3xl focus:ring-8 focus:ring-indigo-50/50 outline-none transition-all placeholder-slate-300 shadow-sm"
                />
              </div>

              {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-50 p-5 rounded-2xl border border-red-100 leading-relaxed text-center">{error}</p>}

              <button type="submit" className="w-full bg-[#002b49] text-white font-black uppercase tracking-[0.3em] text-[11px] py-6 rounded-3xl shadow-2xl shadow-indigo-100 hover:scale-[1.03] active:scale-95 transition-all">Launch</button>
            </form>

            <div className="mt-14 flex flex-col items-center">
              <div className="w-full h-2 bg-[#f8e100] mb-2 rounded-full transform -rotate-1 opacity-90"></div>
              <button onClick={() => setIsAdminAuthVisible(true)} className="w-full text-slate-500 text-[9px] font-black uppercase tracking-[0.5em] hover:text-[#002b49] transition-colors">Operational Management</button>
            </div>
          </div>
        </div>
      )}

      {isAdminAuthVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
          <div className="w-full max-w-sm bg-white rounded-[56px] p-12 shadow-2xl">
            <h2 className="text-3xl font-black mb-8 uppercase tracking-widest text-slate-900 leading-none text-center">Admin<br />Login</h2>
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Email</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  className="w-full p-4 border-2 border-slate-100 bg-white rounded-2xl outline-none focus:border-[#002b49] font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Password</label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  className="w-full p-4 border-2 border-slate-100 bg-white rounded-2xl outline-none focus:border-[#002b49] font-bold"
                />
              </div>
              {adminError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">{adminError}</p>}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-[#002b49] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-lg disabled:opacity-50"
              >
                {isLoggingIn ? 'Authenticating...' : 'Authorize'}
              </button>
            </form>

            <div className="mt-8 flex flex-col items-center">
              <div className="w-full h-2 bg-red-500 mb-2 rounded-full transform -rotate-1 opacity-90"></div>
              <button
                onClick={() => setIsAdminAuthVisible(false)}
                className="w-full text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] hover:text-red-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {state.view === 'exam' && state.currentAttempt && (
        <ExamView
          questions={state.currentAttempt.questions}
          onFinish={handleExamFinish}
          onCancel={handleExamCancel}
          overallTimeLimitSec={state.currentAttempt.overallTimer}
          questionTimeLimitSec={state.currentAttempt.questionTimer}
        />
      )}

      {state.view === 'completion' && (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-12 bg-slate-50">
          <div className="w-28 h-28 bg-[#002b49] text-[#d4af37] rounded-[40px] flex items-center justify-center text-5xl mb-10 shadow-2xl rotate-3">✓</div>
          <h1 className="text-6xl font-black text-slate-900 mb-4 uppercase tracking-tighter leading-none">Session<br />Finalized</h1>
          <p className="text-slate-400 mb-14 max-w-sm mx-auto font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed">Remote data synchronization successful. Assessment protocol terminated.</p>

          {state.lastResult && (
            <div className="bg-white rounded-[40px] p-10 shadow-xl border border-slate-100 mb-12 w-full max-w-2xl animate-in slide-in-from-bottom-8 fade-in duration-700">
              <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="text-center md:text-left">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">Final Score</p>
                  <p className="text-6xl font-black text-[#002b49] tracking-tighter">{Number(state.lastResult.scorePercent).toFixed(2)}%</p>
                </div>
                <div className="grid grid-cols-3 gap-6 w-full md:w-auto">
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                    <p className="text-2xl font-black text-green-600 mb-1">{state.lastResult.correctCount}</p>
                    <p className="text-[9px] font-black uppercase text-green-800/60 tracking-widest">Correct</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                    <p className="text-2xl font-black text-red-600 mb-1">{state.lastResult.wrongCount}</p>
                    <p className="text-[9px] font-black uppercase text-red-800/60 tracking-widest">Wrong</p>
                  </div>
                  <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
                    <p className="text-2xl font-black text-slate-500 mb-1">{state.lastResult.missedCount}</p>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Missed</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button onClick={() => setState({ view: 'landing', candidate: null, currentAttempt: null, lastResult: null })} className="bg-[#002b49] text-white px-14 py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl active:scale-95 transition-all">Clear Environment</button>
        </div>
      )}

      {state.view === 'admin' && (
        <AdminDashboard
          onEvaluate={(c) => {
            setEvalCandidate({ name: c.candidateName, email: c.candidateEmail });
            setState(prev => ({ ...prev, view: 'interviewer-form' }));
          }}
          onLogout={handleLogout}
        />
      )}

      {state.view === 'interviewer-form' && evalCandidate && (
        <InterviewEvaluationView
          candidateName={evalCandidate.name}
          candidateEmail={evalCandidate.email}
          onClose={() => {
            setEvalCandidate(null);
            setState(prev => ({ ...prev, view: 'admin' }));
          }}
          onSubmit={handleEvaluationSubmit}
        />
      )}
    </div>
  );
};

export default App;
