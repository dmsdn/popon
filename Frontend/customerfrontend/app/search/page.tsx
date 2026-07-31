// app/search/page.tsx
"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
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
import { FilterPanel, type FilterTab } from "@/components/search/FilterPanel";

const STATUSES = ["예정", "진행중", "종료"] as const;

// 콤마로 구분된 URL 파라미터를 배열로 (예: "성수,홍대" → ["성수","홍대"])
function parseListParam(v: string | undefined): string[] {
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; region?: string; category?: string; minRating?: string }>;
}) {
  const { q: query, status: statusParam, region: regionParam, category: categoryParam, minRating: minRatingParam } =
    use(searchParams);

  const [categories, setCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  useEffect(() => {
    getKeywords()
      .then((list) => setAllCategories(list.map((k) => k.name)))
      .catch((err) => console.error("키워드 목록 조회 실패", err));
  }, []);

  // [수정] 이제 카테고리/지역/운영여부를 여러 개 동시에 선택할 수 있어요(배열).
  // URL에서 넘어온 값도 콤마로 구분된 여러 개를 한 번에 받아요.
  const [selectedRegions, setSelectedRegions] = useState<string[]>(() => parseListParam(regionParam));
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() =>
    parseListParam(statusParam).filter((s) => (STATUSES as readonly string[]).includes(s))
  );
  useEffect(() => {
    setCategories(parseListParam(categoryParam));
  }, [categoryParam]);
  const [minRating, setMinRating] = useState<number | null>(
    minRatingParam ? Number(minRatingParam) : null
  );

  const [mobileSearchFocused, setMobileSearchFocused] = useState(false);
  const [allPopups, setAllPopups] = useState<PopupItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openFilterTab, setOpenFilterTab] = useState<FilterTab | null>(null);

  const hasActiveFilter = Boolean(
    query || selectedStatuses.length || selectedRegions.length || categories.length || minRating
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

  const REGIONS = useMemo(
    () => [...new Set(allPopups.map((p) => p.location).filter((v): v is string => !!v))],
    [allPopups]
  );

  // 검색어 자체가 지역/운영여부 키워드와 그대로 일치하면 그 필터도 같이 켜줘요.
  // [수정] 검색어가 "새로" 바뀌면(같은 화면에서 다시 검색) 이전에 골라뒀던 필터는
  // 초기화하고, 새 검색어에 맞는 필터만 새로 적용해요. 처음 페이지에 들어올 때(URL에
  // 이미 필터가 있는 경우)는 그대로 유지해요.
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
        (item.location?.toLowerCase().includes(q) ?? false);
      if (!matchesQuery) return false;

      // [수정] 필터 패널에 보여주는 카테고리 목록은 getKeywords()(표준 카테고리)인데,
      // 실제 매칭은 hashtags(주최측이 자유롭게 입력한 해시태그)로 하고 있어서 대부분
      // 안 걸리고 있었어요. keywordNames로 매칭하도록 고쳤어요.
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
      {/* [신규] 검색바 + 필터 줄을 스크롤해도 상단에 붙어있게(sticky) 했어요. */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#101010]">
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

        {hasActiveFilter && !mobileSearchFocused && (
          <div className="flex items-center gap-2 px-4 mobile:px-8 py-3 border-b border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-hide">
            {filterChips.map(({ tab, label, count }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setOpenFilterTab(tab)}
                className={`flex-none flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border ${
                  count > 0 ? "border-gray-900 dark:border-white text-gray-900 dark:text-white font-medium" : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                {label}
                {count > 0 && ` (${count})`}
                <span className="text-sm">⌄</span>
              </button>
            ))}
            <Link
              href="/map"
              className="flex-none flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5"
            >
              <img src="/Icon/pin.svg" alt="" width={13} height={13} className="text-gray-500" />
              지도에서 찾기
            </Link>
          </div>
        )}
      </div>

      <div className="flex-1">
      {hasActiveFilter && !mobileSearchFocused ? (
        <div>
          {/* [수정] "\"검색어\" 검색 결과 N건"이라는 큰 문구 + "필터" 라벨을 없애고,
              결과 개수는 필터 칩들 아래에 작게만 보여줘요. */}
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
          <Link
            href="/map"
            className="flex items-center gap-3 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-4 mx-4 mobile:mx-0 mb-4"
          >
            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-none">
              <img src="/Icon/pin.svg" alt="" className="text-gray-500" width={18} height={18}  />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">지도로 팝업 찾기</p>
              <p className="text-sm text-gray-400">내 주변 팝업을 지도에서 확인해보세요</p>
            </div>
            <span className="text-gray-300 text-lg flex-none">›</span>
          </Link>
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
    <Link href={`/popup/${item.id}`} className="flex gap-4 py-4 border-b border-gray-50">
      <div className="relative w-24 h-24 flex-none rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 overflow-hidden flex items-center justify-center text-sm text-gray-400">
        {item.imageUrl ? (
          <ImageWithFallback src={item.imageUrl} className="w-full h-full object-cover" />
        ) : (
          "이미지"
        )}
        <HeartButton popupId={Number(item.id)} className="absolute top-1.5 right-1.5 w-7 h-7" />
      </div>
      <div className="flex flex-col justify-center">
        {item.status && (
          <p className="text-sm text-gray-400 mb-1">{item.status === "예정" ? "진행예정" : item.status}</p>
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
