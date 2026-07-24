"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PopupCard } from "./PopupCard";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import type { PopupItem } from "@/data/mockPopups";

// ⚠️ "인기 추천 팝업"을 방문수/찜한 수/후기 개수로 보여달라는 요청이 있었는데, 지금
// 백엔드엔 이 세 가지를 고객 화면에 알려주는 API가 하나도 없어요.
//   - 방문수: 관리자 전용 일별 통계만 있고, 팝업별 방문수를 고객에게 보여주는 API 없음
//   - 찜한 수: WishlistController가 "내가 찜했는지 여부"만 알려주고, 팝업별 전체 찜 수는 없음
//   - 후기 개수: 레포지토리 레벨엔 countByPopupId가 있지만, 이걸 노출하는 고객용 API가 없음
// 그래서 지금은 이름만 "인기 추천 팝업"으로 바꾸고, 지역 필터로 걸러진 진행중 팝업 목록
// 순서를 그대로 보여주고 있어요. 세 지표를 넣으려면 백엔드에 각각의 API 추가가 필요해요.
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
        <h3 className="text-base mobile:text-lg font-semibold">인기 추천 팝업</h3>
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
