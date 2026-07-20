// components/home/DesktopHome.tsx
import { Header } from "@/components/layout/Header";
import { NavTabs } from "@/components/layout/NavTabs";
import { Footer } from "@/components/layout/Footer";
import { PromoCarousel } from "@/components/home/PromoCarousel";
import { CategoryIconList } from "@/components/home/CategoryIconList";
import { NoticeBar } from "@/components/home/NoticeBar";
import { PopupSection } from "@/components/home/PopupSection";
import { ReviewSection } from "@/components/home/ReviewSection";
import {
  recentPopups,
  popularPopups,
  openingSoonPopups,
  freePopups,
} from "@/data/mockPopups";

export function DesktopHome() {
  return (
    <main>
      <Header />
      <NavTabs />
      <PromoCarousel />
      <CategoryIconList />
      <NoticeBar />
      <PopupSection title="최근 본 팝업" items={recentPopups} />
      <PopupSection
        title="실시간 인기 팝업 추천 카드"
        items={popularPopups}
        filterOptions={["전체", "성수", "여의도", "홍대"]}
      />
      <PopupSection title="곧 오픈하는 팝업 추천 카드" items={openingSoonPopups} />
      <PopupSection title="무료입장 팝업 추천 카드" items={freePopups} />
      <ReviewSection />
      <Footer />
    </main>
  );
}