import React, { useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { Scores, SCORING_SCALE, AssessmentMetadata, Comments } from '../types';
import { TRAITS, GOOGLE_CONFIG, VERDICT_RANGES, getVerdict } from '../constants';
import { saveAssessmentToSheet } from '../googleApi';
import { generateAndDownloadXLS } from '../xlsExport';

interface ResultsProps {
  scores: Scores;
  comments: Comments;
  metadata: AssessmentMetadata;
}

// Define distinct visual themes for each category
const CATEGORY_THEMES: Record<string, { text: string, bg: string, border: string, fill: string, hex: string }> = {
  'INTELLECTUAL QUALITIES': { 
      text: 'text-sky-600', 
      bg: 'bg-sky-50', 
      border: 'border-sky-500', 
      fill: 'fill-sky-500',
      hex: '#0284c7' 
  },
  'EMOTIONAL QUALITIES': { 
      text: 'text-fuchsia-600', 
      bg: 'bg-fuchsia-50', 
      border: 'border-fuchsia-500', 
      fill: 'fill-fuchsia-500',
      hex: '#c026d3' 
  },
  'SOCIAL QUALITIES': { 
      text: 'text-amber-500', 
      bg: 'bg-amber-50', 
      border: 'border-amber-500', 
      fill: 'fill-amber-500',
      hex: '#f59e0b' 
  }
};

export const Results: React.FC<ResultsProps> = ({ scores, comments, metadata }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate Aggregates
  const categoryScores = React.useMemo(() => {
    const cats: Record<string, { total: number, max: number, count: number }> = {
      'INTELLECTUAL QUALITIES': { total: 0, max: 0, count: 0 },
      'EMOTIONAL QUALITIES': { total: 0, max: 0, count: 0 },
      'SOCIAL QUALITIES': { total: 0, max: 0, count: 0 },
    };

    TRAITS.forEach(t => {
      const score = (scores[t.id] as number) || 0;
      if (cats[t.category]) {
        cats[t.category].total += score;
        cats[t.category].max += 4;
        cats[t.category].count += 1;
      }
    });

    return Object.entries(cats).map(([key, val]) => ({
      category: key,
      categoryShort: key.split(' ')[0], // "INTELLECTUAL", etc.
      score: val.total,
      max: val.max,
      percentage: val.max > 0 ? (val.total / val.max) * 100 : 0,
      average: val.count > 0 ? val.total / val.count : 0
    }));
  }, [scores]);

  const totalScore = Object.values(scores).reduce<number>((a, b) => a + (b as number), 0);
  const maxTotalScore = TRAITS.length * 4;
  const currentVerdict = getVerdict(totalScore);

  // --- Circular Chart Calculations ---
  const radius = 56;
  const circumference = 2 * Math.PI * radius; // ~351.86
  let accumulatedLength = 0;

  // Create segments for the doughnut chart
  const chartSegments = categoryScores.map((cat) => {
    // Determine the length of this segment based on its contribution to the TOTAL POSSIBLE score (48)
    // or based on the total circle? Usually a score of 48 fills the circle.
    // So segment length = (score / 48) * C
    const rawLength = (cat.score / maxTotalScore) * circumference;
    
    const segment = {
      ...cat,
      strokeDasharray: `${rawLength} ${circumference - rawLength}`,
      strokeDashoffset: -accumulatedLength, // Negative to stack clockwise
      color: CATEGORY_THEMES[cat.category]?.text || 'text-gray-500',
      fillColor: CATEGORY_THEMES[cat.category]?.fill || 'fill-gray-500'
    };
    
    accumulatedLength += rawLength;
    return segment;
  });

  // Data for Radar Chart
  const radarData = categoryScores.map(c => ({
    subject: c.categoryShort,
    A: c.percentage,
    fullMark: 100,
  }));

  // Data for Bar Chart (Trait Breakdown)
  const traitData = TRAITS.map(t => ({
    name: t.name,
    score: scores[t.id] || 0,
    category: t.category
  }));

  const getScoreHex = (val: number) => {
     if(val === 1) return '#b91c1c'; // red-700
     if(val === 2) return '#f97316'; // orange-500
     if(val === 3) return '#06b6d4'; // cyan-500
     return '#16a34a'; // green-600
  };

  const handleSaveToGoogle = async () => {
    // Check if gapi is loaded
    if (typeof (window as any).gapi === 'undefined') {
      setSaveStatus('error');
      setErrorMessage('Google Scripts not loaded. Please disable ad-blockers and refresh.');
      return;
    }

    if (GOOGLE_CONFIG.CLIENT_ID.includes('YOUR_CLIENT_ID')) {
      alert('Please configure the GOOGLE_CONFIG in constants.ts with your Client ID and API Key to enable Sheets integration.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      await saveAssessmentToSheet(metadata, scores, comments, currentVerdict);
      setSaveStatus('success');
    } catch (error: any) {
      console.error(error);
      setSaveStatus('error');
      setErrorMessage(error?.result?.error?.message || error?.message || 'Failed to save to Google Sheets');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDownloadXLS = () => {
      try {
          generateAndDownloadXLS(metadata, scores, comments, categoryScores, currentVerdict);
      } catch (e) {
          console.error("Error generating XLS", e);
          alert("Could not generate Excel file. Please try printing instead.");
      }
  };

  // Helper to render bold text from markdown-like **bold** string
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={index} className="font-bold">{part.slice(2, -2)}</span>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-20 bg-gray-50 min-h-screen">
      
      <div className="mb-10 text-center relative break-inside-avoid">
        <h2 className="text-4xl serif-font mb-2">Potential Indicator</h2>
        <p className="text-gray-600">Results for <span className="font-bold text-gray-900">{metadata.candidateName}</span></p>
        <p className="text-sm text-gray-500">{metadata.date} {metadata.assessorName ? `• Assessed by ${metadata.assessorName}` : ''}</p>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 break-inside-avoid">
        {/* Overall Score with Segmented Doughnut */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center border-t-4 border-gray-800 break-inside-avoid">
           <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Overall Potential Score</h3>
           
           {/* Segmented Doughnut Chart */}
           <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Track */}
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                
                {/* Segments */}
                {chartSegments.map((segment) => (
                    <circle 
                        key={segment.category}
                        cx="64" cy="64" r="56" 
                        stroke="currentColor" strokeWidth="8" fill="transparent" 
                        className={`${segment.color} transition-all duration-1000 ease-out`} 
                        strokeDasharray={segment.strokeDasharray} 
                        strokeDashoffset={segment.strokeDashoffset} 
                        strokeLinecap="butt"
                    />
                ))}
              </svg>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                 <span className="text-4xl font-bold text-gray-800">{totalScore}</span>
                 <span className="text-xs text-gray-400 block font-medium">/ {maxTotalScore}</span>
              </div>
           </div>

           {/* Legend for Chart */}
           <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-6 px-2">
               {categoryScores.map(cat => (
                   <div key={cat.category} className="flex items-center gap-1">
                       <div className={`w-2 h-2 rounded-full ${CATEGORY_THEMES[cat.category].bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                       <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">{cat.categoryShort}</span>
                   </div>
               ))}
           </div>

           <p className="mt-4 text-center text-sm font-bold text-gray-800 px-4">
             {currentVerdict.title}
           </p>
        </div>

        {/* Radar Chart */}
        <div className="bg-white rounded-xl shadow-lg p-4 col-span-1 md:col-span-2 border-t-4 border-blue-600 break-inside-avoid">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 ml-4">Balance of Qualities</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="Potential"
                        dataKey="A"
                        stroke="#2563eb"
                        strokeWidth={3}
                        fill="#3b82f6"
                        fillOpacity={0.5}
                    />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Verdict Section */}
      <div className="mb-12 break-inside-avoid">
        {/* What This Means (Verdict Table) */}
        <div className="bg-green-50/50 rounded-xl p-6 border border-green-100">
           <h3 className="font-bold text-lg mb-4 text-gray-900 border-b border-gray-200 pb-2">WHAT THIS MEANS</h3>
           <div className="space-y-4">
              {VERDICT_RANGES.map((range, index) => {
                 const isActive = range.title === currentVerdict.title;
                 return (
                    <div 
                      key={index} 
                      className={`flex gap-4 p-4 rounded-lg transition-all ${isActive ? 'bg-white shadow-md border-l-4 border-green-600' : 'opacity-70 grayscale-[0.5]'}`}
                    >
                       <div className="flex-none w-16 text-center">
                          {/* Icons based on range index/score */}
                          {index === 0 && (
                            <div className="text-3xl mb-1">🚀</div>
                          )}
                          {index === 1 && (
                             <div className="text-3xl mb-1">🌳</div>
                          )}
                          {index === 2 && (
                             <div className="text-3xl mb-1">🌱</div>
                          )}
                       </div>
                       <div>
                          <p className="text-sm text-gray-800 leading-relaxed">
                            {renderFormattedText(range.description)}
                          </p>
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>
      </div>

      {/* Detailed Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {categoryScores.map((cat) => {
             const theme = CATEGORY_THEMES[cat.category];
             return (
                 <div key={cat.category} className="bg-white rounded-xl shadow-md overflow-hidden break-inside-avoid flex flex-col h-full">
                     {/* Colored Header */}
                     <div className={`${theme.bg} px-6 py-4 border-l-4 ${theme.border} border-b border-gray-100`}>
                         <h3 className={`${theme.text} font-bold uppercase text-sm tracking-wider`}>{cat.category}</h3>
                     </div>
                     <div className="p-6 flex-1 flex flex-col">
                         <div className="flex items-end gap-2 mb-6">
                             <span className="text-4xl font-bold text-gray-800">{cat.score}</span>
                             <span className="text-gray-400 mb-1 font-medium">/ {cat.max}</span>
                         </div>
                         
                         <div className="space-y-5">
                             {traitData.filter(t => t.category === cat.category).map(t => (
                                 <div key={t.name}>
                                     <div className="flex justify-between text-xs font-semibold mb-1">
                                         <span className="text-gray-600">{t.name}</span>
                                         <div className="flex items-center gap-2">
                                             <span className={SCORING_SCALE.find(s=>s.value===t.score)?.text}>
                                                 {SCORING_SCALE.find(s=>s.value===t.score)?.label}
                                             </span>
                                             {comments[TRAITS.find(tr=>tr.name===t.name)?.id || ''] && (
                                                <div className="group relative">
                                                    <span className="cursor-help text-gray-400 hover:text-blue-500">💬</span>
                                                    <div className="absolute bottom-full right-0 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg hidden group-hover:block z-50 mb-1">
                                                        {comments[TRAITS.find(tr=>tr.name===t.name)?.id || '']}
                                                    </div>
                                                </div>
                                             )}
                                         </div>
                                     </div>
                                     <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                         <div 
                                            className="h-full transition-all duration-500"
                                            style={{ 
                                                width: `${(t.score / 4) * 100}%`,
                                                backgroundColor: getScoreHex(t.score)
                                            }}
                                         ></div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
             );
         })}
      </div>

      <div className="mt-12 p-6 bg-blue-50 border border-blue-100 rounded-lg text-center no-print">
        <p className="text-blue-800 font-medium mb-4">
            Actions
        </p>
        <div className="flex flex-wrap justify-center items-center gap-4">
            <button 
                onClick={() => window.print()} 
                className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-medium text-sm flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print PDF
            </button>

            <button
                onClick={handleDownloadXLS}
                className="px-6 py-2 bg-white text-green-700 border border-green-600 rounded-full hover:bg-green-50 transition-colors font-medium text-sm flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel Report
            </button>

            <button 
                onClick={handleSaveToGoogle} 
                disabled={isSaving || saveStatus === 'success'}
                className={`
                    px-6 py-2 rounded-full font-medium text-sm flex items-center gap-2 transition-colors border
                    ${saveStatus === 'success' 
                        ? 'bg-green-100 text-green-700 border-green-200 cursor-default'
                        : 'bg-white text-blue-700 border-blue-600 hover:bg-blue-50'
                    }
                `}
            >
                {isSaving ? (
                   <>
                     <svg className="animate-spin h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     Connecting...
                   </>
                ) : saveStatus === 'success' ? (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                     </svg>
                     Saved to Drive
                   </>
                ) : (
                   <>
                     <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4">
                        <path fill="#4CAF50" d="M41,10H25v28h16c0.553,0,1-0.447,1-1V11C42,10.447,41.553,10,41,10z"></path>
                        <path fill="#F1F8E9" d="M17,15h20v4H17V15z M17,23h20v4H17V23z M17,31h20v4H17V31z"></path>
                        <path fill="#2E7D32" d="M15,42h2c1.103,0,2-0.897,2-2V8c0-1.103-0.897-2-2-2h-2c-1.103,0-2,0.897-2,2v32C13,41.103,13.897,42,15,42z"></path>
                        <path fill="#388E3C" d="M15,24l-2,4V11l2,4V24z"></path>
                        <rect x="7" y="18" fill="#4CAF50" width="8" height="2"></rect>
                        <rect x="7" y="28" fill="#4CAF50" width="8" height="2"></rect>
                     </svg>
                     Save to Google Sheets
                   </>
                )}
            </button>
        </div>
        {saveStatus === 'error' && (
             <div className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded inline-block border border-red-200">
               {errorMessage || 'Error saving. Ensure you have allowed popups and signed in.'}
             </div>
        )}
      </div>

    </div>
  );
};