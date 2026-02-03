import React, { useMemo, useState } from 'react';
import { TRAITS } from '../constants';
import { Scores, ScoreValue, SCORING_SCALE, CategoryType, Trait, Comments } from '../types';

interface AssessmentProps {
  scores: Scores;
  setScore: (traitId: string, value: ScoreValue) => void;
  comments: Comments;
  setComment: (traitId: string, comment: string) => void;
  onFinish: () => void;
}

export const Assessment: React.FC<AssessmentProps> = ({ scores, setScore, comments, setComment, onFinish }) => {
  // State to track which comment popup is open
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // Group traits by category for rendering
  const traitsByCategory = useMemo(() => {
    const grouped: Record<string, Trait[]> = {};
    TRAITS.forEach(trait => {
      if (!grouped[trait.category]) {
        grouped[trait.category] = [];
      }
      grouped[trait.category].push(trait);
    });
    return grouped;
  }, []);

  const isComplete = TRAITS.every(t => scores[t.id] !== undefined);

  return (
    <div className="w-full max-w-7xl mx-auto bg-white min-h-screen pb-20">
      
      {/* Legend Header - Sticky */}
      <div className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row items-end md:items-center justify-between p-4 px-6 gap-4">
          <h2 className="text-4xl serif-font italic text-black hidden md:block">
            Potential Assessment
          </h2>
          <div className="flex-1 w-full md:w-auto">
            <div className="grid grid-cols-4 w-full md:max-w-2xl ml-auto text-xs md:text-sm font-semibold text-white text-center">
              {SCORING_SCALE.map((scale) => (
                <div key={scale.value} className={`${scale.color} py-2 px-1 flex items-center justify-center`}>
                  <span className="hidden sm:inline">{scale.label}</span>
                  <span className="sm:hidden">{scale.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Table Header Columns */}
        <div className="grid grid-cols-[40px_1fr_1.5fr_180px] md:grid-cols-[40px_1fr_1.5fr_300px] bg-green-200/50 text-xs font-bold uppercase tracking-wider text-gray-800 border-y border-green-800/20">
           <div className="p-2"></div>
           <div className="p-3 border-l border-green-800/10">Critical Traits & Behaviours</div>
           <div className="p-3 border-l border-green-800/10">Indicators</div>
           <div className="p-3 border-l border-green-800/10 text-center">Demonstrates This Behaviour...</div>
        </div>
      </div>

      <div className="flex flex-col shadow-sm border-b border-gray-200">
        {Object.keys(traitsByCategory).map((category) => (
          <div key={category} className="flex border-t border-gray-200 first:border-t-0">
            
            {/* Category Sidebar - Continuous Bar */}
            <div className="w-[40px] flex-none bg-lime-100 flex items-center justify-center border-r border-green-800/10">
               <div className="vertical-text text-[10px] md:text-xs font-bold text-green-900 tracking-widest whitespace-nowrap py-4 uppercase">
                  {category}
               </div>
            </div>

            {/* Questions Column */}
            <div className="flex-1 flex flex-col">
              {traitsByCategory[category].map((trait, index) => {
                 const hasComment = comments[trait.id] && comments[trait.id].trim().length > 0;
                 return (
                   <div key={trait.id} className={`
                      grid grid-cols-[1fr_1.5fr_180px] md:grid-cols-[1fr_1.5fr_300px] 
                      ${index !== traitsByCategory[category].length - 1 ? 'border-b border-gray-100' : ''} 
                      ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} 
                      hover:bg-gray-50 transition-colors
                   `}>
                      
                      {/* Trait Name & Desc */}
                      <div className="p-4 md:p-6">
                        <h3 className="font-bold text-gray-900 mb-2 uppercase">{trait.name}</h3>
                        <p className="text-sm text-gray-600 leading-snug">{trait.description}</p>
                      </div>

                      {/* Indicators & Prompt */}
                      <div className="p-4 md:p-6 border-l border-gray-100">
                        <ul className="list-disc pl-4 space-y-1 mb-4 text-sm text-gray-700">
                          {trait.indicators.map((ind, i) => (
                            <li key={i}>{ind}</li>
                          ))}
                        </ul>
                        <p className="text-sm italic text-gray-600 font-serif border-t border-gray-200 pt-2">
                          Prompt: {trait.prompt}
                        </p>
                      </div>

                      {/* Scoring Radio Buttons & Comment Action */}
                      <div className="p-4 flex flex-col items-center justify-center border-l border-gray-100 bg-white/50 relative">
                          <div className="flex justify-between w-full max-w-[240px]">
                              {SCORING_SCALE.map((scale) => {
                                  const isSelected = scores[trait.id] === scale.value;
                                  return (
                                      <button
                                          key={scale.value}
                                          onClick={() => setScore(trait.id, scale.value)}
                                          className={`
                                              group relative w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all duration-200 flex items-center justify-center
                                              focus:outline-none focus:ring-2 focus:ring-offset-2 ${scale.ring}
                                              ${isSelected ? `${scale.color} border-transparent scale-110 shadow-md` : `border-gray-300 hover:border-gray-400 bg-white`}
                                          `}
                                          title={scale.label}
                                      >
                                          {!isSelected && (
                                              <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 opacity-30 ${scale.color.replace('bg-', 'border-')}`}></div>
                                          )}
                                          {isSelected && (
                                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                              </svg>
                                          )}
                                      </button>
                                  )
                              })}
                          </div>

                          {/* Comment Trigger Button */}
                          <div className="relative mt-3 w-full max-w-[240px] flex justify-end">
                            <button 
                                onClick={() => setActiveCommentId(activeCommentId === trait.id ? null : trait.id)}
                                className={`
                                    flex items-center gap-1 text-xs font-medium transition-colors px-2 py-1 rounded-md
                                    ${hasComment ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}
                                `}
                                title="Add comment"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={hasComment ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {hasComment ? 'Edit Comment' : 'Add Comment'}
                            </button>

                            {/* Inline Comment Popup */}
                            {activeCommentId === trait.id && (
                                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-gray-700">Comments</span>
                                        <button onClick={() => setActiveCommentId(null)} className="text-gray-400 hover:text-gray-600">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <textarea
                                        autoFocus
                                        className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] mb-2"
                                        placeholder="Enter your observations..."
                                        value={comments[trait.id] || ''}
                                        onChange={(e) => setComment(trait.id, e.target.value)}
                                    ></textarea>
                                    <div className="flex justify-end">
                                        <button 
                                            onClick={() => setActiveCommentId(null)}
                                            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                                        >
                                            Done
                                        </button>
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45"></div>
                                </div>
                            )}
                          </div>
                      </div>
                   </div>
                 );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Completion Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-end items-center max-w-7xl mx-auto z-50">
           <div className="mr-4 text-sm text-gray-500">
               {Object.keys(scores).length} / {TRAITS.length} rated
           </div>
           <button
             onClick={onFinish}
             disabled={!isComplete}
             className={`
                px-8 py-3 rounded-md font-bold text-white transition-all
                ${isComplete 
                    ? 'bg-green-600 hover:bg-green-700 shadow-lg cursor-pointer transform hover:-translate-y-1' 
                    : 'bg-gray-300 cursor-not-allowed'
                }
             `}
           >
             VIEW RESULTS
           </button>
      </div>
    </div>
  );
};