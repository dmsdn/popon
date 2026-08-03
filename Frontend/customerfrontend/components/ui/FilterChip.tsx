"use client";

// 선택 가능한 칩(알약 모양 버튼) 컴포넌트.
import { useState } from "react";

export function FilterChip({ options }: { options: string[] }) {
  const [selected, setSelected] = useState(options[0]);

  return (
    <div className="flex gap-2 mb-3">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => setSelected(opt)}
          className={`text-sm px-3 py-1.5 rounded-full border ${
            selected === opt
              ? "border-gray-800 dark:border-white text-gray-800 dark:text-white font-medium"
              : "border-gray-200 dark:border-[#282B32] text-gray-500"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}