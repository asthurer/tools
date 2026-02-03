import React from 'react';

interface NavigationProps {
  currentStep: number;
  setStep: (step: number) => void;
  canProceed: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ currentStep, setStep, canProceed }) => {
  const steps = [
    { id: 0, label: 'INTRODUCTION' },
    { id: 1, label: 'POTENTIAL ASSESSMENT' },
    { id: 2, label: 'POTENTIAL INDICATOR' }
  ];

  return (
    <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 h-16 items-center">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = step.id < currentStep;
            
            return (
              <button
                key={step.id}
                onClick={() => {
                   if (step.id < currentStep || canProceed) {
                       setStep(step.id);
                   }
                }}
                disabled={!isCompleted && !isActive && !canProceed && step.id !== 0}
                className={`
                  relative h-full flex items-center text-sm font-medium transition-colors duration-200
                  ${isActive 
                    ? 'text-black border-b-2 border-black' 
                    : 'text-gray-500 hover:text-gray-700'
                  }
                  ${(step.id > currentStep && !canProceed) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {step.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};