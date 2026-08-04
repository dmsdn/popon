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
import { NearbyRegionPopupSection } from "@/components/home/NearbyRegionPopupSection";
import { MapSearchEntry } from "@/components/home/MapSearchEntry";
import { PopupSection } from "@/components/home/PopupSection";
import { PopularRankingSection } from "@/components/home/PopularRankingSection";
import { ReviewSection } from "@/components/home/ReviewSection";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { searchPopups, getPopup, getPopupLiveStatus, getQueueBoardCount, getPopupImages, type PopupLiveStatus } from "@/lib/api/popups";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { getRecentlyViewedIds } from "@/lib/recentlyViewed";
import { getRegions, getMyRegions, type Region } from "@/lib/api/regions";
import { getKeywords, getMyInterests, type Keyword } from "@/lib/api/customer";
import { useAuth } from "@/lib/auth/AuthContext";
import { LiveCongestionMini } from "@/components/popup/LiveCongestion";
import Link from "next/link";
import type { PopupItem } from "@/data/mockPopups";

export default function Home() {
  const { customer } = useAuth();
  const [openPopups, setOpenPopups] = useState<PopupItem[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<PopupItem[]>([]);
  const [allOpenPopups, setAllOpenPopups] = useState<PopupItem[]>([]);
  const [congestionItems, setCongestionItems] = useState<
    { item: PopupItem; status: PopupLiveStatus; imageUrl: string | null }[]
  >([]);
  const [easyEntryItems, setEasyEntryItems] = useState<{ item: PopupItem; count: number }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [allKeywords, setAllKeywords] = useState<Keyword[]>([]);
  const [myKeywordIds, setMyKeywordIds] = useState<number[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [myRegionIds, setMyRegionIds] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;

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

    // "내 관심 지역"/"관심 카테고리"/"실시간 혼잡도" 섹션 + [수정] "곧 오픈하는 팝업"
    // 섹션이 예정 팝업은 아직 예약도 웨이팅도 열리지 않아 눌러도 할 게 없는 경우가
    // 많았어요. 지금 바로 방문/예약 가능한 "진행중" 팝업으로 바꾸면서, 이미 같은
    // status=OPEN으로 불러오고 있던 이 목록을 그대로 재사용해요 (중복 조회 방지).
    searchPopups({ status: "OPEN" })
      .then((list) => {
        if (cancelled) return;
        const items = list.map(toPopupItem);
        setAllOpenPopups(items);
        setOpenPopups(items);

        // 실시간 혼잡도 - 진행중 팝업 중 앞쪽 8개만 골라서 개별 조회 (팝업별 API라 한 번에 못 가져옴)
        const targets = items.slice(0, 8);
        Promise.all(
          targets.map((item) =>
            Promise.all([getPopupLiveStatus(item.id), getPopupImages(item.id).catch(() => [])])
              .then(([status, images]) => ({
                item,
                status,
                // [수정] 대표 이미지를 배열 맨 앞이 아니라 type === "THUMBNAIL"로 골라요.
                // (상세 이미지만 있고 썸네일이 없는 팝업에서 배열 순서에 따라 상세
                // 이미지가 대표 자리에 뜨는 버그 방지. 옛 데이터 대비 폴백은 유지)
                imageUrl: (images.find((img) => img.type === "THUMBNAIL") ?? images[0])?.imageUrl ?? null,
              }))
              .catch(() => null)
          )
        ).then((results) => {
          if (cancelled) return;
          const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
          valid.sort((a, b) => b.status.congestionRate - a.status.congestionRate);
          setCongestionItems(valid);
        });

        // [신규] 지금 입장하기 좋은 팝업 - 통합 대기열 총 인원이 적은 순. 개인정보
        // 노출 우려로 totalCount만 씁니다 (lib/api/popups.ts getQueueBoardCount 참고).
        Promise.all(
          targets.map((item) =>
            getQueueBoardCount(item.id)
              .then((data) => ({ item, count: data.totalCount }))
              .catch(() => null)
          )
        ).then((results) => {
          if (cancelled) return;
          const valid = results.filter((r): r is { item: PopupItem; count: number } => r !== null);
          valid.sort((a, b) => a.count - b.count);
          setEasyEntryItems(valid);
        });
      })
      .catch((err) => console.error("진행중 팝업 조회 실패", err))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // [수정] 관심 카테고리가 죽은 로컬 저장 함수(getPreferredCategories)를 읽고 있었어요 -
  // signup/preferences·마이페이지수정에서 이미 실제 keyword API로 옮겨서 그 로컬
  // 저장소엔 더 이상 아무것도 안 쓰여지고 있었고, 그래서 이 섹션이 항상 빈 채로
  // 사라져 있었어요. 실제 API로 교체하고, 매칭도 해시태그 정확 매칭으로 바꿨어요.
  useEffect(() => {
    if (!customer) return;
    getKeywords()
      .then(setAllKeywords)
      .catch((err) => console.error("키워드 목록 조회 실패", err));
    getMyInterests()
      .then((res) => setMyKeywordIds(res?.keywordIds ?? []))
      .catch((err) => console.error("내 관심 키워드 조회 실패", err));
  }, [customer]);

  // [수정] "내 관심 지역 팝업" 섹션도 마찬가지로 죽은 로컬 저장 함수(getPreferredRegions)를
  // 읽고 있어서, 마이페이지 수정화면에서 저장한 진짜 관심 지역이 전혀 반영이 안 되고
  // 이 섹션이 항상 비어 있었어요. 실제 지역 API로 교체했어요.
  useEffect(() => {
    if (!customer) return;
    getRegions()
      .then(setAllRegions)
      .catch((err) => console.error("지역 목록 조회 실패", err));
    getMyRegions()
      .then((res) => setMyRegionIds(res?.regionIds ?? []))
      .catch((err) => console.error("내 관심 지역 조회 실패", err));
  }, [customer]);

  const preferredRegions = useMemo(() => {
    const nameById = new Map(allRegions.map((r) => [r.id, r.name]));
    return myRegionIds.map((id) => nameById.get(id)).filter((n): n is string => !!n);
  }, [allRegions, myRegionIds]);

  // [신규] "내 관심 지역 팝업" 제목을 "OO에 이런 팝업이 열려요"로 바꾸면서, 관심
  // 지역이 여러 개면 그 중 하나를 랜덤으로 골라 제목에 써요.
  const featuredRegion = useMemo(() => {
    if (preferredRegions.length === 0) return "";
    return preferredRegions[Math.floor(Math.random() * preferredRegions.length)];
  }, [preferredRegions]);
  const easyEntryPopupItems = useMemo(
    () => easyEntryItems.map(({ item, count }) => ({ ...item, badge: `웨이팅 ${count}팀` })),
    [easyEntryItems]
  );
  const preferredCategories = useMemo(() => {
    const nameById = new Map(allKeywords.map((k) => [k.id, k.name]));
    return myKeywordIds.map((id) => nameById.get(id)).filter((n): n is string => !!n).slice(0, 2);
  }, [allKeywords, myKeywordIds]);

  // [수정] 제목은 관심 지역 중 하나(featuredRegion)만 보여주는데, 목록은
  // preferredRegions 전체(여러 지역)를 기준으로 필터링하고 있었어요. 그래서
  // 관심 지역을 여러 개 선택해두면 "OO에 이런 팝업이 열려요"라고 하나만
  // 짚어놓고, 실제로는 다른 지역 팝업까지 섞여서 나왔어요. 제목이랑 똑같이
  // featuredRegion 하나만 기준으로 필터링하도록 맞췄어요.
  const regionPopups = useMemo(() => {
    if (!featuredRegion) return [];
    return allOpenPopups.filter((p) => p.location?.toLowerCase().includes(featuredRegion.toLowerCase()));
  }, [allOpenPopups, featuredRegion]);

  const categoryPopupLists = useMemo(() => {
    return preferredCategories.map((category) => ({
      category,
      items: allOpenPopups.filter((p) => p.hashtags?.includes(category) ?? false),
    }));
  }, [allOpenPopups, preferredCategories]);

  return (
    <main className="min-h-screen flex flex-col w-full pb-16 mobile:pb-0 mobile:max-w-[1000px] mobile:mx-auto">
      <div className="flex-1">
      <div className="hidden mobile:block">
        <Header />
      </div>
      <div className="block mobile:hidden">
        <MobileHeader />
      </div>

      <PromoCarousel />
      <MapSearchEntry />
      <CategoryIconList />

      {recentlyViewed.length > 0 && (
        <PopupSection title="최근 본 팝업" items={recentlyViewed} moreHref="/recent" />
      )}

      <PopularRankingSection />

      <NearbyRegionPopupSection />

      {congestionItems.length > 0 && (
        <section className="mb-14 mobile:mb-16 px-4 mobile:px-8">
          <h3 className="text-base mobile:text-lg font-semibold mb-3 mobile:mb-4">실시간 혼잡도</h3>
          <HorizontalCarousel>
            {congestionItems.map(({ item, status, imageUrl }) => (
              <Link
                key={item.id}
                href={`/popup/${item.id}`}
                className="flex-none w-[150px] border border-gray-100 dark:border-[#282B32] rounded-lg overflow-hidden"
              >
                {imageUrl ? (
                  <ImageWithFallback src={imageUrl} className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-[#282B32] flex items-center justify-center text-sm text-gray-400">
                    이미지
                  </div>
                )}
                <div className="p-3 pt-3.5 pb-4 flex flex-col gap-2">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <LiveCongestionMini status={status} />
                </div>
              </Link>
            ))}
          </HorizontalCarousel>
        </section>
      )}

      {regionPopups.length > 0 && (
        <PopupSection
          title={`"${featuredRegion}"에 이런 팝업이 열려요`}
          items={regionPopups}
          moreHref={`/search?region=${encodeURIComponent(featuredRegion)}`}
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

      <PopupSection
        title="지금 진행중인 팝업"
        items={loaded ? openPopups : []}
        moreHref="/search?status=진행중"
      />

      {easyEntryPopupItems.length > 0 && (
        <section className="mb-14 mobile:mb-16 px-4 mobile:px-8">
          <div className="flex items-center justify-between mb-3 mobile:mb-4">
            <h3 className="text-base mobile:text-lg font-semibold">지금 입장하기 좋은 팝업</h3>
            <Link href="/easy-entry" className="text-sm text-gray-400">
              더보기
            </Link>
          </div>
          <HorizontalCarousel>
            {easyEntryPopupItems.map((item) => (
              <Link
                key={item.id}
                href={`/popup/${item.id}`}
                className="flex-none w-[150px] border border-gray-100 dark:border-[#282B32] rounded-lg overflow-hidden"
              >
                {item.imageUrl ? (
                  <ImageWithFallback src={item.imageUrl} className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-[#282B32] flex items-center justify-center text-sm text-gray-400">
                    이미지
                  </div>
                )}
                <div className="p-3 pt-3.5 pb-4 flex flex-col gap-2">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.badge}</p>
                </div>
              </Link>
            ))}
          </HorizontalCarousel>
        </section>
      )}

      <ReviewSection />

      <NearbyHotPlacesSection />

      </div>

      <Footer />

      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>
    </main>
  );
}
