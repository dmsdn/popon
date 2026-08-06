// components/search/SuggestedKeywords.tsx
// 추천 검색어 컴포넌트 - 지금 진행중인 팝업이 많은 지역/카테고리를 자동 계산해 보여줌

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addRecentSearch } from "@/lib/searchHistory";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { getTopKeywords } from "@/lib/utils/topRegions";

export function SuggestedKeywords({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  // 추천 검색어를 지금 진행중인 팝업이 가장 많은 지역·카테고리 5개 자동 계산
  const [suggested, setSuggested] = useState<string[]>([]);

  useEffect(() => {
    searchPopups({ status: "OPEN" })
      .then((list) => {
        setSuggested(getTopKeywords(list.map(toPopupItem), 5));
      })
      .catch((err) => console.error("추천 키워드 계산용 팝업 조회 실패", err));
  }, []);

  const handleClick = (keyword: string) => {
    addRecentSearch(keyword);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  if (suggested.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">추천 키워드</span>
      <div className="flex flex-wrap gap-2">
        {suggested.map((keyword) => (
          <button
            key={keyword}
            type="button"
            onClick={() => handleClick(keyword)}
            className="text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#282B32] rounded-full px-3 py-1.5"
          >
            {keyword}
          </button>
        ))}
      </div>
    </div>
  );
}
