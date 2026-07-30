// components/search/SuggestedKeywords.tsx
"use client";
import { useRouter } from "next/navigation";
import { addRecentSearch } from "@/lib/searchHistory";

const suggested = ["더현대", "성수", "홍대"];

export function SuggestedKeywords({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();

  const handleClick = (keyword: string) => {
    addRecentSearch(keyword);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <div className="px-4 py-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">추천 키워드</span>
      <div className="flex flex-wrap gap-2">
        {suggested.map((keyword) => (
          <button
            key={keyword}
            type="button"
            onClick={() => handleClick(keyword)}
            className="text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5"
          >
            {keyword}
          </button>
        ))}
      </div>
    </div>
  );
}
