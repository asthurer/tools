
import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { ExamResult, Question, InterviewEvaluation, Rating, Category, Difficulty, OptionKey, AssessmentSettings, AnswerDetail, Section } from '../types';
import { LEADERSHIP_STANDARDS, OVERALL_TIME_LIMIT_SEC, QUESTION_TIME_LIMIT_SEC } from '../constants';
import { SUPABASE_CONFIG } from '../config';
import { AIQuestionGenerator } from './AIQuestionGenerator';

interface Props {
  onEvaluate: (candidate: { candidateName: string, candidateEmail: string }) => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ onEvaluate, onLogout }) => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [evaluations, setEvaluations] = useState<InterviewEvaluation[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLookup, setQuestionsLookup] = useState<Record<string, Question>>({});
  const [sections, setSections] = useState<Section[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'assessments' | 'questions' | 'config'>('leaderboard');
  const [loading, setLoading] = useState(false);
  const [infraStatus, setInfraStatus] = useState<{ connected: boolean, tables: Record<string, boolean> }>({
    connected: false,
    tables: {}
  });
  const [syncMessage, setSyncMessage] = useState<{ text: string, type: 'info' | 'success' | 'error' } | null>(null);

  const [selectedProfile, setSelectedProfile] = useState<ExamResult | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [viewingComment, setViewingComment] = useState<{ title: string, comment: string } | null>(null);
  const [generatingVerdict, setGeneratingVerdict] = useState(false);

  const [assessmentSettings, setAssessmentSettings] = useState<AssessmentSettings>({
    overallTimeLimitMins: OVERALL_TIME_LIMIT_SEC / 60,
    questionTimeLimitSecs: QUESTION_TIME_LIMIT_SEC,
    totalQuestions: 20,
    questionsPerSection: {}
  });

  const [newSectionName, setNewSectionName] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);

  // Pagination & Filtering State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQuestions = useCallback(async (page: number, size: number, cat: string, query: string) => {
    setLoading(true);
    try {
      const { data, count } = await apiService.getQuestions(false, page, size, cat, query);
      setQuestions(data);
      setTotalQuestionsCount(count);
    } catch (err) {
      console.error("Fetch questions error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllQuestionsForLookup = async () => {
    try {
      // Fetch a large chunk of questions to ensure results have data to link to
      const { data } = await apiService.getQuestions(false, 1, 1000);
      const lookup: Record<string, Question> = {};
      data.forEach(q => { lookup[q.id] = q; });
      setQuestionsLookup(lookup);
    } catch (err) {
      console.error("Lookup fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    runDiagnostics();
    fetchSettings();
    fetchSections();
    fetchAllQuestionsForLookup();
  }, []);

  useEffect(() => {
    if (activeTab === 'questions') {
      fetchQuestions(currentPage, pageSize, filterCategory, searchQuery);
    }
  }, [activeTab, currentPage, pageSize, filterCategory, searchQuery, fetchQuestions]);

  const fetchSections = async () => {
    const list = await apiService.getSections();
    setSections(list);
  };

  const fetchSettings = async () => {
    const settings = await apiService.getSettings();
    if (settings) {
      setAssessmentSettings(settings);
    }
  };

  const handleUpdateSettings = async () => {
    setLoading(true);
    setSyncMessage({ text: "Syncing with cloud...", type: 'info' });
    const success = await apiService.updateSettings(assessmentSettings);
    setLoading(false);
    if (success) {
      setSyncMessage({ text: "Assessment parameters updated and saved to DB.", type: 'success' });
    } else {
      setSyncMessage({ text: "Failed to update parameters. Verify table schema and permissions.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resData, evalData] = await Promise.all([
        apiService.getAllResults(),
        apiService.getAllEvaluations()
      ]);
      setResults(resData || []);
      setEvaluations(evalData || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostics = async () => {
    const status = await apiService.checkInfrastructure();
    setInfraStatus(status);
    return status;
  };

  const handleSeedDb = async () => {
    setSyncMessage({ text: "Checking infrastructure...", type: 'info' });
    const status = await runDiagnostics();

    if (!status.tables['questions']) {
      setSyncMessage({ text: "Sync Blocked: Tables not found in Supabase.", type: 'error' });
      return;
    }

    try {
      setLoading(true);
      await apiService.initializeDatabase();
      setSyncMessage({ text: "Question bank synced.", type: 'success' });
      fetchQuestions(currentPage, pageSize, filterCategory, searchQuery);
      fetchAllQuestionsForLookup();
      fetchSections();
    } catch (err: any) {
      setSyncMessage({ text: "Sync failed: " + err.message, type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleSaveQuestion = async (q: Question) => {
    await apiService.saveSection({ name: q.category, isActive: true });
    const success = await apiService.saveQuestion(q);
    if (success) {
      setEditingQuestion(null);
      fetchQuestions(currentPage, pageSize, filterCategory, searchQuery);
      fetchAllQuestionsForLookup();
      fetchSections();
      setSyncMessage({ text: "Question saved.", type: 'success' });
    } else {
      setSyncMessage({ text: "Failed to save question.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleAISave = async (newQs: Question[]) => {
    setLoading(true);
    setShowAIGenerator(false);
    try {
      let successCount = 0;
      for (const q of newQs) {
        await apiService.saveSection({ name: q.category, isActive: true });
        const ok = await apiService.saveQuestion(q);
        if (ok) successCount++;
      }
      setSyncMessage({ text: `${successCount} AI questions imported successfully.`, type: 'success' });
    } catch (err) {
      setSyncMessage({ text: "Batch import encountered errors.", type: 'error' });
    } finally {
      setLoading(false);
      fetchQuestions(currentPage, pageSize, filterCategory, searchQuery);
      fetchAllQuestionsForLookup();
      fetchSections();
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Delete this question permanently?")) return;
    const success = await apiService.deleteQuestion(id);
    if (success) {
      fetchQuestions(currentPage, pageSize, filterCategory, searchQuery);
      fetchAllQuestionsForLookup();
      setSyncMessage({ text: "Question deleted.", type: 'success' });
    } else {
      setSyncMessage({ text: "Deletion failed.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleDeleteResult = async (id: string) => {
    if (!window.confirm("Permanently delete this candidate's record? This action cannot be undone.")) return;
    setLoading(true);
    const success = await apiService.deleteResult(id);
    if (success) {
      await fetchData();
      setSyncMessage({ text: "Record purged successfully.", type: 'success' });
    } else {
      setSyncMessage({ text: "Purge failed. Verify permissions.", type: 'error' });
    }
    setLoading(false);
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const getRatingColor = (rating: Rating) => {
    switch (rating) {
      case 'Strong Evidence': return 'text-green-600 bg-green-50 border-green-200';
      case 'Good Evidence': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Limited Evidence': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-slate-400 bg-slate-50 border-slate-200';
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    if (b.scorePercent !== a.scorePercent) return b.scorePercent - a.scorePercent;
    if (a.totalTimeTakenSec !== b.totalTimeTakenSec) return a.totalTimeTakenSec - b.totalTimeTakenSec;
    return a.avgTimePerAnsweredSec - b.avgTimePerAnsweredSec;
  });

  const getActiveCategories = () => {
    return sections.filter(s => s.isActive).map(s => s.name);
  };

  const handleSectionConfigChange = (category: string, count: number) => {
    setAssessmentSettings(prev => ({
      ...prev,
      questionsPerSection: {
        ...prev.questionsPerSection,
        [category]: count
      }
    }));
  };

  const handleAddNewSection = async () => {
    const trimmed = newSectionName.trim();
    if (!trimmed) return;

    setLoading(true);
    const ok = await apiService.saveSection({ name: trimmed, isActive: true });
    setLoading(false);

    if (ok) {
      handleSectionConfigChange(trimmed, 0);
      setNewSectionName('');
      setIsAddingSection(false);
      fetchSections();
      setSyncMessage({ text: `Domain "${trimmed}" initialized.`, type: 'success' });
    } else {
      setSyncMessage({ text: "Failed to create section. Check DB permissions.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const totalPages = Math.ceil(totalQuestionsCount / pageSize);

  const PaginationControls = () => (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
          Viewing <span className="text-slate-900">{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalQuestionsCount)}</span> of <span className="text-slate-900">{totalQuestionsCount}</span> records
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Questions per page:</span>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[5, 10, 20, 50, 100].map(size => (
              <button
                key={size}
                onClick={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${pageSize === size ? 'bg-white text-[#002b49] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          className={`p-4 rounded-2xl border-2 transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed border-slate-100' : 'hover:bg-slate-50 border-slate-200 active:scale-95'
            }`}
        >
          <svg className="w-5 h-5 text-[#002b49]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
        </button>

        <div className="flex gap-2">
          {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5) {
              if (currentPage > 3) {
                pageNum = currentPage - 2 + i;
              }
              if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              if (pageNum <= 0) pageNum = i + 1;
            }
            if (pageNum > totalPages) return null;

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-12 h-12 rounded-2xl font-black text-xs transition-all ${currentPage === pageNum
                  ? 'bg-[#002b49] text-white shadow-xl'
                  : 'bg-white border-2 border-slate-100 text-slate-300 hover:border-slate-300'
                  }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          className={`p-4 rounded-2xl border-2 transition-all ${currentPage === totalPages || totalPages === 0 ? 'opacity-30 cursor-not-allowed border-slate-100' : 'hover:bg-slate-50 border-slate-200 active:scale-95'
            }`}
        >
          <svg className="w-5 h-5 text-[#002b49]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
        </button>
      </div>
    </div>
  );

  const QuestionModal = ({ question, onClose, onSave }: { question: Partial<Question>, onClose: () => void, onSave: (q: Question) => void }) => {
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const [formData, setFormData] = useState<Partial<Question>>({
      id: question.id || `q_${Date.now()}`,
      text: question.text || '',
      category: question.category || getActiveCategories()[0] || 'General',
      difficulty: question.difficulty || 'Easy',
      options: question.options || { A: '', B: '', C: '', D: '' },
      correctOption: question.correctOption || 'A',
      isActive: question.isActive ?? true
    });

    const existingCategories = getActiveCategories();
    const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];

    const handleInternalSave = () => {
      const finalCategory = isAddingNewCategory ? newCategoryName.trim() : formData.category;
      if (!finalCategory) {
        alert("Category is required.");
        return;
      }
      onSave({ ...formData, category: finalCategory } as Question);
    };

    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
        <div className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
          <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter">{question.id ? 'Edit Record' : 'Create Record'}</h3>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Question Definition</label>
              <textarea
                value={formData.text}
                onChange={e => setFormData({ ...formData, text: e.target.value })}
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium outline-none focus:ring-4 focus:ring-indigo-100 min-h-[100px] shadow-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                  <button
                    onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                    className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    {isAddingNewCategory ? 'Back to List' : '+ Add New'}
                  </button>
                </div>
                {isAddingNewCategory ? (
                  <input
                    placeholder="Domain Name"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="w-full p-4 bg-white border border-indigo-200 rounded-2xl font-bold text-slate-700 outline-none shadow-sm focus:ring-4 focus:ring-indigo-50"
                  />
                ) : (
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none shadow-sm"
                  >
                    {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Complexity</label>
                <select
                  value={formData.difficulty}
                  onChange={e => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none shadow-sm"
                >
                  {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(['A', 'B', 'C', 'D'] as OptionKey[]).map(key => (
                <div key={key}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Option {key}</label>
                  <input
                    value={formData.options?.[key]}
                    onChange={e => setFormData({ ...formData, options: { ...formData.options!, [key]: e.target.value } })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none shadow-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between items-end gap-6 pt-4">
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">True Answer Key</label>
                <div className="flex gap-2">
                  {(['A', 'B', 'C', 'D'] as OptionKey[]).map(key => (
                    <button
                      key={key}
                      onClick={() => setFormData({ ...formData, correctOption: key })}
                      className={`flex-1 py-3 rounded-xl font-black transition-all ${formData.correctOption === key ? 'bg-[#002b49] text-white' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 pb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</label>
                <button
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${formData.isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isActive ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-10">
            <button onClick={onClose} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Discard</button>
            <button
              onClick={handleInternalSave}
              className="flex-1 bg-[#002b49] text-[#d4af37] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#002b49]/20"
            >
              Commit Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleGenerateVerdict = async (profile: ExamResult) => {
    setGeneratingVerdict(true);
    const evaluation = evaluations.find(e => e.candidateEmail === profile.candidateEmail);
    if (!evaluation) {
      setGeneratingVerdict(false);
      return;
    }

    try {
      const verdict = await apiService.generateVerdict(profile.candidateName, profile.scorePercent, evaluation.ratings as Record<string, string>);
      const success = await apiService.saveVerdict(evaluation.evaluationId, verdict, evaluation.notes);
      if (success) {
        // Optimistically update
        setEvaluations(prev => prev.map(e => e.evaluationId === evaluation.evaluationId ? { ...e, aiVerdict: verdict } : e));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingVerdict(false);
    }
  };

  const renderProfileModal = () => {
    if (!selectedProfile) return null;

    let detailedAnswers: AnswerDetail[] = [];
    try {
      detailedAnswers = JSON.parse(selectedProfile.answersJson);
    } catch (e) {
      console.error("Failed to parse answers JSON", e);
    }

    // Calculate Category Stats
    const categoryStats: Record<string, { total: number; correct: number; time: number }> = {};
    detailedAnswers.forEach(ans => {
      const question = questionsLookup[ans.questionId];
      if (question) {
        const cat = question.category || 'General'; // Fallback
        if (!categoryStats[cat]) categoryStats[cat] = { total: 0, correct: 0, time: 0 };
        categoryStats[cat].total++;
        if (ans.isCorrect) categoryStats[cat].correct++;
        categoryStats[cat].time += ans.timeSpentSec || 0;
      }
    });

    const categoryData = Object.entries(categoryStats).map(([name, stats]) => ({
      name,
      ...stats,
      percent: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
    })).sort((a, b) => b.percent - a.percent); // Sort by highest score

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
        <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <div className="bg-[#002b49] p-8 text-white flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{selectedProfile.candidateName}</h2>
              <p className="text-[#d4af37] font-bold text-xs uppercase tracking-widest mt-2">{selectedProfile.candidateEmail}</p>
            </div>
            <button onClick={() => setSelectedProfile(null)} className="text-white/50 hover:text-white font-bold uppercase text-xs border border-white/20 px-4 py-2 rounded-xl transition-colors">Close Profile</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

            {/* 1. Tech Assessment Overview (Compact Full Width) */}
            <section className="bg-slate-50 rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col items-center md:items-start shrink-0">
                <div className="text-[40px] font-black text-[#002b49] leading-none mb-1">{selectedProfile.scorePercent.toFixed(2)}%</div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Composite Score</p>
              </div>
              <div className="grid grid-cols-4 gap-8 w-full max-w-3xl">
                {/* Stats Grid */}
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Correct</span>
                  <span className="text-lg font-black text-green-600 leading-none">{selectedProfile.correctCount}</span>
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Missed</span>
                  <span className="text-lg font-black text-red-600 leading-none">{selectedProfile.missedCount}</span>
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Time</span>
                  <span className="text-sm font-black text-slate-900 leading-none">
                    {Math.floor(selectedProfile.totalTimeTakenSec / 60)}M {selectedProfile.totalTimeTakenSec % 60}S
                  </span>
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Speed</span>
                  <span className="text-sm font-black text-slate-900 leading-none">{selectedProfile.avgTimePerAnsweredSec.toFixed(1)}S</span>
                </div>
              </div>
            </section>

            {/* 2. Side-by-Side: Domain Perf + Leadership Evidence */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Domain Performance */}
              <section className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm flex flex-col h-full">
                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6">Domain Performance</h4>
                <div className="space-y-4 flex-1">
                  {categoryData.map((cat) => (
                    <div key={cat.name}>
                      <div className="flex justify-between items-end mb-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-700">{cat.name}</span>
                          <span className="text-[8px] text-slate-400 font-medium">
                            {cat.correct}/{cat.total} • {Math.round(cat.time)}s
                          </span>
                        </div>
                        <span className="text-xs font-black text-[#002b49]">{cat.percent.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${cat.percent >= 80 ? 'bg-green-500' :
                            cat.percent >= 50 ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                          style={{ width: `${cat.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Leadership Evidence */}
              <section className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm flex flex-col h-full">
                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6">Leadership Evidence</h4>
                {evaluations.find(e => e.candidateEmail === selectedProfile.candidateEmail) ? (
                  <div className="flex flex-col gap-4 flex-1">
                    {(() => {
                      const evaluation = evaluations.find(e => e.candidateEmail === selectedProfile.candidateEmail)!;
                      return (
                        <div className={`p-4 rounded-xl border-l-4 mb-2 shadow-sm ${evaluation.finalOutcome === 'Offer' ? 'bg-green-50 border-green-500 text-green-900' :
                          evaluation.finalOutcome === 'Decline' ? 'bg-red-50 border-red-500 text-red-900' :
                            'bg-amber-50 border-amber-500 text-amber-900'
                          }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Interviewer Verdict</div>
                              <div className="text-lg font-black uppercase tracking-tight">{evaluation.finalOutcome}</div>
                            </div>
                            {evaluation.finalComments && (
                              <div className="text-[10px] italic opacity-80 max-w-[60%] text-right font-medium">
                                "{evaluation.finalComments}"
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 gap-2">
                      {LEADERSHIP_STANDARDS.map(s => {
                        const evaluation = evaluations.find(e => e.candidateEmail === selectedProfile.candidateEmail)!;
                        return (
                          <div key={s.id} className="flex justify-between items-center p-3 border border-slate-50 rounded-lg bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                            <div className="flex items-center gap-2">
                              <div className="text-[9px] font-black uppercase text-[#002b49] tracking-tight">{s.title}</div>
                              {evaluation.notes?.[s.id] && (
                                <button
                                  onClick={() => setViewingComment({ title: s.title, comment: evaluation.notes[s.id] })}
                                  className="text-indigo-400 hover:text-indigo-600 transition-colors"
                                  title="View Details"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
                                </button>
                              )}
                            </div>
                            <div className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase ${getRatingColor(evaluation.ratings[s.id] as Rating)}`}>
                              {evaluation.ratings[s.id] || 'No Evidence'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center text-slate-300 font-black uppercase text-[9px] border-2 border-dashed border-slate-100 rounded-xl">No Interview Conducted</div>
                )}
              </section>
            </div>

            {/* AI Verdict Section - Compact */}
            <section className="bg-slate-50 border border-slate-100 rounded-[24px] p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                  <span className="text-sm">🤖</span> AI Candidate Verdict
                </h3>
                <button
                  onClick={() => selectedProfile && handleGenerateVerdict(selectedProfile)}
                  disabled={generatingVerdict || !evaluations.find(e => e.candidateEmail === selectedProfile!.candidateEmail)}
                  className="bg-[#002b49] text-white px-5 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50 hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  {generatingVerdict ? <span className="animate-spin text-lg">⟳</span> : <span>⚡</span>}
                  {generatingVerdict ? 'Analyzing...' : 'Generate Verdict'}
                </button>
              </div>

              {evaluations.find(e => e.candidateEmail === selectedProfile?.candidateEmail)?.aiVerdict ? (
                (() => {
                  const verdict = evaluations.find(e => e.candidateEmail === selectedProfile?.candidateEmail)!.aiVerdict!;
                  return (
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                      <div className={`flex-1 p-6 rounded-2xl border-2 ${verdict.decision === 'Hire' ? 'bg-green-50 border-green-200 text-green-800' :
                        verdict.decision === 'No Hire' ? 'bg-red-50 border-red-200 text-red-800' :
                          'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                        <div className="text-[10px] uppercase tracking-widest font-black opacity-60 mb-2">Recommendation</div>
                        <div className="text-3xl font-black uppercase mb-2">{verdict.decision}</div>
                        <div className="text-xs font-bold opacity-80">Confidence: {verdict.confidence}%</div>
                      </div>
                      <div className="flex-[2] bg-white p-6 rounded-2xl border border-slate-100 text-slate-600 text-sm font-medium leading-relaxed shadow-sm">
                        <div className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Rationale</div>
                        "{verdict.rationale}"
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-8 text-slate-400 italic text-xs">
                  Click generate to analyze candidate performance and interview notes.
                </div>
              )}
            </section>

            {viewingComment && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
                <div className="bg-white max-w-md w-full p-8 rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">{viewingComment.title}</h4>
                  <div className="text-slate-700 text-sm font-medium leading-relaxed mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    "{viewingComment.comment}"
                  </div>
                  <button
                    onClick={() => setViewingComment(null)}
                    className="w-full bg-[#002b49] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}


            <section>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-6 border-b pb-2">Technical Response Log</h3>
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">No.</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Question & Category</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Candidate Choice</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Correct Key</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailedAnswers.map((ans, idx) => {
                      const question = questionsLookup[ans.questionId];
                      const isMissed = ans.status === 'MISSED';
                      const isOverallTimeout = ans.status === 'AUTO_MISSED_OVERALL_TIMEOUT';
                      const isCorrect = ans.isCorrect;

                      return (
                        <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${isMissed || isOverallTimeout ? 'bg-red-50/10' : ''}`}>
                          <td className="px-6 py-5 text-xs font-black text-slate-200">{idx + 1}</td>
                          <td className="px-6 py-5">
                            <div className="text-xs font-bold text-slate-900 leading-snug mb-1">{question?.text || 'Question Record Missing'}</div>
                            <div className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">{question?.category || 'General'}</div>
                          </td>
                          <td className="px-6 py-5">
                            {ans.selectedOption ? (
                              <div className="flex flex-col">
                                <span className={`text-xs font-black ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{ans.selectedOption}</span>
                                <span className="text-[8px] text-slate-400 max-w-[150px] leading-tight mt-1">{question?.options[ans.selectedOption as OptionKey] || 'Option text unavailable'}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-slate-300 uppercase italic">BLANK</span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {question ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900">{question.correctOption}</span>
                                <span className="text-[8px] text-slate-400 max-w-[150px] leading-tight mt-1">{question.options[question.correctOption as OptionKey]}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-slate-200">?</span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${isCorrect ? 'bg-green-100 text-green-700' :
                              isOverallTimeout ? 'bg-amber-100 text-amber-700' :
                                isMissed ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-700'
                              }`}>
                              {isCorrect ? 'Correct' : isOverallTimeout ? 'Timeout' : isMissed ? 'Missed' : 'Wrong'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right font-mono text-xs font-bold text-slate-400">
                            {ans.timeSpentSec}s
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div >
      </div >
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {renderProfileModal()}

      {showManualModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Manual Evaluation</h3>
            <div className="space-y-4">
              <input placeholder="Full Name" id="mName" className="w-full p-4 bg-white border border-slate-100 rounded-xl outline-none shadow-sm" />
              <input placeholder="Email" id="mEmail" className="w-full p-4 bg-white border border-slate-100 rounded-xl outline-none shadow-sm" />
              <button
                onClick={() => {
                  const n = (document.getElementById('mName') as HTMLInputElement).value;
                  const e = (document.getElementById('mEmail') as HTMLInputElement).value;
                  if (n && e) onEvaluate({ candidateName: n, candidateEmail: e });
                  setShowManualModal(false);
                }}
                className="w-full bg-[#002b49] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg"
              >Launch Toolkit</button>
            </div>
          </div>
        </div>
      )}

      {editingQuestion && (
        <QuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={handleSaveQuestion}
        />
      )}

      {showAIGenerator && (
        <AIQuestionGenerator
          existingCategories={getActiveCategories()}
          onClose={() => setShowAIGenerator(false)}
          onSaveQuestions={handleAISave}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Recruitment Hub</h1>
          <p className="text-[#002b49] font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Central Data Architecture & Quality Control</p>
        </div>
        <div className="flex gap-4">
          {activeTab === 'questions' && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowAIGenerator(true)}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <span className="text-lg">✨</span> AI Architect
              </button>
              <button
                onClick={() => setEditingQuestion({} as Question)}
                className="bg-[#d4af37] text-[#002b49] px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-200"
              >+ Manual Add</button>
            </div>
          )}
          <button onClick={() => {
            fetchData();
            if (activeTab === 'questions') fetchQuestions(currentPage, pageSize, filterCategory, searchQuery);
          }} className="bg-[#002b49] text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Refresh Hub</button>
          {onLogout && (
            <button onClick={onLogout} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-100 transition-all">Exit Hub</button>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-10 gap-8 overflow-x-auto no-scrollbar">
        {(['leaderboard', 'assessments', 'questions', 'config'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === 'questions') setCurrentPage(1);
            }}
            className={`px-2 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-[#002b49] text-[#002b49]' : 'border-transparent text-slate-300 hover:text-slate-400'
              }`}
          >
            {tab === 'questions' ? '📋 Question Bank' : tab === 'assessments' ? '⭐ Toolkits' : tab}
          </button>
        ))}
      </div>

      {loading && !syncMessage && activeTab !== 'questions' ? (
        <div className="py-32 flex flex-col items-center justify-center gap-6 text-center">
          <div className="w-14 h-14 border-4 border-slate-100 border-t-[#002b49] rounded-full animate-spin"></div>
          <p className="text-slate-300 font-black uppercase text-[11px] tracking-[0.5em] animate-pulse">Syncing Distributed Systems</p>
        </div>
      ) : (
        <div className="pb-24">
          {syncMessage && (
            <div className={`mb-8 p-6 rounded-3xl text-center font-black uppercase text-[10px] tracking-widest border-2 shadow-sm transition-all animate-bounce ${syncMessage.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' :
              syncMessage.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' :
                'bg-indigo-50 border-indigo-100 text-indigo-600'
              }`}>
              {syncMessage.text}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl flex flex-col max-h-[70vh] overflow-hidden">
              {sortedResults.length > 0 ? (
                <div className="overflow-auto flex-1 w-full">
                  <table className="w-full text-left min-w-[1000px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate Profile</th>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                        <th className="px-10 py-5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sortedResults.map((r, i) => (
                        <tr key={r.attemptId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-10 py-8 font-black text-slate-200 text-5xl italic tracking-tighter">#{i + 1}</td>
                          <td className="px-10 py-8">
                            <div className="font-black text-slate-900 text-2xl tracking-tight leading-none mb-1">{r.candidateName}</div>
                            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{r.candidateEmail}</div>
                          </td>
                          <td className="px-10 py-8 text-center">
                            <span className="text-3xl font-black text-[#002b49] tracking-tighter">{r.scorePercent.toFixed(2)}%</span>
                          </td>
                          <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                            <button onClick={() => setSelectedProfile(r)} className="bg-[#002b49] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95">View Analytics</button>
                            <button
                              onClick={() => handleDeleteResult(r.attemptId)}
                              className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all shadow-sm"
                              title="Purge Record"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-48 text-center bg-slate-50/30">
                  <p className="text-slate-300 font-bold uppercase text-[11px] tracking-[0.4em] mb-10">System remains unpopulated</p>
                  {!infraStatus.connected && (
                    <button onClick={() => setActiveTab('config')} className="bg-[#002b49] text-white px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Establish Connectivity</button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'assessments' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
              <div className="bg-[#002b49] rounded-[48px] p-12 flex flex-col items-center justify-center text-center border-4 border-[#d4af37] shadow-2xl hover:scale-[1.03] transition-all min-h-[400px]">
                <div className="w-20 h-20 bg-[#d4af37] text-[#002b49] rounded-[32px] flex items-center justify-center text-4xl font-black mb-8 shadow-xl shadow-[#d4af37]/20">+</div>
                <h3 className="text-white font-black uppercase tracking-widest text-lg mb-3">Direct Entry</h3>
                <p className="text-white/40 text-[10px] mb-10 font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[200px]">Manual leadership evaluation for walk-in candidates</p>
                <button
                  onClick={() => setShowManualModal(true)}
                  className="w-full bg-white text-[#002b49] py-5 rounded-3xl font-black uppercase text-[11px] tracking-widest hover:shadow-2xl transition-all"
                >
                  Launch manual tool
                </button>
              </div>

              {results.map(r => {
                const isDone = evaluations.find(e => e.candidateEmail === r.candidateEmail);
                return (
                  <div key={r.attemptId} className="bg-white rounded-[48px] p-12 border border-slate-100 shadow-xl flex flex-col justify-between hover:shadow-2xl transition-all group">
                    <div>
                      <div className="text-[10px] font-black uppercase text-indigo-600 mb-8 flex justify-between items-center bg-indigo-50/50 px-4 py-2 rounded-full">
                        <span className="tracking-widest">CAPABILITY STATUS</span>
                        {isDone ? (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-black text-[9px]">EVALUATED</span>
                        ) : (
                          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-black text-[9px]">PENDING</span>
                        )}
                      </div>
                      <div className="text-3xl font-black text-slate-900 mb-2 leading-none tracking-tighter group-hover:text-[#002b49] transition-colors">{r.candidateName}</div>
                      <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-10 truncate">{r.candidateEmail}</div>
                      <div className="bg-slate-50 p-6 rounded-3xl flex justify-between items-center mb-10 border border-slate-100 shadow-inner overflow-hidden">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap mr-2">Technical score</span>
                        <span className="text-xl font-black text-slate-900 tracking-tighter">{r.scorePercent.toFixed(2)}%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onEvaluate({ candidateName: r.candidateName, candidateEmail: r.candidateEmail })}
                      className={`w-full py-6 rounded-3xl font-black uppercase text-[11px] tracking-widest transition-all ${isDone ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' : 'bg-[#002b49] text-[#d4af37] shadow-xl hover:bg-[#002b49]/90'
                        }`}
                    >
                      {isDone ? 'Review capability' : 'Conduct Assessment'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row gap-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Search Query</label>
                  <input
                    placeholder="Filter by question text..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Category Filter</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => {
                      setFilterCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-slate-600 cursor-pointer"
                  >
                    <option value="">All Domains</option>
                    {getActiveCategories().map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* TOP PAGINATION & PAGE SIZE SELECTOR */}
              {!loading && questions.length > 0 && <PaginationControls />}

              {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-6">
                  <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Updating View...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {questions.length > 0 ? (
                    <>
                      {questions.map(q => (
                        <div key={q.id} className={`bg-white rounded-[40px] p-12 border border-slate-100 shadow-xl flex flex-col gap-10 hover:shadow-2xl transition-all ${!q.isActive ? 'opacity-40' : ''}`}>
                          <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-4 mb-6">
                                <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-indigo-100">{q.category}</span>
                                <span className="bg-slate-50 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-slate-100">{q.difficulty}</span>
                                {!q.isActive && <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-red-100">Hidden from bank</span>}
                              </div>
                              <p className="text-2xl font-bold text-slate-900 leading-snug tracking-tight mb-10">{q.text}</p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => {
                                  const isCorrect = q.correctOption === key;
                                  return (
                                    <div
                                      key={key}
                                      className={`flex items-center p-5 rounded-3xl border-2 transition-all ${isCorrect
                                        ? 'bg-green-50 border-green-200 text-green-900 shadow-sm'
                                        : 'bg-white border-slate-50 text-slate-500'
                                        }`}
                                    >
                                      <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm mr-4 shrink-0 shadow-sm ${isCorrect ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {key}
                                      </div>
                                      <span className="text-sm font-semibold">{q.options[key]}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex lg:flex-col gap-3 shrink-0 pt-4">
                              <button
                                onClick={() => setEditingQuestion(q)}
                                className="px-10 py-4 bg-[#002b49] text-[#d4af37] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                              >Update</button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="px-10 py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                              >Delete</button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* BOTTOM PAGINATION */}
                      <PaginationControls />
                    </>
                  ) : (
                    <div className="py-32 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-100 shadow-inner">
                      <p className="text-slate-300 font-black uppercase text-[11px] tracking-[0.5em] mb-12">No matching questions found</p>
                      <button onClick={handleSeedDb} className="bg-[#002b49] text-white px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Restore Seed Data</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div className="grid lg:grid-cols-1 gap-12">
              <div className="bg-white rounded-[48px] p-12 border border-slate-100 shadow-2xl">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <h3 className="text-3xl font-black text-[#002b49] uppercase tracking-tighter mb-2 leading-none">Assessment Strategy</h3>
                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.3em]">Configure exam structure and timers</p>
                  </div>
                  <button onClick={handleUpdateSettings} className="bg-[#d4af37] text-[#002b49] px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#d4af37]/10 hover:scale-[1.02] active:scale-95 transition-all">Sync to Cloud</button>
                </div>

                <div className="space-y-12">
                  <div className="grid md:grid-cols-3 gap-8">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">TOTAL QUESTIONS</label>
                      <input
                        type="number"
                        value={assessmentSettings.totalQuestions}
                        onChange={e => setAssessmentSettings(prev => ({ ...prev, totalQuestions: Number(e.target.value) }))}
                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner text-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">OVERALL SESSION (MINS)</label>
                      <input
                        type="number"
                        value={assessmentSettings.overallTimeLimitMins}
                        onChange={e => setAssessmentSettings(prev => ({ ...prev, overallTimeLimitMins: Number(e.target.value) }))}
                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner text-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">PER QUESTION (SECS)</label>
                      <input
                        type="number"
                        value={assessmentSettings.questionTimeLimitSecs}
                        onChange={e => setAssessmentSettings(prev => ({ ...prev, questionTimeLimitSecs: Number(e.target.value) }))}
                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner text-xl"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-10">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h4 className="text-xl font-black text-[#002b49] uppercase tracking-tighter">Question Section Distribution</h4>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">Define how many questions from each category are picked for a session</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {getActiveCategories().map(category => (
                        <div key={category} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner group relative">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block truncate" title={category}>{category}</label>
                          <input
                            type="number"
                            value={assessmentSettings.questionsPerSection[category] || 0}
                            onChange={e => handleSectionConfigChange(category, Number(e.target.value))}
                            className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-indigo-400 shadow-sm transition-all"
                          />
                        </div>
                      ))}

                      {isAddingSection ? (
                        <div className="bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-200 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2 block">NEW SECTION NAME</label>
                          <input
                            autoFocus
                            placeholder="e.g. Data Modeling"
                            value={newSectionName}
                            onChange={e => setNewSectionName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddNewSection()}
                            className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl font-black text-slate-900 outline-none focus:border-indigo-400 mb-3"
                          />
                          <div className="flex gap-2">
                            <button onClick={handleAddNewSection} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Add</button>
                            <button onClick={() => { setIsAddingSection(false); setNewSectionName(''); }} className="flex-1 bg-white text-indigo-400 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-100">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsAddingSection(true)}
                          className="bg-white border-4 border-dashed border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 hover:border-[#d4af37] hover:bg-slate-50 transition-all text-slate-300 hover:text-[#d4af37]"
                        >
                          <span className="text-2xl font-black">+</span>
                          <span className="text-[10px] font-black uppercase tracking-widest">Add Section</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-8 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                      <div className="flex justify-between items-center font-black uppercase text-[10px] tracking-widest text-indigo-700">
                        <span>Total Configured Pick:</span>
                        <span className={`text-xl tracking-tighter ${Object.values(assessmentSettings.questionsPerSection).reduce((a: number, b: number) => a + b, 0) !== assessmentSettings.totalQuestions ? 'text-amber-600' : 'text-green-600'}`}>
                          {Object.values(assessmentSettings.questionsPerSection).reduce((a: number, b: number) => a + b, 0)} / {assessmentSettings.totalQuestions}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#002b49] rounded-[48px] p-12 shadow-2xl border border-white/5 mt-10">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 leading-none">Infrastructure</h3>
                <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.3em] mb-12">Cloud synchronization & health</p>

                <div className="space-y-6">
                  <div className="flex justify-between items-center p-6 bg-white/5 border border-white/10 rounded-3xl">
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Global connection</span>
                    <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${infraStatus.connected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {infraStatus.connected ? 'ONLINE' : 'DISCONNECTED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {['questions', 'results', 'evaluations', 'settings', 'sections'].map(table => (
                      <div key={table} className="flex justify-between items-center p-6 bg-white rounded-3xl shadow-lg border-b-4 border-slate-100">
                        <span className="text-[11px] font-black uppercase text-slate-800 tracking-widest">{table} collection</span>
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${infraStatus.tables[table] ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {infraStatus.tables[table] ? 'VERIFIED' : 'NOT FOUND'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {!Object.values(infraStatus.tables).every(v => v) && (
                    <div className="mt-8 pt-10 border-t border-white/5">
                      <p className="text-[11px] text-amber-400 font-black uppercase tracking-widest mb-6 text-center">Protocol deviation detected: Table schema required.</p>
                      <p className="text-[9px] text-white/40 font-bold uppercase mb-6 text-center">If "settings" or other tables are "NOT FOUND", please execute the SQL script in your Supabase SQL Editor.</p>
                      <button
                        onClick={() => {
                          const sql = `CREATE TABLE IF NOT EXISTS sections (name TEXT PRIMARY KEY, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, category TEXT REFERENCES sections(name) ON UPDATE CASCADE, difficulty TEXT, text TEXT, options JSONB, correct_option CHAR(1), is_active BOOLEAN, created_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE IF NOT EXISTS results (id TEXT PRIMARY KEY, candidate_name TEXT, candidate_email TEXT, started_at TIMESTAMPTZ, submitted_at TIMESTAMPTZ, total_time_taken_sec INTEGER, total_questions INTEGER, attempted_count INTEGER, missed_count INTEGER, correct_count INTEGER, wrong_count INTEGER, avg_time_per_answered_sec DECIMAL, score_percent DECIMAL, answers_json JSONB, created_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE IF NOT EXISTS evaluations (id TEXT PRIMARY KEY, candidate_email TEXT, interviewer_name TEXT, level TEXT, ratings JSONB, notes JSONB, final_outcome TEXT, final_comments TEXT, submitted_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ DEFAULT NOW()); ALTER TABLE sections DISABLE ROW LEVEL SECURITY; ALTER TABLE questions DISABLE ROW LEVEL SECURITY; ALTER TABLE results DISABLE ROW LEVEL SECURITY; ALTER TABLE evaluations DISABLE ROW LEVEL SECURITY; ALTER TABLE settings DISABLE ROW LEVEL SECURITY;`;
                          navigator.clipboard.writeText(sql);
                          setSyncMessage({ text: "Database Schema captured to clipboard.", type: 'success' });
                        }}
                        className="w-full bg-[#d4af37] text-[#002b49] py-5 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-amber-400 transition-all"
                      >
                        Copy SQL Initialization Script
                      </button>
                    </div>
                  )}

                  <button onClick={() => runDiagnostics()} className="w-full text-white/20 hover:text-white font-black uppercase text-[9px] tracking-[0.4em] transition-all mt-6 text-center underline">RE-RUN INFRASTRUCTURE DIAGNOSTICS</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
