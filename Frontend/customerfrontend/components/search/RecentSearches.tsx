// components/search/RecentSearches.tsx
"use client";
import { useState } from "react";

const initialRecent = ["더현대", "홍대", "나이키"];

export function RecentSearches() {
  const [recent, setRecent] = useState(initialRecent);

  if (recent.length === 0) {
    return (
      <div className="px-4 py-3">
        <p className="text-sm text-gray-400">최근 검색어가 없어요</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">최근 검색어</span>
        <button onClick={() => setRecent([])} className="text-xs text-gray-400">
          비우기
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map((keyword) => (
          <span
            key={keyword}
            className="text-sm text-gray-600 border border-gray-200 rounded-full px-3 py-1.5"
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}