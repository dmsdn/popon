"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import type { PopupItem } from "@/data/mockPopups";

// ⚠️ 로그인 사용자별 "내가 본 팝업" 조회 이력 API가 백엔드에 아직 없어서
// (backend-todo.md 2번 참고), 지금은 진행중인 팝업 전체 목록을 그대로 보여주고 있어요.
// 실제로 내가 봤던 것만 걸러진 목록은 아니에요.
export default function RecentListPage() {
  const router = useRouter();
  const [items, setItems] = useState<PopupItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    searchPopups({ status: "OPEN" })
      .then((list) => {
        if (!cancelled) setItems(list.map(toPopupItem));
      })
      .catch((err) => console.error("팝업 목록 조회 실패", err))
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
          <p className="text-sm text-gray-400 py-16 text-center">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 py-16 text-center">표시할 팝업이 없어요.</p>
        ) : (
          <div className="grid grid-cols-2 mobile:grid-cols-4 gap-4">
            {items.map((item) => (
              <Link key={item.id} href={`/popup/${item.id}`} className="flex flex-col gap-2">
                <div className="h-[160px] rounded-md bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                  이미지
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
