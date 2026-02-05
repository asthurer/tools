
import React, { useState, useEffect } from 'react';
import { LEADERSHIP_STANDARDS } from '../constants';
import { Rating, AssessmentLevel, EvaluationOutcome, InterviewEvaluation } from '../types';

interface Props {
  candidateEmail: string;
  candidateName: string;
  organizationId?: string;
  candidateId?: string;
  onClose: () => void;
  onSubmit: (evaluation: InterviewEvaluation) => void;
}

import { apiService } from '../services/api';

export const InterviewEvaluationView: React.FC<Props> = ({ candidateEmail, candidateName, organizationId, candidateId, onClose, onSubmit }) => {
  const [level, setLevel] = useState<AssessmentLevel>('L4');
  const [interviewerName, setInterviewerName] = useState('');
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [finalOutcome, setFinalOutcome] = useState<EvaluationOutcome | null>(null);
  const [finalComments, setFinalComments] = useState('');

  // AI Regeneration State
  const [customQuestions, setCustomQuestions] = useState<Record<string, string[]>>({});
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  useEffect(() => {
    const loadEvaluation = async () => {
      // Use candidateId if available, otherwise email (legacy/fallback)
      const lookupKey = candidateId || candidateEmail;
      const existing = await apiService.getEvaluation(lookupKey, organizationId);
      if (existing) {
        setLevel(existing.level);
        setInterviewerName(existing.interviewerName);
        setRatings(existing.ratings);
        setNotes(existing.notes || {});
        setFinalOutcome(existing.finalOutcome);
        setFinalComments(existing.finalComments || '');
      }
    };
    loadEvaluation();
  }, [candidateEmail]);

  const handleRating = (standardId: string, rating: Rating) => {
    setRatings(prev => ({ ...prev, [standardId]: rating }));
  };

  const handleNote = (standardId: string, text: string) => {
    setNotes(prev => ({ ...prev, [standardId]: text }));
  };

  const isFormComplete = interviewerName && finalOutcome && Object.keys(ratings).length === LEADERSHIP_STANDARDS.length;

  const handleSubmit = () => {
    if (!isFormComplete) return;
    const evalData: InterviewEvaluation = {
      id: `eval_${Date.now()}`,
      candidateEmail,
      interviewerName,
      level,
      ratings,
      notes,
      finalOutcome,
      finalComments,
      submittedAt: new Date().toISOString(),
      organizationId: organizationId
    };
    onSubmit(evalData);
  };

  const handleRegenerateQuestions = async (standard: typeof LEADERSHIP_STANDARDS[0]) => {
    setGeneratingFor(standard.id);
    try {
      const newQuestions = await apiService.generateProbeQuestions(standard.title, level, standard.positives);
      setCustomQuestions(prev => ({
        ...prev,
        [standard.id]: newQuestions
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingFor(null);
    }
  };

  return (
    <div className="bg-[#002b49] min-h-screen text-white pb-32">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-white/10 pb-10 gap-6">
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Interview Toolkit</h1>
            <p className="text-[#d4af37] font-bold uppercase tracking-[0.4em] text-[10px] mt-4">Candidate Capability Assessment</p>
          </div>
          <button onClick={onClose} className="bg-white/5 border border-white/10 px-8 py-3 rounded-xl text-white/60 hover:text-white font-black uppercase text-[10px] tracking-widest transition-all">Discard Changes</button>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest mb-6">Subject Identity</h3>
            <div className="space-y-2">
              <div className="text-3xl font-black leading-tight">{candidateName}</div>
              <div className="text-white/40 font-mono text-sm tracking-tight">{candidateEmail}</div>
            </div>
          </div>
          <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest mb-6">Panel Configuration</h3>
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setLevel('L4')}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] tracking-widest transition-all ${level === 'L4' ? 'bg-[#d4af37] text-[#002b49] shadow-lg shadow-[#d4af37]/20' : 'bg-white/5 text-white/50 border border-white/10'}`}
              >L4 GRADE</button>
              <button
                onClick={() => setLevel('L5-L7')}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] tracking-widest transition-all ${level === 'L5-L7' ? 'bg-[#d4af37] text-[#002b49] shadow-lg shadow-[#d4af37]/20' : 'bg-white/5 text-white/50 border border-white/10'}`}
              >L5-L7 GRADE</button>
            </div>
            <input
              placeholder="Primary Interviewer Name"
              value={interviewerName}
              onChange={e => setInterviewerName(e.target.value)}
              className="w-full bg-white border-2 border-[#d4af37]/30 text-slate-900 placeholder-slate-300 rounded-xl p-4 outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] font-bold transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-16">
          {LEADERSHIP_STANDARDS.map(standard => (
            <div key={standard.id} className="bg-white rounded-[40px] overflow-hidden shadow-2xl border border-white/10">
              <div className="bg-[#002b49] p-10 border-b border-white/5">
                <h2 className="text-3xl font-black uppercase mb-2 text-white leading-none">{standard.title}</h2>
                <p className="text-[#d4af37] text-[11px] font-bold uppercase tracking-widest">{standard.subtitle}</p>
              </div>

              <div className="p-10 text-slate-900 grid lg:grid-cols-3 gap-10">
                <div className="space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-[10px]">↑</span> Positive Indicators
                    </h4>
                    <ul className="text-[11px] space-y-3 font-medium text-slate-500 leading-relaxed">
                      {standard.positives.map((p, i) => <li key={i} className="flex items-start gap-2"><span>•</span> {p}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-[10px]">↓</span> Critical Watch Outs
                    </h4>
                    <ul className="text-[11px] space-y-3 font-medium text-slate-400 leading-relaxed">
                      {standard.watchOuts.map((w, i) => <li key={i} className="flex items-start gap-2"><span>•</span> {w}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Probe Questions ({level})</h4>
                    <button
                      onClick={() => handleRegenerateQuestions(standard)}
                      disabled={generatingFor === standard.id}
                      className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-200 transition-all disabled:opacity-50"
                    >
                      {generatingFor === standard.id ? (
                        <span className="animate-spin text-lg">⟳</span>
                      ) : (
                        <span className="text-lg">✨</span>
                      )}
                      {generatingFor === standard.id ? 'Thinking...' : 'Regen'}
                    </button>
                  </div>
                  <div className="space-y-6 min-h-[120px]">
                    {(customQuestions[standard.id] || standard.questions[level]).map((q, i) => (
                      <p key={i} className={`text-xs font-semibold italic text-slate-700 leading-relaxed border-l-3 pl-4 animate-in fade-in duration-500 ${customQuestions[standard.id] ? 'border-indigo-400 bg-indigo-50/50 p-2 rounded-r-lg' : 'border-indigo-200'}`}>
                        {q}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Evidence Level</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {(['Strong Evidence', 'Good Evidence', 'Limited Evidence', 'No Evidence'] as Rating[]).map(r => (
                        <button
                          key={r}
                          onClick={() => handleRating(standard.id, r)}
                          className={`text-left px-5 py-4 rounded-2xl border-2 font-black text-[11px] uppercase tracking-wider transition-all ${ratings[standard.id] === r
                            ? 'border-[#002b49] bg-indigo-50 text-[#002b49] ring-4 ring-indigo-50'
                            : 'border-slate-50 hover:border-slate-100 text-slate-400 bg-white'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full border-2 ${ratings[standard.id] === r ? 'border-[#002b49] bg-[#002b49]' : 'border-slate-200'}`}></div>
                            {r}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Contextual Evidence</h4>
                    <textarea
                      placeholder="Enter specific behavioral examples here..."
                      value={notes[standard.id] || ''}
                      onChange={e => handleNote(standard.id, e.target.value)}
                      className="w-full flex-1 p-5 bg-white text-slate-900 border border-slate-200 rounded-3xl resize-none outline-none focus:ring-4 focus:ring-indigo-100 placeholder-slate-300 text-xs font-medium leading-relaxed shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-24 bg-white rounded-[40px] p-12 text-slate-900 border-8 border-[#d4af37] shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl font-black uppercase mb-10 flex items-center gap-5 tracking-tighter leading-none">
              <span className="w-14 h-14 bg-[#002b49] text-[#d4af37] rounded-2xl flex items-center justify-center text-2xl shadow-lg">✓</span>
              Final Hiring Decision
            </h2>
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 block">Recommendation</label>
                <div className="grid gap-4">
                  {(['Decline', 'Progress to next stage', 'Offer'] as EvaluationOutcome[]).map(o => (
                    <button
                      key={o}
                      onClick={() => setFinalOutcome(o)}
                      className={`text-left p-5 rounded-2xl border-2 font-black uppercase text-xs tracking-widest transition-all bg-white ${finalOutcome === o
                        ? o === 'Decline' ? 'bg-red-50 border-red-500 text-red-700' :
                          o === 'Offer' ? 'bg-green-50 border-green-500 text-green-700' :
                            'bg-amber-50 border-amber-500 text-amber-700'
                        : 'border-slate-100 hover:border-slate-200 text-slate-400 shadow-sm'
                        }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 block">Executive Summary</label>
                <textarea
                  placeholder="Summarize key strengths and alignment to Organization culture..."
                  value={finalComments}
                  onChange={e => setFinalComments(e.target.value)}
                  className="w-full flex-1 p-8 bg-white text-slate-900 border border-slate-200 rounded-[32px] outline-none focus:border-[#002b49] placeholder-slate-300 text-sm font-medium leading-relaxed shadow-sm"
                />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!isFormComplete}
              className={`w-full mt-12 py-8 rounded-3xl font-black uppercase tracking-[0.3em] text-lg shadow-2xl transition-all ${isFormComplete ? 'bg-[#002b49] text-white hover:scale-[1.01] hover:bg-slate-900 shadow-[#002b49]/20' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                }`}
            >
              Complete Evaluation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
