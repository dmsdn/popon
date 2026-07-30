"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import type { PopupItem } from "@/data/mockPopups";
import { LoadingState, EmptyState } from "@/components/ui/EmptyState";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

// ⚠️ 방문자 수 기반 진짜 "인기순" 랭킹 API는 고객 화면에 아직 공개돼 있지 않아서
// (관리자 전용 /api/admin/stats/popup-ranking만 존재), 지금은 선택한 지역의
// 진행중인 팝업 목록을 순서대로 보여주고 있어요. 번호는 실제 순위가 아니에요.
const KEYWORDS = ["전체", "성수", "여의도", "홍대"];

export default function RankingListPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState(KEYWORDS[0]);
  const [items, setItems] = useState<PopupItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    const location = keyword === "전체" ? undefined : keyword;

    searchPopups({ status: "OPEN", location })
      .then((list) => {
        if (!cancelled) setItems(list.map(toPopupItem));
      })
      .catch((err) => console.error("인기 팝업 조회 실패", err))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [keyword]);

  return (
    <main className="min-h-screen flex flex-col pb-16 mobile:pb-0 mobile:max-w-[1000px] mobile:mx-auto">
      <div className="flex-1">
      <div className="flex items-center gap-2 px-4 mobile:px-8 py-4 border-b border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          ‹
        </button>
      </div>

      <div className="px-4 mobile:px-8 py-4">
        <h1 className="text-lg font-bold mb-4">인기 추천 팝업</h1>

        {/* 키워드(지역) 필터 - 상단 고정 */}
        <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
          {KEYWORDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKeyword(k)}
              className={`flex-none text-xs px-3 py-1.5 rounded-full border ${
                keyword === k
                  ? "border-gray-900 bg-gray-900 text-white font-medium"
                  : "border-gray-200 text-gray-500"
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
                className="flex items-center gap-4 py-4 border-b border-gray-50"
              >
                <span className="w-6 text-center text-sm font-bold text-gray-900 flex-none">
                  {index + 1}
                </span>
                <div className="w-24 h-24 flex-none rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-xs text-gray-400">
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
