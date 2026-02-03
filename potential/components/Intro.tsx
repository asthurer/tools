import React from 'react';
import { APP_CONTENT } from '../constants';
import { SCORING_SCALE, AssessmentMetadata } from '../types';

interface IntroProps {
  onStart: () => void;
  metadata: AssessmentMetadata;
  setMetadata: (data: AssessmentMetadata) => void;
}

export const Intro: React.FC<IntroProps> = ({ onStart, metadata, setMetadata }) => {
  
  const handleChange = (field: keyof AssessmentMetadata, value: string) => {
    setMetadata({
      ...metadata,
      [field]: value
    });
  };

  const isFormValid = metadata.candidateName.trim().length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-12">
        
        {/* Left Content */}
        <div className="flex-1 space-y-8">
          <div>
            <h1 className="text-5xl text-black serif-font mb-2">
              Assessing <span className="italic font-light">Potential</span>
            </h1>
            <div className="h-1 w-20 bg-black mb-6"></div>
          </div>

          {/* User Input Section */}
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg space-y-4 shadow-sm">
             <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-2">Assessment Details</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Candidate Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={metadata.candidateName}
                    onChange={(e) => handleChange('candidateName', e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full bg-white text-gray-900 placeholder-gray-400 rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Assessor Name</label>
                  <input 
                    type="text" 
                    value={metadata.assessorName}
                    onChange={(e) => handleChange('assessorName', e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-white text-gray-900 placeholder-gray-400 rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm p-2 border"
                  />
                </div>
             </div>
             {!isFormValid && (
               <p className="text-xs text-red-600 italic">Please enter a candidate name to begin.</p>
             )}
          </div>

          <div className="space-y-4 text-gray-800 leading-relaxed text-sm lg:text-base">
            <p className="font-bold text-lg">
              {APP_CONTENT.introText[0]}
            </p>
            <p>{APP_CONTENT.introText[1]}</p>
            <p>{APP_CONTENT.introText[2]}</p>
            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-800">
              <span className="font-bold block mb-1">How to use the tool:</span>
              <span>{APP_CONTENT.introText[3]}</span>
            </div>
          </div>

          {/* Scoring Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 text-white font-bold text-center text-sm">
            {SCORING_SCALE.map((scale) => (
              <div key={scale.value} className={`${scale.color} py-4 px-2 flex items-center justify-center`}>
                {scale.label}
              </div>
            ))}
          </div>
          
          <div className="text-xs text-gray-500 mt-2 italic">
            When completing this, you should consider whether an individual is demonstrating these behaviors in multiple work situations and over a sustained period - ideally 12 months and a minimum of 6 months is recommended.
          </div>

          <div className="pt-4">
             <button 
                onClick={onStart}
                disabled={!isFormValid}
                className={`
                  px-8 py-3 rounded-full font-medium transition-all flex items-center gap-2
                  ${isFormValid ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                `}
             >
                Start Assessment
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
             </button>
          </div>
        </div>

        {/* Right Image Placeholder */}
        <div className="w-full lg:w-1/3 min-h-[400px] relative rounded-xl overflow-hidden shadow-2xl hidden md:block">
            <img 
                src="https://picsum.photos/800/1200" 
                alt="Colleagues discussing" 
                className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        </div>
      </div>
    </div>
  );
};