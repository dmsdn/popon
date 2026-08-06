// app/search/page.tsx
// 검색 결과 페이지 - 검색어/카테고리/지역/운영여부/별점 필터 적용

"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { RecentSearches } from "@/components/search/RecentSearches";
import { SuggestedKeywords } from "@/components/search/SuggestedKeywords";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { PopupCard } from "@/components/home/PopupCard";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { type PopupItem } from "@/data/mockPopups";
import { HeartButton } from "@/components/ui/HeartButton";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { LoadingState, EmptyState } from "@/components/ui/EmptyState";
import { getKeywords } from "@/lib/api/customer";
import { getRegions } from "@/lib/api/regions";
import { FilterPanel, type FilterTab } from "@/components/search/FilterPanel";

const STATUSES = ["예정", "진행중", "종료"] as const;

// "지도로 팝업 찾기" 진입 카드 (모바일 검색 초기 화면)
function MapFindCard() {
  return (
    <Link
      href="/map"
      className="flex items-center gap-3 border border-gray-200 dark:border-[#282B32] rounded-xl px-4 py-4 mb-4 bg-gray-50 dark:bg-[#282B32]"
    >
      <img src="/icons/ui/pin.svg" alt="" width={28} height={28} className="flex-none" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">지도로 팝업 찾기</p>
        <p className="text-sm text-gray-400">내 주변 팝업을 지도에서 확인해보세요</p>
      </div>
      <span className="text-gray-300 text-lg flex-none">›</span>
    </Link>
  );
}

