"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PopupCard } from "./PopupCard";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import type { PopupItem } from "@/data/mockPopups";

// ⚠️ 진짜 "인기순"(방문자 수 랭킹) API가 고객 화면에는 아직 공개돼 있지 않아서
// (관리자 전용 /api/admin/stats/popup-ranking만 존재 — backend-todo.md 10번 참고),
// 지금은 선택한 지역의 진행중인 팝업 목록을 순서 그대로 보여주고 있어요.
// 카드 위 숫자는 실제 인기 순위가 아니라 목록 순서예요.
const KEYWORDS = ["전체", "성수", "여의도", "홍대"];

export function PopularRankingSection() {
  const [keyword, setKeyword] = useState(KEYWORDS[0]);
  const [items, setItems] = useState<PopupItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const location = keyword === "전체" ? undefined : keyword;

    searchPopups({ status: "OPEN", location })
      .then((list) => {
        if (!cancelled) setItems(list.slice(0, 10).map(toPopupItem));
      })
      .catch((err) => console.error("인기 팝업 조회 실패", err));

    return () => {
      cancelled = true;
    };
  }, [keyword]);

  return (
    <section className="mb-10 mobile:mb-14 px-4 mobile:px-8">
      <div className="flex items-baseline justify-between mb-3 mobile:mb-4">
        <h3 className="text-base mobile:text-lg font-semibold">실시간 인기 팝업 추천 카드</h3>
        <Link href="/ranking" className="text-sm mobile:text-base text-gray-400">
          더보기 ›
        </Link>
      </div>

      {/* 키워드(지역) 필터 - 누르면 해당 지역의 진행중인 팝업으로 전환 */}
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
