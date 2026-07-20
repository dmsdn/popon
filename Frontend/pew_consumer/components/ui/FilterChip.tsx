"use client";
import { useState } from "react";

export function FilterChip({ options }: { options: string[] }) {
  const [selected, setSelected] = useState(options[0]);

  return (
    <div className="flex gap-2 mb-3">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => setSelected(opt)}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            selected === opt
              ? "border-gray-800 text-gray-800 font-medium"
              : "border-gray-200 text-gray-500"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}