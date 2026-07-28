// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { PromoCarousel } from "@/components/home/PromoCarousel";
import { CategoryIconList } from "@/components/home/CategoryIconList";
import { NearbyHotPlacesSection } from "@/components/home/NearbyHotPlacesSection";
import { NoticeBar } from "@/components/home/NoticeBar";
import { PopupSection } from "@/components/home/PopupSection";
import { PopularRankingSection } from "@/components/home/PopularRankingSection";
import { ReviewSection } from "@/components/home/ReviewSection";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { searchPopups, getPopup, getPopupLiveStatus, type PopupLiveStatus } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { getRecentlyViewedIds } from "@/lib/recentlyViewed";
import { getPreferredRegions, getPreferredCategories } from "@/lib/preferences";
import { LiveCongestionMini } from "@/components/popup/LiveCongestion";
import Link from "next/link";
import type { PopupItem } from "@/data/mockPopups";

export default function Home() {
  const [openingSoon, setOpeningSoon] = useState<PopupItem[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<PopupItem[]>([]);
  const [allOpenPopups, setAllOpenPopups] = useState<PopupItem[]>([]);
  const [congestionItems, setCongestionItems] = useState<{ item: PopupItem; status: PopupLiveStatus }[]>([]);
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

    // "내 관심 지역"/"관심 카테고리"/"실시간 혼잡도" 섹션에서 같이 쓸 진행중 팝업 목록
    searchPopups({ status: "OPEN" })
      .then((list) => {
        if (cancelled) return;
        const items = list.map(toPopupItem);
        setAllOpenPopups(items);

        // 실시간 혼잡도 - 진행중 팝업 중 앞쪽 8개만 골라서 개별 조회 (팝업별 API라 한 번에 못 가져옴)
        const targets = items.slice(0, 8);
        Promise.all(
          targets.map((item) =>
            getPopupLiveStatus(item.id)
              .then((status) => ({ item, status }))
              .catch(() => null)
          )
        ).then((results) => {
          if (cancelled) return;
          const valid = results.filter((r): r is { item: PopupItem; status: PopupLiveStatus } => r !== null);
          valid.sort((a, b) => b.status.congestionRate - a.status.congestionRate);
          setCongestionItems(valid);
        });
      })
      .catch((err) => console.error("진행중 팝업 조회 실패", err));

    return () => {
      cancelled = true;
    };
  }, []);

  // 관심 지역/카테고리는 백엔드 저장 API와 개념이 아직 안 맞아서(지난번 지역 정리 이슈)
  // 브라우저에 저장된 값 기준으로 필터링해요. 실제 category 컬럼이 없어서 이름/지역
  // 텍스트에 포함되는지로 대신 걸러요 (검색 화면 카테고리 필터와 동일한 방식).
  const preferredRegions = useMemo(() => getPreferredRegions(), []);
  const preferredCategories = useMemo(() => getPreferredCategories().slice(0, 2), []);

  const regionPopups = useMemo(() => {
    if (preferredRegions.length === 0) return [];
    return allOpenPopups.filter((p) =>
      preferredRegions.some((r) => p.location?.toLowerCase().includes(r.toLowerCase()))
    );
  }, [allOpenPopups, preferredRegions]);

  const categoryPopupLists = useMemo(() => {
    return preferredCategories.map((category) => ({
      category,
      items: allOpenPopups.filter((p) => {
        const c = category.toLowerCase();
        return p.name.toLowerCase().includes(c) || (p.location?.toLowerCase().includes(c) ?? false);
      }),
    }));
  }, [allOpenPopups, preferredCategories]);

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
      <NearbyHotPlacesSection />

      {recentlyViewed.length > 0 && (
        <PopupSection title="최근 본 팝업" items={recentlyViewed} moreHref="/recent" />
      )}
      <PopularRankingSection />

      {regionPopups.length > 0 && (
        <PopupSection
          title="내 관심 지역 팝업"
          items={regionPopups}
          moreHref={`/search?region=${encodeURIComponent(preferredRegions[0])}`}
        />
      )}

      {categoryPopupLists.map(
        ({ category, items }) =>
          items.length > 0 && (
            <PopupSection
              key={category}
              title={`${category} 팝업`}
              items={items}
              moreHref={`/search?q=${encodeURIComponent(category)}`}
            />
          )
      )}

      {congestionItems.length > 0 && (
        <section className="mb-14 mobile:mb-16 px-4 mobile:px-8">
          <h3 className="text-base mobile:text-lg font-semibold mb-3 mobile:mb-4">실시간 혼잡도</h3>
          <HorizontalCarousel>
            {congestionItems.map(({ item, status }) => (
              <Link
                key={item.id}
                href={`/popup/${item.id}`}
                className="flex-none w-[140px] border border-gray-100 rounded-lg p-3"
              >
                <p className="text-sm font-medium truncate mb-1">{item.name}</p>
                <LiveCongestionMini status={status} />
              </Link>
            ))}
          </HorizontalCarousel>
        </section>
      )}

      <PopupSection
        title="곧 오픈하는 팝업"
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
