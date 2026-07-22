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
import { ReviewSection } from "@/components/home/ReviewSection";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { POPUP_STATUS } from "@/lib/constants/status";
import {
  recentPopups,
  type PopupItem,
} from "@/data/mockPopups";

export default function Home() {
  // "실시간 인기 팝업" / "곧 오픈하는 팝업"만 실제 DB(백엔드 /api/popups)와 연결했습니다.
  // "최근 본 팝업"(로그인 사용자별 조회 이력)은 아직 백엔드에 해당 데이터가 없어서 mock을 그대로 씁니다.
  // "무료입장 팝업" 섹션은 요청에 따라 제거했습니다.
  const [popularPopups, setPopularPopups] = useState<PopupItem[] | null>(null);
  const [openingSoonPopups, setOpeningSoonPopups] = useState<PopupItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    searchPopups({ status: POPUP_STATUS.OPEN })
      .then((list) => {
        if (!cancelled) setPopularPopups(list.map(toPopupItem));
      })
      .catch((err) => {
        console.error("진행중 팝업 조회 실패", err);
        if (!cancelled) setPopularPopups([]);
      });

    searchPopups({ status: POPUP_STATUS.BEFOR })
      .then((list) => {
        if (!cancelled) setOpeningSoonPopups(list.map(toPopupItem));
      })
      .catch((err) => {
        console.error("오픈예정 팝업 조회 실패", err);
        if (!cancelled) setOpeningSoonPopups([]);
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

      {/* TODO(백엔드 연동): 최근 본 팝업 - 조회 이력 API가 없어서 아직 mock */}
      <PopupSection title="최근 본 팝업" items={recentPopups} />

      <PopupSection
        title="실시간 인기 팝업 추천 카드"
        items={popularPopups ?? []}
        filterOptions={["전체", "성수", "여의도", "홍대"]}
      />
      <PopupSection title="곧 오픈하는 팝업 추천 카드" items={openingSoonPopups ?? []} />

      <ReviewSection />

      <Footer />

      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>
    </main>
  );
}