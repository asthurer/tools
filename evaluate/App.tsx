
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    lastResult: null,
    currentUser: null
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

  const [selectedDashboardOrgId, setSelectedDashboardOrgId] = useState<string | undefined>(undefined);

  const [evalCandidate, setEvalCandidate] = useState<{ name: string, email: string, organizationId?: string, id?: string } | null>(null);

  useEffect(() => {
    const initApp = async () => {
      const session = await apiService.getSession();
      if (session) {
        const userProfile = await apiService.getUserProfile(session.user.email || '');
        setState(prev => ({ ...prev, view: 'admin', currentUser: userProfile }));
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
    const email = formData.get('email') as string;
    const orgDomain = formData.get('orgDomain') as string;
    const name = email ? email.split('@')[0] : 'Candidate'; // Fallback for local state

    if (!email) {
      setError("Identification required: Email.");
      return;
    }

    if (!orgDomain) {
      setError("Organization ID is required.");
      return;
    }

    try {
      // Validate Organization
      const validOrgId = await apiService.validateOrganization(orgDomain);
      if (!validOrgId) {
        setError("Invalid organization domain. Please verify your credentials.");
        return;
      }

      // Verify Candidate Registration
      const candidateId = await apiService.verifyCandidateRegistration(email, validOrgId);
      if (!candidateId) {
        setError("You are not a registered candidate. Contact the HR to register for evaluation.");
        return;
      }

      // Check content status (e.g. Opted Out)
      const currentStatus = await apiService.getCandidateStatus(email, validOrgId);
      if (currentStatus === 'Opted Out') {
        setError("You opted out of exam by clicking cancel button. Contact HR to retake exam.");
        return;
      }

      const hasExistingResult = await apiService.checkResultExists(candidateId);
      if (hasExistingResult) {
        setState(prev => ({ ...prev, candidate: { email, fullName: name, organizationId: validOrgId } }));
        setError("Results are awaited, please contact the interview SPOC");
        return;
      }

      // Fetch questions scoped to this organization
      const allQuestionsResult = await apiService.getQuestions(true, 1, 1000, '', '', validOrgId);
      if (!allQuestionsResult || allQuestionsResult.data.length === 0) {
        throw new Error("Critical failure: Assessment bank is empty or unavailable for this organization.");
      }

      const allQuestionsPool = allQuestionsResult.data;
      let finalExamQuestions: Question[] = [];
      const config = assessmentSettings.questionsPerSection; // Note: Settings should ideally also be org-scoped

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

      setState(prev => ({
        ...prev,
        candidate: { name, email, organizationId: validOrgId, id: candidateId },
        currentAttempt: { questions: finalExamQuestions, answers: [], startTime: Date.now(), overallTimer: assessmentSettings.overallTimeLimitMins * 60, questionTimer: assessmentSettings.questionTimeLimitSecs, id: `attempt_${Date.now()}`, currentIndex: 0 },
        view: 'exam'
      }));
      setError(null);
    } catch (err: any) {
      setError(err.message || "Initialization failed");
    }
  };

  const handleExamComplete = async (answers: AnswerDetail[], totalTimeTakenSec: number) => {
    if (!state.candidate) return;

    try {
      const currentTotal = answers.length;
      const attemptedCount = answers.filter(a => a.status === 'ANSWERED').length;
      const answeredCorrectly = answers.filter(a => a.status === 'ANSWERED' && a.isCorrect).length;
      const answeredWrong = answers.filter(a => a.status === 'ANSWERED' && !a.isCorrect).length;
      // Missed includes explicitly missed (status: MISSED) or auto-missed due to timeout
      const missedCount = answers.filter(a => a.status !== 'ANSWERED').length;

      const scorePercent = currentTotal > 0 ? (answeredCorrectly / currentTotal) * 100 : 0;
      const avgTimePerAnsweredSec = attemptedCount > 0 ? totalTimeTakenSec / attemptedCount : 0;

      const result: ExamResult = {
        attemptId: `attempt_${Date.now()}`,
        candidateName: state.candidate.name,
        candidateEmail: state.candidate.email,
        startedAt: new Date(state.currentAttempt?.startTime || Date.now()).toISOString(),
        submittedAt: new Date().toISOString(),
        totalTimeTakenSec,
        totalQuestions: currentTotal,
        attemptedCount,
        missedCount,
        correctCount: answeredCorrectly,
        wrongCount: answeredWrong,
        avgTimePerAnsweredSec,
        scorePercent,
        answersJson: JSON.stringify(answers),
        organizationId: state.currentUser?.organizationId,
        candidateId: state.candidate.id
      };

      await apiService.submitResult(result);
      if (state.candidate && state.candidate.organizationId) {
        await apiService.updateCandidateStatus(state.candidate.email, state.candidate.organizationId, 'Attempted');
      }
      setState(prev => ({ ...prev, view: 'completion', lastResult: result }));
    } catch (err) {
      console.error("Submission error:", err);
      setError("Failed to transmit results. Connectivity issue likely.");
    }
  };

  const handleExamCancel = async () => {
    if (state.candidate && state.candidate.organizationId) {
      // Mark candidate as Opted Out
      await apiService.updateCandidateStatus(state.candidate.email, state.candidate.organizationId, 'Opted Out');
    }
    setState({ view: 'landing', candidate: null, currentAttempt: null, lastResult: null });
  };

  const handleEvaluationSubmit = async (evaluation: InterviewEvaluation) => {
    // If we have a specific organization context for this evaluation, use it
    // Otherwise fall back to current user's org (though the evaluation object itself should have it from props)
    const success = await apiService.submitInterviewEvaluation({
      ...evaluation,
      organizationId: evalCandidate?.organizationId || state.currentUser?.organizationId,
      candidateId: evalCandidate?.id
    });

    if (success) {
      setEvalCandidate(null);
      setState(prev => ({ ...prev, view: 'admin' }));
    } else {
      alert("Failed to save evaluation record.");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAdminError(null);
    try {
      const { user } = await apiService.signIn(adminEmail, adminPassword);
      if (!user) throw new Error('Authentication failed');

      const userProfile = await apiService.getUserProfile(user.email || '');
      setState(prev => ({ ...prev, view: 'admin', currentUser: userProfile }));
      setIsAdminAuthVisible(false);
    } catch (err: any) {
      setAdminError("Access denied. Credentials invalid.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await apiService.signOut();
    setState(prev => ({ ...prev, view: 'landing', currentUser: null }));
    setIsAdminAuthVisible(false);
    setAdminEmail('');
    setAdminPassword('');
    setSelectedDashboardOrgId(undefined);
  };

  const handleTabChange = useCallback((tab: 'leaderboard' | 'assessments' | 'questions' | 'config' | 'organizations' | 'users' | 'candidates') => {
    setState(prev => ({ ...prev, adminDashboardTab: tab }));
  }, []);

  if (state.view === 'exam' && state.candidate && state.currentAttempt) {
    return (
      <ExamView
        questions={state.currentAttempt.questions}
        overallTimeLimitSec={assessmentSettings.overallTimeLimitMins * 60}
        questionTimeLimitSec={assessmentSettings.questionTimeLimitSecs}
        onFinish={handleExamComplete}
        onCancel={handleExamCancel}
      />
    );
  }

  return (
    <div className="min-h-screen font-sans text-slate-900 selection:bg-[#d4af37] selection:text-[#002b49]">
      {state.view === 'landing' && (
        <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-slate-50">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#002b49]/5 to-transparent rounded-full -translate-y/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#d4af37]/5 to-transparent rounded-full translate-y/2 -translate-x-1/2 blur-3xl pointer-events-none"></div>

          <div className="w-full max-w-md p-8 relative z-10">
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-[#002b49] text-white rounded-[32px] flex items-center justify-center text-3xl font-black mb-6 mx-auto shadow-2xl shadow-[#002b49]/20 transform -rotate-6">
                E
              </div>
              <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter uppercase leading-none">Evaluate<span className="text-[#002b49]">.ai</span></h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Next-Gen Leadership Assessment Protocol</p>
            </div>

            {isAdminAuthVisible ? (
              <form onSubmit={handleAdminLogin} className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">System Access</h2>
                  <button type="button" onClick={() => setIsAdminAuthVisible(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest">Back</button>
                </div>

                {adminError && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-wide rounded-r-xl">
                    {adminError}
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 ml-1">Admin ID</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#002b49]/5 focus:border-[#002b49]/20 transition-all font-bold text-slate-700 placeholder:text-slate-300 pointer-events-auto"
                      placeholder="admin@company.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 ml-1">Secure Key</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#002b49]/5 focus:border-[#002b49]/20 transition-all font-bold text-slate-700 placeholder:text-slate-300 pointer-events-auto"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-[#002b49] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-[#002b49]/20 disabled:opacity-70 disabled:cursor-wait mt-2"
                  >
                    {isLoggingIn ? 'Authenticating...' : 'Enter Console'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <form onSubmit={handleStartExam} className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Candidate Entry</h2>
                  {error && (
                    <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-700 text-xs font-bold uppercase tracking-wide rounded-r-xl">
                      {error === "Results are awaited, please contact the interview SPOC" ? (
                        <div>
                          Results are awaited, please contact the interview SPOC.{" "}
                          <button
                            onClick={async () => {
                              try {
                                console.log('Fetching results for:', state.candidate);
                                const results = await apiService.getAllResults(state.candidate?.organizationId);
                                console.log('All results:', results);
                                const result = results.find(r => r.candidateEmail === state.candidate?.email);
                                console.log('Found result:', result);
                                if (result) {
                                  setState({ view: 'completion', candidate: state.candidate, currentAttempt: null, lastResult: result });
                                } else {
                                  setError('Unable to load your results. Please contact the interview SPOC.');
                                }
                              } catch (err) {
                                console.error('Failed to fetch result:', err);
                                setError('Error loading results. Please try again or contact the interview SPOC.');
                              }
                            }}
                            className="underline hover:text-amber-900 transition-colors"
                          >
                            View Results
                          </button>
                        </div>
                      ) : (
                        error
                      )}
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 ml-1">Organization ID</label>
                      <div className="flex items-center gap-2">
                        <input
                          name="orgDomain"
                          className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#002b49]/5 focus:border-[#002b49]/20 transition-all font-bold text-slate-900 placeholder:text-slate-400 pointer-events-auto text-right min-w-0"
                          placeholder="company-name"
                          autoComplete="off"
                        />
                        <div className="px-5 py-4 bg-slate-100 border border-slate-100 rounded-2xl font-bold text-slate-500 select-none whitespace-nowrap">
                          .evaluate.ai
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 ml-1">Official Email</label>
                      <input
                        name="email"
                        type="email"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#002b49]/5 focus:border-[#002b49]/20 transition-all font-bold text-slate-700 placeholder:text-slate-300 pointer-events-auto"
                        placeholder="jane@company.com"
                        required
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-[#002b49] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-[#002b49]/20 mt-2"
                    >
                      Initialize Session
                    </button>

                  </div>
                </form>

                <div className="text-center">
                  <button
                    onClick={() => setIsAdminAuthVisible(true)}
                    className="text-slate-300 hover:text-[#002b49] font-black uppercase tracking-[0.2em] text-[9px] transition-colors py-2 px-4"
                  >
                    System Administrator Access
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-6 font-black uppercase text-[9px] text-slate-300 tracking-[0.5em] opacity-40 selection:bg-transparent cursor-default">
            Restricted Access Protocol • v2.4.0
          </div>
        </div>
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

          <div className="flex gap-4">
            <button
              onClick={() => window.print()}
              className="bg-slate-100 text-slate-700 px-14 py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-[11px] shadow-lg hover:bg-slate-200 active:scale-95 transition-all"
            >
              Print
            </button>
            <button
              onClick={() => setState({ view: 'landing', candidate: null, currentAttempt: null, lastResult: null })}
              className="bg-[#002b49] text-white px-14 py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {state.view === 'admin' && (
        <AdminDashboard
          onEvaluate={(c) => {
            setEvalCandidate({ name: c.candidateName, email: c.candidateEmail, organizationId: c.organizationId, id: c.candidateId });
            setState(prev => ({ ...prev, view: 'interviewer-form' }));
          }}
          onLogout={handleLogout}
          currentUser={state.currentUser}
          selectedOrgId={state.currentUser?.role === 'super_admin' ? (selectedDashboardOrgId || state.currentUser?.organizationId) : state.currentUser?.organizationId}
          onOrganizationSelect={state.currentUser?.role === 'super_admin' ? setSelectedDashboardOrgId : undefined}
          initialActiveTab={state.adminDashboardTab}
          onTabChange={handleTabChange}
        />
      )}

      {state.view === 'interviewer-form' && evalCandidate && (
        <InterviewEvaluationView
          candidateName={evalCandidate.name}
          candidateEmail={evalCandidate.email}
          candidateId={evalCandidate.id}
          organizationId={evalCandidate.organizationId || state.currentUser?.organizationId}
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
