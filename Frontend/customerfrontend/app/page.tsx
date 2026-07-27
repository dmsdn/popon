// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { PromoCarousel } from "@/components/home/PromoCarousel";
import { CategoryIconList } from "@/components/home/CategoryIconList";
import { NoticeBar } from "@/components/home/NoticeBar";
import { PopupSection } from "@/components/home/PopupSection";
import { PopularRankingSection } from "@/components/home/PopularRankingSection";
import { ReviewSection } from "@/components/home/ReviewSection";
import { searchPopups, getPopup } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { getRecentlyViewedIds } from "@/lib/recentlyViewed";
import type { PopupItem } from "@/data/mockPopups";

export default function Home() {
  const [openingSoon, setOpeningSoon] = useState<PopupItem[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<PopupItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    searchPopups({ status: "BEFOR" })
      .then((list) => {
        if (!cancelled) setOpeningSoon(list.map(toPopupItem));
      })
      .catch((err) => console.error("오픈예정 팝업 조회 실패", err))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    // "최근 본 팝업" - 이 브라우저에서 실제로 들어가봤던 팝업 상세페이지 기록 기준
    // (lib/recentlyViewed.ts, popup/[id]/page.tsx에서 방문 시 기록해요)
    const ids = getRecentlyViewedIds();
    Promise.all(
      ids.map((id) =>
        getPopup(id)
          .then(toPopupItem)
          .catch(() => null)
      )
    ).then((results) => {
      if (!cancelled) {
        setRecentlyViewed(results.filter((p): p is PopupItem => p !== null));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="pb-16 mobile:pb-0 mobile:max-w-[1000px] mobile:mx-auto">
      <div className="hidden mobile:block">
        <Header />
      </div>
      <div className="block mobile:hidden">
        <MobileHeader />
      </div>

      <PromoCarousel />
      <CategoryIconList />
      <NoticeBar />

      {recentlyViewed.length > 0 && (
        <PopupSection title="최근 본 팝업" items={recentlyViewed} moreHref="/recent" />
      )}
      <PopularRankingSection />
      <PopupSection
        title="곧 오픈하는 팝업 추천 카드"
        items={loaded ? openingSoon : []}
        moreHref="/search?status=예정"
      />

      <ReviewSection />

      <Footer />

      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>
    </main>
  );
}
