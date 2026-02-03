
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Question, AnswerDetail, OptionKey } from '../types';
import { Timer } from './Timer';

interface ExamViewProps {
  questions: Question[];
  onFinish: (answers: AnswerDetail[], totalTime: number) => void;
  onCancel: () => void;
  overallTimeLimitSec?: number;
  questionTimeLimitSec?: number;
}

export const ExamView: React.FC<ExamViewProps> = ({ 
  questions, 
  onFinish, 
  onCancel,
  overallTimeLimitSec = 1200,
  questionTimeLimitSec = 60
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [overallRemaining, setOverallRemaining] = useState(overallTimeLimitSec);
  const [questionRemaining, setQuestionRemaining] = useState(questionTimeLimitSec);
  
  const startTimeRef = useRef<number>(Date.now());
  const questionStartTimeRef = useRef<number>(Date.now());

  const currentQuestion = questions[currentIndex];

  // Calculate dynamic section metrics
  const sectionMetrics = useMemo(() => {
    const categories: string[] = [];
    questions.forEach(q => {
      if (categories.length === 0 || categories[categories.length - 1] !== q.category) {
        categories.push(q.category);
      }
    });
    
    // Find current category index in the list of unique category blocks
    const currentCategory = questions[currentIndex].category;
    let sectionIdx = 0;
    let runningCategory = "";
    for (let i = 0; i <= currentIndex; i++) {
        if (questions[i].category !== runningCategory) {
            runningCategory = questions[i].category;
            if (i > 0) sectionIdx++;
        }
    }

    return {
      currentSection: sectionIdx + 1,
      totalSections: categories.length
    };
  }, [questions, currentIndex]);

  const handleNext = useCallback((isTimeout = false, isOverallTimeout = false) => {
    const timeSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    const status = isOverallTimeout ? 'AUTO_MISSED_OVERALL_TIMEOUT' : (isTimeout || !selectedOption ? 'MISSED' : 'ANSWERED');
    
    const newAnswer: AnswerDetail = {
      questionId: currentQuestion.id,
      selectedOption: isTimeout || isOverallTimeout ? null : selectedOption,
      isCorrect: (isTimeout || isOverallTimeout || !selectedOption) ? false : selectedOption === currentQuestion.correctOption,
      timeSpentSec: Math.min(timeSpent, questionTimeLimitSec),
      status,
      questionIndex: currentIndex + 1
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    if (currentIndex < questions.length - 1 && !isOverallTimeout) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setQuestionRemaining(questionTimeLimitSec);
      questionStartTimeRef.current = Date.now();
    } else {
      const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (isOverallTimeout) {
        const remainingCount = questions.length - updatedAnswers.length;
        for (let i = 0; i < remainingCount; i++) {
          const nextQ = questions[currentIndex + 1 + i];
          if (nextQ) {
            updatedAnswers.push({
              questionId: nextQ.id,
              selectedOption: null,
              isCorrect: false,
              timeSpentSec: 0,
              status: 'AUTO_MISSED_OVERALL_TIMEOUT',
              questionIndex: currentIndex + 2 + i
            });
          }
        }
      }
      onFinish(updatedAnswers, totalTime);
    }
  }, [currentIndex, questions, selectedOption, answers, onFinish, currentQuestion, questionTimeLimitSec]);

  useEffect(() => {
    const timer = setInterval(() => {
      setOverallRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleNext(false, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleNext]);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuestionRemaining(prev => {
        if (prev <= 1) {
          handleNext(true);
          return questionTimeLimitSec;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleNext, currentIndex, questionTimeLimitSec]);

  const handleCancelClick = () => {
    if (window.confirm("Are you sure you want to cancel the exam? All progress will be lost.")) {
      onCancel();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 sticky top-0 bg-slate-50 py-4 z-10 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold">
            Question {currentIndex + 1} / {questions.length}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                Section {sectionMetrics.currentSection} of {sectionMetrics.totalSections}
            </span>
            <h1 className="text-lg font-bold text-slate-800">{currentQuestion.category}</h1>
          </div>
        </div>
        <div className="flex gap-4">
          <Timer label="Per Question" seconds={questionRemaining} isUrgent={questionRemaining < 10} />
          <Timer label="Total Remaining" seconds={overallRemaining} isUrgent={overallRemaining < 120} />
        </div>
      </div>

      <div className="w-full bg-slate-200 h-2 rounded-full mb-8 overflow-hidden">
        <div 
          className="bg-indigo-600 h-full transition-all duration-500 ease-out" 
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/20 border border-slate-100 p-8 mb-8">
        <p className="text-xl font-medium text-slate-800 mb-8 leading-relaxed">
          {currentQuestion.text}
        </p>
        
        <div className="grid gap-4">
          {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedOption(key)}
              className={`group flex items-center w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedOption === key 
                ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50' 
                : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-lg mr-4 transition-colors ${
                selectedOption === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
              }`}>
                {key}
              </div>
              <span className={`text-lg ${selectedOption === key ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}>
                {currentQuestion.options[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={handleCancelClick}
          className="px-6 py-4 rounded-xl font-bold text-sm text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
        >
          Cancel Exam
        </button>
        <button
          onClick={() => handleNext()}
          disabled={!selectedOption}
          className={`px-10 py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 ${
            selectedOption 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700' 
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {currentIndex === questions.length - 1 ? 'Finish Exam' : 'Submit Answer & Next'}
        </button>
      </div>
    </div>
  );
};
