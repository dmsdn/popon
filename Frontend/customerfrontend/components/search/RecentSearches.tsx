// components/search/RecentSearches.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRecentSearches, removeRecentSearch, clearRecentSearches } from "@/lib/searchHistory";

export function RecentSearches({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [recent, setRecent] = useState<string[]>([]);

  // localStorage는 클라이언트에서만 읽을 수 있어서 마운트 이후에 불러옵니다. (SSR/hydration 불일치 방지)
  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  const handleSearch = (keyword: string) => {
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  const handleRemove = (keyword: string) => {
    removeRecentSearch(keyword);
    setRecent((prev) => prev.filter((k) => k !== keyword));
  };

  const handleClear = () => {
    clearRecentSearches();
    setRecent([]);
  };

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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">최근 검색어</span>
        <button onClick={handleClear} className="text-base text-gray-400">
          비우기
        </button>
      </div>

      <div className="flex flex-col">
        {recent.map((keyword) => (
          <div
            key={keyword}
            className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0"
          >
            <button
              type="button"
              onClick={() => handleSearch(keyword)}
              className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300"
            >
              {keyword}
            </button>
            <button
              type="button"
              onClick={() => handleRemove(keyword)}
              aria-label={`${keyword} 삭제`}
              className="text-gray-300 pl-3"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
