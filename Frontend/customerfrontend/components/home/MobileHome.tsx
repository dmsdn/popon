// components/home/MobileHome.tsx
import { MobileHeader } from "@/components/layout/MobileHeader";
import { CategoryIconList } from "@/components/home/CategoryIconList";
import { NoticeBar } from "@/components/home/NoticeBar";
import { RankingSection } from "@/components/home/RankingSection";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { popularPopups } from "@/data/mockPopups";

export function MobileHome() {
  return (
    <main className="pb-16">
      <MobileHeader />
      <CategoryIconList />
      <NoticeBar />
      <RankingSection title="실시간 인기 랭킹" items={popularPopups} />
      <BottomTabBar />
    </main>
  );
}