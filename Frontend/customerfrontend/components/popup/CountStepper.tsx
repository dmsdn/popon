"use client";

interface CountStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function CountStepper({ value, onChange, min = 1, max = 10 }: CountStepperProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="인원 줄이기"
        className="w-8 h-8 rounded-full border border-gray-300 dark:border-[#282B32] flex items-center justify-center text-gray-600 dark:text-gray-400 disabled:opacity-30"
      >
        −
      </button>
      <span className="text-sm font-medium w-4 text-center">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="인원 늘리기"
        className="w-8 h-8 rounded-full border border-gray-300 dark:border-[#282B32] flex items-center justify-center text-gray-600 dark:text-gray-400 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}