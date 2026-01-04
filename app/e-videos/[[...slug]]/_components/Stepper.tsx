type StepperProps = {
  steps: string[];
  currentStep: number;
};

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2">
      {steps.map((label, index) => {
        const active = index === currentStep;
        const done = index < currentStep;

        return (
          <div key={index} className="flex items-center gap-2 shrink-0">
            <div
              className={`
                h-8 w-8 rounded-full flex items-center justify-center
                text-xs font-semibold
                ${
                  done
                    ? "bg-[#d18b47] text-white"
                    : active
                    ? "border-2 border-[#d18b47] text-[#d18b47]"
                    : "border border-gray-300 text-gray-400"
                }
              `}
            >
              {done ? "✓" : index + 1}
            </div>

            <span
              className={`text-xs ${
                active ? "text-gray-900 font-semibold" : "text-gray-500"
              }`}
            >
              {label}
            </span>

            {index < steps.length - 1 && (
              <div className="w-6 h-px bg-gray-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}
