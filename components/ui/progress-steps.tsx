import React from 'react';

interface ProgressStepsProps {
  steps: number;
  currentStep: number;
  colorScheme?: 'purple' | 'green' | 'blue';
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  steps,
  currentStep,
  colorScheme = 'purple',
}) => {
  const activeColor = 'bg-primary';

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center">
        {Array.from({ length: steps }).map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber <= currentStep;
          
          return (
            <React.Fragment key={stepNumber}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive ? `${activeColor} text-white` : 'bg-gray-300 text-gray-600'
                }`}
              >
                {stepNumber}
              </div>
              {stepNumber < steps && (
                <div
                  className={`w-16 h-1 ${
                    stepNumber < currentStep ? activeColor : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
