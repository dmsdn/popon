// components/home/PopularRankingSection.tsx
// "인기 추천 팝업" 섹션 - 지역 탭마다 실제 인기순(찜+후기+클릭수)으로 랭킹을 보여주는 가로 캐러셀
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PopupCard } from "./PopupCard";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { searchPopups, getPopularPopups } from "@/lib/api/popups";
import { getRegions } from "@/lib/api/regions";
import { toPopupItem } from "@/lib/utils/popupMapper";
import type { PopupItem } from "@/data/mockPopups";

  
export function PopularRankingSection() {
  const [keywords, setKeywords] = useState<string[]>(["전체"]);
  const [keyword, setKeyword] = useState("전체");
  const [popularIds, setPopularIds] = useState<number[]>([]);

  // 인기순 API의 popupId와 카드에 필요한 팝업 정보를 연결하기 위한 Map
  const [popupById, setPopupById] = useState<Map<number, PopupItem>>(new Map()); 

  useEffect(() => {
    let cancelled = false;
    // 지역 목록을 조회해 인기 팝업의 지역 필터로 사용
    getRegions()
      .then((list) => {
        if (!cancelled) setKeywords(["전체", ...list.map((r) => r.name)]);
      })
      .catch((err) => console.error("지역 목록 조회 실패", err));
    // 인기순 API에는 카드 표시용 정보가 부족하므로 전체 팝업 정보를 함께 조회
    searchPopups()
      .then((list) => {
        if (cancelled) return;
        const map = new Map<number, PopupItem>();
        list.forEach((p) => map.set(p.id, toPopupItem(p)));
        setPopupById(map);
      })
      .catch((err) => console.error("팝업 목록 조회 실패", err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // 선택한 지역의 인기 팝업을 인기 점수 순으로 조회
    getPopularPopups({ limit: 10, region: keyword === "전체" ? undefined : keyword })
      .then((list) => {
        if (!cancelled) setPopularIds(list.map((p) => p.popupId));
      })
      .catch((err) => console.error("인기 팝업 조회 실패", err));
    return () => {
      cancelled = true;
    };
  }, [keyword]);

  // 인기순 API의 순서를 유지하면서 카드에 필요한 팝업 정보로 변환
  const items = useMemo(
    () => popularIds.map((id) => popupById.get(id)).filter((p): p is PopupItem => !!p),
    [popularIds, popupById]
  );

  // 선택된 지역에 따라 더보기 페이지의 링크 변경
  const moreHref = keyword === "전체" ? "/ranking" : `/ranking?region=${encodeURIComponent(keyword)}`;

  if (keywords.length <= 1 && items.length === 0) return null;

  return (
    <section className="mb-14 mobile:mb-16 px-4 mobile:px-8">
      <div className="flex items-baseline justify-between mb-3 mobile:mb-4">
        <h3 className="text-base mobile:text-lg font-semibold">인기 추천 팝업</h3>
        <Link href={moreHref} className="text-sm mobile:text-base text-gray-400">
          더보기
        </Link>
      </div>

      {/* 키워드(지역) 필터 - 누르면 해당 지역의 인기순 팝업으로 전환 */}
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
        {keywords.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKeyword(k)}
            className={`flex-none text-sm px-3 py-1.5 rounded-full border ${
              keyword === k
                ? "border-point text-[#218B09] font-medium"
                : "border-gray-200 dark:border-[#282B32] text-gray-500"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-6">아직 이 지역엔 인기 팝업이 없어요.</p>
      ) : (
        <HorizontalCarousel>
          {items.map((item, index) => (
            <PopupCard key={item.id} {...item} rank={index + 1} />
          ))}
        </HorizontalCarousel>
      )}
    </section>
  );
}
