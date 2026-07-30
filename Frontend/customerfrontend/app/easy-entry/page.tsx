"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { searchPopups, getQueueBoardCount } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import type { PopupItem } from "@/data/mockPopups";
import { LoadingState, EmptyState } from "@/components/ui/EmptyState";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

// 한 번에 너무 많은 팝업의 대기열을 조회하면 요청이 많아져서, 진행중 팝업 중
// 앞쪽 40개까지만 확인해요 (홈 화면 미리보기는 8개만 봄).
const MAX_CHECK = 40;

export default function EasyEntryListPage() {
  const router = useRouter();
  const [items, setItems] = useState<{ item: PopupItem; count: number }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    searchPopups({ status: "OPEN" })
      .then(async (list) => {
        const targets = list.slice(0, MAX_CHECK).map(toPopupItem);
        const results = await Promise.all(
          targets.map((item) =>
            getQueueBoardCount(item.id)
              .then((data) => ({ item, count: data.totalCount }))
              .catch(() => null)
          )
        );
        if (cancelled) return;
        const valid = results.filter((r): r is { item: PopupItem; count: number } => r !== null);
        valid.sort((a, b) => a.count - b.count);
        setItems(valid);
      })
      .catch((err) => console.error("입장하기 좋은 팝업 조회 실패", err))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <h1 className="text-lg font-bold mb-1">지금 입장하기 좋은 팝업</h1>
        <p className="text-sm text-gray-400 mb-5">현재 대기·체류 인원이 적은 순서예요.</p>

        {!loaded ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState message="표시할 팝업이 없어요." />
        ) : (
          <div className="flex flex-col">
            {items.map(({ item, count }) => (
              <Link
                key={item.id}
                href={`/popup/${item.id}`}
                className="flex items-center gap-4 py-4 border-b border-gray-50"
              >
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
                </div>
                <span className="text-xs text-gray-500 flex-none">현재 {count}명</span>
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
