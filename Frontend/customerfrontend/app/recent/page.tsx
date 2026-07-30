"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { getPopup } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { getRecentlyViewedIds } from "@/lib/recentlyViewed";
import type { PopupItem } from "@/data/mockPopups";
import { LoadingState, EmptyState } from "@/components/ui/EmptyState";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

// 이 브라우저에서 실제로 들어가봤던 팝업 상세페이지 기록 기준이에요 (lib/recentlyViewed.ts).
// 로그인 계정 기준 서버 저장이 아니라 브라우저 기준이라, 다른 기기에서는 안 보여요.
export default function RecentListPage() {
  const router = useRouter();
  const [items, setItems] = useState<PopupItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ids = getRecentlyViewedIds();

    Promise.all(
      ids.map((id) =>
        getPopup(id)
          .then(toPopupItem)
          .catch(() => null)
      )
    )
      .then((results) => {
        if (!cancelled) setItems(results.filter((p): p is PopupItem => p !== null));
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="pb-16 mobile:pb-0 mobile:max-w-[1000px] mobile:mx-auto">
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
        <h1 className="text-lg font-bold mb-4">최근 본 팝업</h1>

        {!loaded ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState message="아직 본 팝업이 없어요." />
        ) : (
          <div className="grid grid-cols-2 mobile:grid-cols-4 gap-4">
            {items.map((item) => (
              <Link key={item.id} href={`/popup/${item.id}`} className="flex flex-col gap-2">
                <div className="h-[160px] rounded-md bg-gray-100 overflow-hidden flex items-center justify-center text-xs text-gray-400">
                  {item.imageUrl ? (
                    <ImageWithFallback src={item.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    "이미지"
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.location && <p className="text-xs text-gray-400">{item.location}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>
    </main>
  );
}
