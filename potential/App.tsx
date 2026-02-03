import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { Intro } from './components/Intro';
import { Assessment } from './components/Assessment';
import { Results } from './components/Results';
import { Scores, ScoreValue, Trait, AssessmentMetadata, Comments } from './types';
import { TRAITS } from './constants';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [scores, setScores] = useState<Scores>({});
  const [comments, setComments] = useState<Comments>({});
  
  // Metadata for the person being assessed
  const [metadata, setMetadata] = useState<AssessmentMetadata>({
    candidateName: '',
    assessorName: '',
    date: new Date().toLocaleDateString()
  });

  const handleSetScore = (traitId: string, value: ScoreValue) => {
    setScores(prev => ({
      ...prev,
      [traitId]: value
    }));
  };

  const handleSetComment = (traitId: string, comment: string) => {
    setComments(prev => ({
      ...prev,
      [traitId]: comment
    }));
  };

  const isAssessmentComplete = TRAITS.every(t => scores[t.id] !== undefined);

  const renderContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Intro 
            onStart={() => setCurrentStep(1)} 
            metadata={metadata}
            setMetadata={setMetadata}
          />
        );
      case 1:
        return (
          <Assessment 
            scores={scores} 
            setScore={handleSetScore} 
            comments={comments}
            setComment={handleSetComment}
            onFinish={() => setCurrentStep(2)} 
          />
        );
      case 2:
        return <Results scores={scores} comments={comments} metadata={metadata} />;
      default:
        return (
          <Intro 
            onStart={() => setCurrentStep(1)} 
            metadata={metadata}
            setMetadata={setMetadata}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Navigation 
        currentStep={currentStep} 
        setStep={setCurrentStep} 
        canProceed={isAssessmentComplete}
      />
      <main className="w-full">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;