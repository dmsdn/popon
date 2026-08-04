// app/search/page.tsx
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

// [신규] "지도로 팝업 찾기" 진입 카드 - 모바일 검색 초기 화면에서 써요.
// [수정] 카드 배경은 다크모드에서도 회색 톤이 나오게 하고, 아이콘은
// 다크모드 반전 없이 항상 그대로 보이게 했어요(카드 배경과 아이콘 반전을
// 헷갈려서 처음에 아이콘까지 같이 반전시켰었어요 - 아이콘만 빼고 배경만
// 다크모드를 적용해요).
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

// [수정] 진짜 원인을 찾았어요 - 이 페이지가 "use client"인데 searchParams를
// Next.js가 넘겨주는 Promise prop(use(searchParams))으로 읽고 있었어요. 이
// 방식은 클라이언트 컴포넌트에서는 "처음 이 페이지로 들어올 때" 딱 한 번만
// 값이 들어오고, 이미 이 페이지에 있는 상태에서 router.push("/search?q=...")로
// 쿼리스트링만 바꾸는 "같은 페이지 안 이동"에는 반응하지 않아요 - 그래서 최근
// 검색어/추천 검색어를 눌러도 URL만 바뀌고 화면(query 값)은 그대로였던 거예요.
// 필터 패널만 멀쩡했던 건 필터는 URL이 아니라 로컬 state(setCategories 등)를
// 직접 바꾸는 방식이라 이 문제에 안 걸렸던 거고요.
// useSearchParams() 훅으로 바꾸면 같은 페이지 안에서의 쿼리 변경에도 정상적으로
// 반응해요. 이 훅은 Suspense 경계가 필요해서, 기존 컴포넌트를 SearchPageInner로
// 옮기고 바깥에 Suspense로 감싸는 구조로 바꿨어요(다른 페이지들과 같은 패턴이에요).
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
  // [신규] 검색어 없이 "검색"을 눌렀을 때 전체 결과를 보여주기 위한 표시.
  // query가 빈 문자열이면 URL에 남지 않아서(파라미터 자체가 없는 것과
  // 구분이 안 돼서), 별도 마커를 하나 둬요.
  const showAllParam = searchParams.get("all") ?? undefined;

  const [categories, setCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  useEffect(() => {
    getKeywords()
      .then((list) => setAllCategories(list.map((k) => k.name)))
      .catch((err) => console.error("키워드 목록 조회 실패", err));
  }, []);

  // [수정] 이제 카테고리/지역/운영여부를 여러 개 동시에 선택할 수 있어요(배열).
  // URL에서 넘어온 값도 콤마로 구분된 여러 개를 한 번에 받아요.
  // [수정] useState(() => ...) 형태의 초기값 함수는 첫 렌더링 때 딱 한 번만
  // 실행돼요 - 그래서 categories만 useEffect로 URL 변경에 반응하고 있었고,
  // regions/statuses/minRating은 같은 페이지 안에서 URL이 바뀌어도 안 따라가는
  // 상태였어요. 같은 방식(useEffect)으로 통일했어요.
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

  // [수정] 검색어 없이 "검색"을 눌러도 결과 화면(=전체 목록)으로 들어올 수
  // 있게, all 마커도 조건에 포함시켰어요.
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

  // [수정] REGIONS를 "지금 불러온 팝업들의 regionId/location"에서 유추하고
  // 있었는데, 마이페이지 "관심 지역"은 지역 카탈로그(getRegions)를 직접
  // 불러와서 항상 전체 목록이 잘 뜨는 반면, 이 필터는 팝업 데이터에 의존하다
  // 보니 regionId가 아직 안 채워진 팝업이 많으면 목록이 통째로 비어버렸어요.
  // "관심 지역"과 똑같이 지역 카탈로그를 직접 불러오도록 바꿔서, 팝업 쪽
  // 데이터 상태와 무관하게 항상 정확한 전체 지역 목록이 뜨게 했어요.
  const [REGIONS, setRegions] = useState<string[]>([]);
  useEffect(() => {
    getRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch((err) => console.error("지역 목록 조회 실패", err));
  }, []);

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
        (item.location?.toLowerCase().includes(q) ?? false) ||
        // [신규] 브랜드(주최사) 이름으로 검색하면 그 브랜드의 팝업이 검색되게.
        (item.brandName?.toLowerCase().includes(q) ?? false);
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

        {/* [수정] 필터 칩 바가 hasActiveFilter일 때만 보여서, 검색어도 필터도
            하나도 없는 처음 화면에선 필터를 열 방법 자체가 없었어요(닭과 달걀
            문제). 검색창에 타이핑 중이 아니면 항상 보이게 바꿨었는데, 그마저도
            검색바를 탭(포커스)하면 사라져서 최근검색어를 보다가 필터를 못 열게
            됐어요 - 이제 검색바 포커스 여부와 상관없이 항상 보여요. */}
        <div className="flex items-center gap-2 px-4 mobile:px-8 py-3 border-b border-gray-100 dark:border-[#282B32] overflow-x-auto scrollbar-hide">
            {filterChips.map(({ tab, label, count }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setOpenFilterTab(tab)}
                className={`flex-none flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border ${
                  count > 0
                    ? "border-point text-point font-medium"
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
            {/* [신규] 검색 결과에서도 브랜드(주최사) 이름을 상태 옆에 보여줘요. */}
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
