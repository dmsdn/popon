"use client";

import { useState } from "react";
import { PopupCard } from "./PopupCard";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { popularByKeyword } from "@/data/mockPopups";

const KEYWORDS = Object.keys(popularByKeyword); // ["전체", "성수", "여의도", "홍대"]

export function PopularRankingSection() {
  const [keyword, setKeyword] = useState(KEYWORDS[0]);
  const items = (popularByKeyword[keyword] ?? []).slice(0, 10);

  return (
    <section className="mb-10 mobile:mb-14 px-4 mobile:px-8">
      <div className="flex items-baseline justify-between mb-3 mobile:mb-4">
        <h3 className="text-base mobile:text-lg font-semibold">실시간 인기 팝업 추천 카드</h3>
        <span className="text-sm mobile:text-base text-gray-400">더보기 ›</span>
      </div>

      {/* 키워드(지역) 필터 - 누르면 해당 키워드의 실시간 인기 1~10위로 전환 */}
      <div className="flex gap-2 mb-3">
        {KEYWORDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKeyword(k)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              keyword === k
                ? "border-gray-900 text-gray-900 font-medium"
                : "border-gray-200 text-gray-500"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <HorizontalCarousel>
        {items.map((item, index) => (
          <PopupCard key={item.id} {...item} rank={index + 1} />
        ))}
      </HorizontalCarousel>
    </section>
  );
}
