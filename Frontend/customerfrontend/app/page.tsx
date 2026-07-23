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
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import type { PopupItem } from "@/data/mockPopups";

export default function Home() {
  const [openingSoon, setOpeningSoon] = useState<PopupItem[]>([]);
  const [ongoing, setOngoing] = useState<PopupItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    searchPopups({ status: "BEFOR" })
      .then((list) => {
        if (!cancelled) setOpeningSoon(list.map(toPopupItem));
      })
      .catch((err) => console.error("오픈예정 팝업 조회 실패", err));

    searchPopups({ status: "OPEN" })
      .then((list) => {
        if (!cancelled) setOngoing(list.map(toPopupItem));
      })
      .catch((err) => console.error("진행중 팝업 조회 실패", err))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ⚠️ "최근 본 팝업"(로그인 사용자별 조회 이력)은 백엔드에 해당 데이터가 없어서,
  // 지금은 실제 진행중 팝업 목록(ongoing)을 그대로 보여주고 있어요. 실제 "최근 본" 구분은 아니에요.
  // → backend-todo.md 2번 참고. "무료입장 팝업" 섹션은 무료/유료 구분 기준이 없어서 삭제했습니다.

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

      <PopupSection title="최근 본 팝업" items={loaded ? ongoing : []} moreHref="/recent" />
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
