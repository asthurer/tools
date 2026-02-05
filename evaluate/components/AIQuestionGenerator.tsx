
import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Question, Category, Difficulty, OptionKey } from '../types';

interface Props {
  existingCategories: string[];
  onSaveQuestions: (questions: Question[]) => void;
  onClose: () => void;
}

export const AIQuestionGenerator: React.FC<Props> = ({ existingCategories, onSaveQuestions, onClose }) => {
  const [category, setCategory] = useState(existingCategories[0] || 'General');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<Question[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    const finalCategory = isCustomCategory ? customCategory.trim() : category;
    if (isCustomCategory && !finalCategory) {
      alert("Please enter a custom category name.");
      return;
    }

    setLoading(true);
    setGenerated([]);
    setSelectedIndices(new Set());

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (!apiKey) throw new Error("API Key configuration missing.");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `Generate exactly 5 distinct and professional multiple-choice questions for a corporate technical assessment.
          Category: ${finalCategory}
          Difficulty Level: ${difficulty}
          Context: Evaluate.ai, Analytics, and Engineering roles. Ensure options are plausible but only one is clearly correct.
          
          Return the response as a valid JSON array of objects with the following structure:
          [
            {
              "text": "Question text here",
              "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
              "correctOption": "A"
            }
          ]
          Do not include markdown formatting like \`\`\`json. Return raw JSON only.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let textOutput = response.text();

      if (!textOutput) throw new Error("No content generated.");

      // Cleanup if model returns markdown
      textOutput = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();

      const json = JSON.parse(textOutput);
      if (!Array.isArray(json)) throw new Error("Invalid response format.");

      const formatted: Question[] = json.map((q: any, i: number) => ({
        id: `ai_${Date.now()}_${i}`,
        category: finalCategory,
        difficulty: difficulty,
        text: q.text,
        options: q.options,
        correctOption: (q.correctOption || 'A').toUpperCase() as OptionKey,
        isActive: true
      }));

      setGenerated(formatted);
      setSelectedIndices(new Set(formatted.map((_, i) => i)));
    } catch (err: any) {
      console.error("AI Error:", err);
      alert(`AI Architect failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIndices(next);
  };

  const handleAddSelected = () => {
    const toAdd = generated.filter((_, i) => selectedIndices.has(i));
    onSaveQuestions(toAdd);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
      <div className="bg-white w-full max-w-4xl rounded-[40px] p-10 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-black text-[#002b49] uppercase tracking-tighter leading-none">AI Question Architect</h2>
            <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.4em] mt-3">Synthesizing Data Integrity via Gemini 3 Pro</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-end bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Topic Domain</label>
              <button
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
              >
                {isCustomCategory ? 'Use Existing' : 'Define New'}
              </button>
            </div>
            {isCustomCategory ? (
              <input
                placeholder="Custom Domain Name"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                className="p-4 bg-white border-2 border-indigo-50 rounded-2xl font-bold outline-none shadow-sm focus:border-indigo-400"
              />
            ) : (
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold outline-none cursor-pointer"
              >
                {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Difficulty Grade</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as Difficulty)}
              className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold outline-none cursor-pointer"
            >
              <option value="Easy">Foundational (Easy)</option>
              <option value="Medium">Professional (Medium)</option>
              <option value="Hard">Expert (Hard)</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-[#002b49] text-[#d4af37] p-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#002b49]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 h-[62px]"
          >
            {loading ? 'Processing Neural Model...' : 'Initiate Synthesis'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-4 space-y-6 custom-scrollbar min-h-[300px]">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] animate-pulse">Calculating Probabilities...</p>
            </div>
          )}

          {!loading && generated.length === 0 && (
            <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[40px] text-slate-200">
              <div className="text-4xl mb-4 opacity-20">🧬</div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em]">Configure parameters and initiate synthesis</p>
            </div>
          )}

          {generated.map((q, i) => (
            <div
              key={i}
              onClick={() => toggleSelection(i)}
              className={`p-8 rounded-[32px] border-2 cursor-pointer transition-all ${selectedIndices.has(i)
                ? 'bg-white border-indigo-600 shadow-xl ring-8 ring-indigo-50/30'
                : 'bg-slate-50 border-transparent hover:border-slate-200'
                }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest mb-2 block">Proposed Entry {i + 1}</span>
                  <p className="text-lg font-bold text-slate-900 leading-tight">{q.text}</p>
                </div>
                <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${selectedIndices.has(i) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-transparent'
                  }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['A', 'B', 'C', 'D'] as OptionKey[]).map(key => (
                  <div key={key} className={`p-3 rounded-xl border text-[11px] font-bold flex items-center gap-3 ${q.correctOption === key ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-100 text-slate-500'}`}>
                    <span className={`w-6 h-6 flex items-center justify-center rounded-lg font-black shrink-0 ${q.correctOption === key ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{key}</span>
                    <span className="truncate">{q.options[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {generated.length > 0 && (
          <div className="mt-8 pt-8 border-t flex justify-between items-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Queueing <span className="text-indigo-600">{selectedIndices.size}</span> selections for deployment
            </p>
            <div className="flex gap-4">
              <button onClick={onClose} className="px-8 py-4 font-black uppercase text-[10px] text-slate-400 tracking-widest hover:text-slate-900 transition-colors">Abort</button>
              <button
                onClick={handleAddSelected}
                disabled={selectedIndices.size === 0}
                className="bg-[#002b49] text-[#d4af37] px-12 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >Commit to Bank</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
