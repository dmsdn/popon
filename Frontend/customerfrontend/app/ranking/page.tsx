// app/ranking/page.tsx
// 인기 추천 팝업 더보기 페이지 - 지역별 탭으로 실제 인기순(찜+후기+클릭수) 랭킹
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { searchPopups, getPopularPopups } from "@/lib/api/popups";
import { getRegions } from "@/lib/api/regions";
import { toPopupItem } from "@/lib/utils/popupMapper";
import type { PopupItem } from "@/data/mockPopups";
import { LoadingState, EmptyState } from "@/components/ui/EmptyState";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

export default function RankingListPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RankingListInner />
    </Suspense>
  );
}

function RankingListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("region") ?? "전체");
  const [keywords, setKeywords] = useState<string[]>(["전체", searchParams.get("region") ?? ""].filter(Boolean));
  const [popularIds, setPopularIds] = useState<number[]>([]);
  const [popupById, setPopupById] = useState<Map<number, PopupItem>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getRegions()
      .then((list) => setKeywords(["전체", ...list.map((r) => r.name)]))
      .catch((err) => console.error("지역 목록 조회 실패", err));
    searchPopups()
      .then((list) => {
        const map = new Map<number, PopupItem>();
        list.forEach((p) => map.set(p.id, toPopupItem(p)));
        setPopupById(map);
      })
      .catch((err) => console.error("팝업 목록 조회 실패", err));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

    getPopularPopups({ limit: 50, region: keyword === "전체" ? undefined : keyword })
      .then((list) => {
        if (!cancelled) setPopularIds(list.map((p) => p.popupId));
      })
      .catch((err) => console.error("인기 팝업 조회 실패", err))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [keyword]);

  const items = useMemo(
    () => popularIds.map((id) => popupById.get(id)).filter((p): p is PopupItem => !!p),
    [popularIds, popupById]
  );

  return (
    <main className="min-h-screen flex flex-col w-full pb-16 mobile:pb-0 mobile:max-w-[1000px] mobile:mx-auto">
      <div className="flex-1">
      <div className="flex items-center gap-2 h-14 px-4 mobile:px-8 border-b border-gray-100 dark:border-[#282B32]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
        </button>
        <h1 className="text-lg font-bold">인기 추천 팝업</h1>
      </div>

      <div className="px-4 mobile:px-8 py-4">        {/* 키워드(지역) 필터 - 상단 고정 */}
        <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
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

        {!loaded ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState message="표시할 팝업이 없어요." />
        ) : (
          <div className="flex flex-col">
            {items.map((item, index) => (
              <Link
                key={item.id}
                href={`/popup/${item.id}`}
                className="flex items-center gap-4 py-4 border-b border-gray-50 dark:border-[#282B32]"
              >
                <span
                  className={`w-6 text-center font-bold flex-none ${
                    index < 5 ? "text-base text-point" : "text-sm text-gray-400"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="w-24 h-24 flex-none rounded-lg bg-gray-100 dark:bg-[#282B32] overflow-hidden flex items-center justify-center text-sm text-gray-400">
                  {item.imageUrl ? (
                    <ImageWithFallback src={item.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    "이미지"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium truncate">{item.name}</p>
                  {item.location && <p className="text-sm text-gray-400">{item.location}</p>}
                  {item.dateRange && <p className="text-sm text-gray-400">{item.dateRange}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      </div>

      <Footer />
      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>
    </main>
  );
}
