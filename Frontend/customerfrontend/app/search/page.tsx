// app/search/page.tsx
"use client";

import { use, useEffect, useMemo, useState } from "react";
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

const STATUSES = ["예정", "진행중", "종료"] as const;

// ⚠️ 백엔드 Popup 테이블에 카테고리 컬럼이 없어서, 실제 팝업 데이터에는 category 값이
// 전혀 안 붙어있어요. 그래서 목록에서 자동으로 뽑는 대신 고정된 카테고리 목록을 보여주고,
// 선택하면 일단 팝업 이름/지역에 그 단어가 들어간 것만 걸러주는 임시 방식으로 동작해요.
// (진짜 카테고리 분류가 아니라 텍스트 매칭이라 정확하진 않아요)
const CATEGORIES = ["뷰티", "패션", "애니", "푸드", "스포츠", "라이프", "굿즈", "문구"] as const;

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; region?: string }>;
}) {
  const { q: query, status: statusParam, region: regionParam } = use(searchParams);
  const [category, setCategory] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(regionParam ?? null);
  const [status, setStatus] = useState<(typeof STATUSES)[number] | null>(
    (STATUSES as readonly string[]).includes(statusParam ?? "") ? (statusParam as (typeof STATUSES)[number]) : null
  );
  const [mobileSearchFocused, setMobileSearchFocused] = useState(false);
  const [allPopups, setAllPopups] = useState<PopupItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 검색어 없이 상태/지역 필터만으로 들어온 경우에도 결과 화면을 보여줍니다.
  // (예: 홈 화면 "곧 오픈하는 팝업 더보기" → /search?status=예정)
  const hasActiveFilter = Boolean(query || status || region || category);

  // 검색 대상: 실제 DB의 전체 팝업 (상태 무관하게 다 가져와서 프론트에서 텍스트/필터링)
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

  // ⚠️ 백엔드 Popup 테이블에 카테고리 컬럼이 없어서, 실제 팝업 데이터에는 category 값이
  // 전혀 안 붙어있어요. 그래서 목록에서 자동으로 뽑는 대신 고정된 카테고리 목록을 보여주고,
  // 선택하면 일단 팝업 이름/지역에 그 단어가 들어간 것만 걸러주는 임시 방식으로 동작해요.
  // (진짜 카테고리 분류가 아니라 텍스트 매칭이라 정확하진 않아요 - 아래 관련 안내 참고)

  // 검색어 자체가 지역/운영여부 키워드와 그대로 일치하면(예: "성수", "홍대")
  // 전체 텍스트 검색과 별개로 그 필터 버튼도 같이 선택된 상태로 맞춰줍니다.
  // (q 없이 status/region 파라미터로 바로 들어온 경우는 그 값을 그대로 유지해요.)
  useEffect(() => {
    if (!query) return;
    const q = query.trim();
    setCategory(CATEGORIES.find((c) => c === q) ?? null);
    setRegion(REGIONS.find((r) => r === q) ?? null);
    setStatus(STATUSES.find((s) => s === q) ?? null);
  }, [query, CATEGORIES, REGIONS]);

  const results = useMemo(() => {
    if (!hasActiveFilter) return [];
    const q = query?.trim().toLowerCase() ?? "";

    return allPopups.filter((item) => {
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.category?.toLowerCase().includes(q) ?? false) ||
        (item.location?.toLowerCase().includes(q) ?? false);
      if (!matchesQuery) return false;
      // ⚠️ 실제 category 데이터가 없어서, 선택한 카테고리 단어가 팝업 이름/지역에
      // 포함되는지로 대신 걸러요 (정확한 카테고리 분류는 아니에요).
      if (category) {
        const c = category.toLowerCase();
        const matchesCategory =
          item.name.toLowerCase().includes(c) || (item.location?.toLowerCase().includes(c) ?? false);
        if (!matchesCategory) return false;
      }
      if (region && item.location !== region) return false;
      if (status && item.status !== status) return false;
      return true;
    });
  }, [allPopups, hasActiveFilter, query, category, region, status]);

  const popularForRanking = useMemo(
    () => allPopups.filter((p) => p.status === "진행중").slice(0, 10),
    [allPopups]
  );

  return (
    <main className="pb-16 mobile:pb-0 mobile:max-w-[1000px] mobile:mx-auto">
      {/* 데스크톱: 원래 쓰던 헤더(로고+검색창+아이콘) 그대로, 검색어만 채워서 보여줌 */}
      <div className="hidden mobile:block">
        <Header initialQuery={query ?? ""} />
      </div>

      {/* 모바일: 뒤로가기 + 검색창만 있는 검색 모드 헤더 */}
      <div className="block mobile:hidden">
        <MobileHeader searchMode initialQuery={query ?? ""} onSearchFocusChange={setMobileSearchFocused} />
      </div>

      {hasActiveFilter && !mobileSearchFocused ? (
        <div>
          <div className="px-4 mobile:px-8 pt-3 pb-1">
            <p className="text-sm text-gray-600">
              {query ? (
                <>&quot;{query}&quot; 검색 결과 {loaded ? results.length : "..."}건</>
              ) : (
                <>{loaded ? results.length : "..."}건</>
              )}
            </p>
          </div>

          {/* 카테고리 / 지역 / 운영여부로 결과 좁히기 */}
          <div className="flex flex-col gap-2 px-4 mobile:px-8 py-3 border-b border-gray-100">
            <FilterRow label="카테고리" options={CATEGORIES} selected={category} onSelect={setCategory} />
            <FilterRow label="지역" options={REGIONS} selected={region} onSelect={setRegion} />
            <FilterRow label="운영여부" options={[...STATUSES]} selected={status} onSelect={setStatus} />
          </div>

          {!loaded ? (
            <p className="text-sm text-gray-400 py-16 text-center">불러오는 중...</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-400 py-16 text-center">검색 결과가 없어요.</p>
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

      <Footer />

      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>
    </main>
  );
}

function FilterRow<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly T[];
  selected: T | null;
  onSelect: (value: T | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
      <span className="text-xs text-gray-400 flex-none w-14">{label}</span>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`flex-none text-xs px-3 py-1.5 rounded-full border ${
          selected === null ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600"
        }`}
      >
        전체
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className={`flex-none text-xs px-3 py-1.5 rounded-full border ${
            selected === option ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function SearchResultRow({ item }: { item: PopupItem }) {
  return (
    <Link href={`/popup/${item.id}`} className="flex gap-4 py-4 border-b border-gray-50">
      <div className="relative w-24 h-24 flex-none rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/popup-placeholder.svg" alt="" className="w-full h-full object-cover" />
        <HeartButton popupId={Number(item.id)} className="absolute top-1.5 right-1.5 w-7 h-7" />
      </div>
      <div className="flex flex-col justify-center">
        {item.status && (
          <p className="text-xs text-gray-400 mb-1">{item.status === "예정" ? "진행예정" : item.status}</p>
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
