"use client";

// "인기 추천 팝업" 섹션 - 지역 탭(전체 지역)마다 실제 인기순(찜+후기+클릭수)으로
// 랭킹을 보여주는 가로 캐러셀.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PopupCard } from "./PopupCard";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { searchPopups, getPopularPopups } from "@/lib/api/popups";
import { getRegions } from "@/lib/api/regions";
import { toPopupItem } from "@/lib/utils/popupMapper";
import type { PopupItem } from "@/data/mockPopups";

// [수정] 예전엔 백엔드에 찜/후기/방문(클릭) 수를 고객 화면에 알려주는 API가
// 없는 줄 알고, 그냥 진행중 팝업을 순서대로 보여주는 가짜 "인기순"이었어요.
// 알고 보니 GET /api/popups/popular?region=이 이미 찜+후기+클릭수를 합산한
// 진짜 인기순 랭킹을 계산해서 내려주고 있었는데, 프론트가 이걸 안 쓰고
// 있었을 뿐이었어요. 이제 그 API를 실제로 써요. 지역 탭도 "많이 열리는 지역
// 3개" 대신, 지역 카탈로그(getRegions) 전체를 불러와서 다 보여줘요.
export function PopularRankingSection() {
  const [keywords, setKeywords] = useState<string[]>(["전체"]);
  const [keyword, setKeyword] = useState("전체");
  const [popularIds, setPopularIds] = useState<number[]>([]);
  // popupId → 카드 표시용 전체 정보(이미지/지역/날짜 등) 조회용. 인기순 API
  // 응답엔 popupId/제목/점수만 있고 카드에 필요한 나머지 정보가 없어서,
  // 이미 불러온 전체 팝업 목록에서 매칭해요.
  const [popupById, setPopupById] = useState<Map<number, PopupItem>>(new Map());

  useEffect(() => {
    let cancelled = false;
    getRegions()
      .then((list) => {
        if (!cancelled) setKeywords(["전체", ...list.map((r) => r.name)]);
      })
      .catch((err) => console.error("지역 목록 조회 실패", err));
    // 인기순 API가 OPEN+BEFOR(진행중+오픈예정) 팝업을 대상으로 계산하니까,
    // 카드 표시용 데이터도 상태 제한 없이 전체를 받아서 매칭에 대비해요.
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
    getPopularPopups({ limit: 10, region: keyword === "전체" ? undefined : keyword })
      .then((list) => {
        if (!cancelled) setPopularIds(list.map((p) => p.popupId));
      })
      .catch((err) => console.error("인기 팝업 조회 실패", err));
    return () => {
      cancelled = true;
    };
  }, [keyword]);

  // 인기순 API가 내려준 순서(점수 높은 순)를 그대로 유지하면서, 카드에
  // 필요한 전체 정보로 바꿔치기해요. 아직 매칭 데이터가 안 왔거나(로딩 중)
  // 이미지가 없는 등 카드로 못 보여줄 항목은 걸러요.
  const items = useMemo(
    () => popularIds.map((id) => popupById.get(id)).filter((p): p is PopupItem => !!p),
    [popularIds, popupById]
  );

  // [수정] "전체"에서 더보기 누르면 전체 더보기 화면, "성수"에서 누르면 성수
  // 더보기 화면으로 가도록 선택된 지역을 링크에 반영했어요.
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
                ? "border-point text-point font-medium"
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