// 콤마로 구분된 URL 파라미터를 배열로 (예: "성수,홍대" → ["성수","홍대"])
function parseListParam(v: string | undefined): string[] {
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

// useSearchParams() 훅 사용 (같은 페이지 내 쿼리스트링 변경 감지). Suspense 경계 필요해 SearchPageInner로 분리
export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;
  const regionParam = searchParams.get("region") ?? undefined;
  const categoryParam = searchParams.get("category") ?? undefined;
  const minRatingParam = searchParams.get("minRating") ?? undefined;
  // 검색어 없이 "검색" 클릭 시 전체 결과 표시용 마커
  const showAllParam = searchParams.get("all") ?? undefined;

  const [categories, setCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  useEffect(() => {
    getKeywords()
      .then((list) => setAllCategories(list.map((k) => k.name)))
      .catch((err) => console.error("키워드 목록 조회 실패", err));
  }, []);

  // 카테고리/지역/운영여부 다중 선택(배열), URL 콤마 구분 파싱. 전부 useEffect로 URL 변경 반응 통일
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  useEffect(() => {
    setSelectedRegions(parseListParam(regionParam));
  }, [regionParam]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  useEffect(() => {
    setSelectedStatuses(parseListParam(statusParam).filter((s) => (STATUSES as readonly string[]).includes(s)));
  }, [statusParam]);
  useEffect(() => {
    setCategories(parseListParam(categoryParam));
  }, [categoryParam]);
  const [minRating, setMinRating] = useState<number | null>(null);
  useEffect(() => {
    setMinRating(minRatingParam ? Number(minRatingParam) : null);
  }, [minRatingParam]);

  const [mobileSearchFocused, setMobileSearchFocused] = useState(false);
  const [allPopups, setAllPopups] = useState<PopupItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openFilterTab, setOpenFilterTab] = useState<FilterTab | null>(null);

  // 활성 필터 여부 - all 마커 포함
  const hasActiveFilter = Boolean(
    query || showAllParam || selectedStatuses.length || selectedRegions.length || categories.length || minRating
  );

  useEffect(() => {
    let cancelled = false;
    searchPopups()
      .then((list) => {
        if (!cancelled) setAllPopups(list.map(toPopupItem));
      })
      .catch((err) => console.error("검색용 팝업 목록 조회 실패", err))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 지역 목록 - 팝업 데이터 유추 대신 지역 카탈로그(getRegions) 직접 조회
  const [REGIONS, setRegions] = useState<string[]>([]);
  useEffect(() => {
    getRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch((err) => console.error("지역 목록 조회 실패", err));
  }, []);

  // 검색어 자체가 지역/운영여부 키워드와 그대로 일치하면 그 필터도 같이 켜줌
  // 검색어 변경 시 기존 필터 초기화 후 재적용 (최초 진입 시엔 URL 필터 유지)
  const prevQueryRef = useRef(query);
  useEffect(() => {
    const queryChanged = prevQueryRef.current !== query;
    prevQueryRef.current = query;

    if (queryChanged) {
      setCategories([]);
      setSelectedRegions([]);
      setSelectedStatuses([]);
      setMinRating(null);
    }

    if (!query) return;
    const q = query.trim();
    if (allCategories.includes(q)) setCategories((prev) => (prev.includes(q) ? prev : [...prev, q]));
    if (REGIONS.includes(q)) setSelectedRegions((prev) => (prev.includes(q) ? prev : [...prev, q]));
    if ((STATUSES as readonly string[]).includes(q)) {
      setSelectedStatuses((prev) => (prev.includes(q) ? prev : [...prev, q]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, allCategories, REGIONS]);

  const results = useMemo(() => {
    if (!hasActiveFilter) return [];
    const q = query?.trim().toLowerCase() ?? "";

    return allPopups.filter((item) => {
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.hashtags?.some((h) => h.toLowerCase().includes(q)) ?? false) ||
        (item.keywordNames?.some((k) => k.toLowerCase().includes(q)) ?? false) ||
        (item.location?.toLowerCase().includes(q) ?? false) ||
        (item.brandName?.toLowerCase().includes(q) ?? false); // 브랜드명 검색 지원
      if (!matchesQuery) return false;

      // 카테고리 필터 매칭 - keywordNames 기준(hashtags 아님)
      if (categories.length > 0) {
        const matches = categories.some((c) => item.keywordNames?.includes(c));
        if (!matches) return false;
      }
      if (selectedRegions.length > 0 && !selectedRegions.includes(item.location ?? "")) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status ?? "")) return false;
      if (minRating && (item.avgRating ?? 0) < minRating) return false;
      return true;
    });
  }, [allPopups, hasActiveFilter, query, categories, selectedRegions, selectedStatuses, minRating]);

  const popularForRanking = useMemo(
    () => allPopups.filter((p) => p.status === "진행중").slice(0, 10),
    [allPopups]
  );

  const filterChips: { tab: FilterTab; label: string; count: number }[] = [
    { tab: "카테고리", label: "카테고리", count: categories.length },
    { tab: "지역", label: "지역", count: selectedRegions.length },
    { tab: "운영여부", label: "운영여부", count: selectedStatuses.length },
    { tab: "별점", label: "별점", count: minRating ? 1 : 0 },
  ];

  return (
    <main className="min-h-screen flex flex-col w-full pb-16 mobile:pb-0 mobile:max-w-[1000px] mobile:mx-auto">
      {/* 검색바+필터 sticky 고정 */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#17181a]">
        <div className="hidden mobile:block">
          <Header initialQuery={query ?? ""} />
        </div>
        <div className="block mobile:hidden">
          <MobileHeader
            searchMode
            initialQuery={query ?? ""}
            onSearchFocusChange={setMobileSearchFocused}
            disableAutoFocus={hasActiveFilter}
          />
        </div>

        {/* 필터 칩 바 - 검색바 포커스 여부와 무관하게 항상 표시 */}
        <div className="flex items-center gap-2 px-4 mobile:px-8 py-3 border-b border-gray-100 dark:border-[#282B32] overflow-x-auto scrollbar-hide">
            {filterChips.map(({ tab, label, count }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setOpenFilterTab(tab)}
                className={`flex-none flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border ${
                  count > 0
                    ? "border-point text-[#218B09] font-medium"
                    : "border-gray-200 dark:border-[#282B32] text-gray-600 dark:text-gray-400"
                }`}
              >
                {label}
                {count > 0 && ` (${count})`}
                <img src="/icons/ui/chevron_down.svg" alt="" width={14} height={14} className="dark:invert" />
              </button>
            ))}
            <Link
              href="/map"
              className="flex-none flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#282B32] rounded-full px-3 py-1.5"
            >
              <img src="/icons/ui/pin.svg" alt="" width={13} height={13} className="text-gray-500" />
              지도에서 찾기
            </Link>
          </div>
      </div>

      <div className="flex-1">
      {hasActiveFilter && !mobileSearchFocused ? (
        <div>
          {/* 검색 결과 개수 표시 */}
          <p className="text-sm text-gray-400 px-4 mobile:px-8 pt-2">
            {query ? `"${query}" 검색 결과 ` : ""}
            {loaded ? results.length : "..."}건
          </p>

          {!loaded ? (
            <LoadingState />
          ) : results.length === 0 ? (
            <EmptyState message="검색 결과가 없어요." />
          ) : (
            <div className="flex flex-col px-4 mobile:px-8">
              {results.map((item) => (
                <SearchResultRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mobile:px-4">
          <RecentSearches />
          <div className="mx-4 mobile:mx-0">
            <MapFindCard />
          </div>
          <SuggestedKeywords />
          {!hasActiveFilter && popularForRanking.length > 0 && (
            <section className="px-4 py-4">
              <h2 className="text-sm font-semibold mb-3">인기 추천 팝업</h2>
              <HorizontalCarousel>
                {popularForRanking.map((item, index) => (
                  <PopupCard key={item.id} {...item} rank={index + 1} />
                ))}
              </HorizontalCarousel>
            </section>
          )}
        </div>
      )}
      </div>

      <Footer />

      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>

      {openFilterTab && (
        <FilterPanel
          initialTab={openFilterTab}
          categories={allCategories}
          regions={REGIONS}
          statuses={STATUSES}
          selectedCategories={categories}
          selectedRegions={selectedRegions}
          selectedStatuses={selectedStatuses}
          selectedMinRating={minRating}
          onApply={(next) => {
            setCategories(next.categories);
            setSelectedRegions(next.regions);
            setSelectedStatuses(next.statuses);
            setMinRating(next.minRating);
          }}
          onClose={() => setOpenFilterTab(null)}
        />
      )}
    </main>
  );
}

function SearchResultRow({ item }: { item: PopupItem }) {
  return (
    <Link href={`/popup/${item.id}`} className="flex gap-4 py-4 border-b border-gray-50 dark:border-[#282B32]">
      <div className="relative w-24 h-24 flex-none rounded-lg bg-gray-100 dark:bg-[#282B32] border border-gray-200 dark:border-[#282B32] overflow-hidden flex items-center justify-center text-sm text-gray-400">
        {item.imageUrl ? (
          <ImageWithFallback src={item.imageUrl} className="w-full h-full object-cover" />
        ) : (
          "이미지"
        )}
        <HeartButton popupId={Number(item.id)} className="absolute top-1.5 right-1.5 w-7 h-7" />
      </div>
      <div className="flex flex-col justify-center">
        {(item.status || item.brandName) && (
          <p className="text-sm mb-1 flex items-center gap-1.5">
            {item.status && (
              <span className={item.status === "진행중" ? "text-point font-semibold" : "text-gray-400"}>
                {item.status === "예정" ? "진행예정" : item.status}
              </span>
            )}
            {item.status && item.brandName && <span className="text-gray-300 dark:text-gray-600">·</span>}
            {/* 브랜드명 표시 */}
            {item.brandName && <span className="text-gray-400">{item.brandName}</span>}
          </p>
        )}
        <p className="text-base font-medium">{item.name}</p>
        <div className="flex gap-1.5 text-sm text-gray-400 mt-1">
          {item.category && <span>{item.category}</span>}
          {item.category && item.location && <span>·</span>}
          {item.location && <span>{item.location}</span>}
        </div>
        {item.dateRange && <p className="text-sm text-gray-400 mt-0.5">{item.dateRange}</p>}
      </div>
    </Link>
  );
}
