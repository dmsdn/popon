"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PopupCard } from "./PopupCard";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { getTopRegions } from "@/lib/utils/topRegions";
import type { PopupItem } from "@/data/mockPopups";

// ⚠️ "인기 추천 팝업"을 방문수/찜한 수/후기 개수로 보여달라는 요청이 있었는데, 지금
// 백엔드엔 이 세 가지를 고객 화면에 알려주는 API가 하나도 없어요.
//   - 방문수: 관리자 전용 일별 통계만 있고, 팝업별 방문수를 고객에게 보여주는 API 없음
//   - 찜한 수: WishlistController가 "내가 찜했는지 여부"만 알려주고, 팝업별 전체 찜 수는 없음
//   - 후기 개수: 레포지토리 레벨엔 countByPopupId가 있지만, 이걸 노출하는 고객용 API가 없음
// 그래서 지금은 이름만 "인기 추천 팝업"으로 바꾸고, 지역 필터로 걸러진 진행중 팝업 목록
// 순서를 그대로 보여주고 있어요. 세 지표를 넣으려면 백엔드에 각각의 API 추가가 필요해요.

export function PopularRankingSection() {
  // [수정] 성수/여의도/홍대로 고정되어 있던 걸, 지금 진행중인 팝업이 가장 많은
  // 지역 3개로 동적으로 바꿨어요.
  const [keywords, setKeywords] = useState<string[]>(["전체"]);
  const [keyword, setKeyword] = useState("전체");
  const [items, setItems] = useState<PopupItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    searchPopups({ status: "OPEN" })
      .then((list) => {
        if (cancelled) return;
        const allOpen = list.map(toPopupItem);
        setKeywords(["전체", ...getTopRegions(allOpen, 3)]);
      })
      .catch((err) => console.error("지역 랭킹 계산용 팝업 조회 실패", err));
    return () => {
      cancelled = true;
    };
  }, []);

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

  // [수정] "전체"에서 더보기 누르면 전체 더보기 화면, "성수"에서 누르면 성수
  // 더보기 화면으로 가도록 선택된 지역을 링크에 반영했어요.
  const moreHref = keyword === "전체" ? "/ranking" : `/ranking?region=${encodeURIComponent(keyword)}`;

  return (
    <section className="mb-14 mobile:mb-16 px-4 mobile:px-8">
      <div className="flex items-baseline justify-between mb-3 mobile:mb-4">
        <h3 className="text-base mobile:text-lg font-semibold">인기 추천 팝업</h3>
        <Link href={moreHref} className="text-sm mobile:text-base text-gray-400">
          더보기 ›
        </Link>
      </div>

      {/* 키워드(지역) 필터 - 누르면 해당 지역의 진행중인 팝업으로 전환 */}
      <div className="flex gap-2 mb-3">
        {keywords.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKeyword(k)}
            className={`text-sm px-3 py-1.5 rounded-full border ${
              keyword === k
                ? "border-gray-900 dark:border-white text-gray-900 dark:text-white font-medium"
                : "border-gray-200 dark:border-[#282B32] text-gray-500"
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
