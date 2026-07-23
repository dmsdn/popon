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
import { RankingSection } from "@/components/home/RankingSection";
import {
  recentPopups,
  popularPopups,
  openingSoonPopups,
  freePopups,
  type PopupItem,
} from "@/data/mockPopups";

// ⚠️ mock 배열들이 서로 다른 id 체계를 쓰고 있어서(각자 "1"부터 매김),
//    검색 대상 목록은 이름 기준으로 중복 제거해서 하나로 합칩니다.
function buildSearchablePopups(): PopupItem[] {
  const all = [...recentPopups, ...popularPopups, ...openingSoonPopups, ...freePopups];
  const byName = new Map<string, PopupItem>();
  all.forEach((item) => {
    if (!byName.has(item.name)) byName.set(item.name, item);
  });
  return [...byName.values()];
}

const ALL_POPUPS = buildSearchablePopups();
const REGIONS = [...new Set(ALL_POPUPS.map((p) => p.location).filter((v): v is string => !!v))];
const CATEGORIES = [...new Set(ALL_POPUPS.map((p) => p.category).filter((v): v is string => !!v))];
const STATUSES = ["예정", "진행중", "종료"] as const;

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: query } = use(searchParams);
  const [category, setCategory] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [status, setStatus] = useState<(typeof STATUSES)[number] | null>(null);

  // 검색어 자체가 카테고리/지역/운영여부 키워드와 그대로 일치하면(예: "성수", "홍대")
  // 전체 텍스트 검색과 별개로 그 필터 버튼도 같이 선택된 상태로 맞춰줍니다.
  // 그 외의 일반 검색어는 필터 없이 전체 검색으로 동작해요.
  useEffect(() => {
    const q = query?.trim() ?? "";
    setCategory(CATEGORIES.find((c) => c === q) ?? null);
    setRegion(REGIONS.find((r) => r === q) ?? null);
    setStatus(STATUSES.find((s) => s === q) ?? null);
  }, [query]);

  const results = useMemo(() => {
    if (!query) return [];
    const q = query.trim().toLowerCase();

    return ALL_POPUPS.filter((item) => {
      const matchesQuery =
        item.name.toLowerCase().includes(q) ||
        (item.category?.toLowerCase().includes(q) ?? false) ||
        (item.location?.toLowerCase().includes(q) ?? false);
      if (!matchesQuery) return false;
      if (category && item.category !== category) return false;
      if (region && item.location !== region) return false;
      if (status && item.status !== status) return false;
      return true;
    });
  }, [query, category, region, status]);

  return (
    <main className="pb-16 mobile:pb-0 mobile:max-w-[1000px] mobile:mx-auto">
      {/* 데스크톱: 원래 쓰던 헤더(로고+검색창+아이콘) 그대로, 검색어만 채워서 보여줌 */}
      <div className="hidden mobile:block">
        <Header initialQuery={query ?? ""} />
      </div>

      {/* 모바일: 뒤로가기 + 검색창만 있는 검색 모드 헤더 */}
      <div className="block mobile:hidden">
        <MobileHeader searchMode initialQuery={query ?? ""} />
      </div>

      {query ? (
        <div>
          <div className="px-4 mobile:px-8 pt-3 pb-1">
            <p className="text-sm text-gray-600">
              &quot;{query}&quot; 검색 결과 {results.length}건
            </p>
          </div>

          {/* 카테고리 / 지역 / 운영여부로 결과 좁히기 */}
          <div className="flex flex-col gap-2 px-4 mobile:px-8 py-3 border-b border-gray-100">
            <FilterRow label="카테고리" options={CATEGORIES} selected={category} onSelect={setCategory} />
            <FilterRow label="지역" options={REGIONS} selected={region} onSelect={setRegion} />
            <FilterRow label="운영여부" options={[...STATUSES]} selected={status} onSelect={setStatus} />
          </div>

          {results.length === 0 ? (
            <p className="text-sm text-gray-400 py-16 text-center">검색 결과가 없어요.</p>
          ) : (
            <div className="flex flex-col px-4 mobile:px-8">
              {results.map((item) => (
                <SearchResultRow key={item.name} item={item} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mobile:px-4">
          <RecentSearches />
          <SuggestedKeywords />
          <RankingSection title="실시간 인기 추천 팝업" items={popularPopups} />
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
      <div className="w-20 h-20 flex-none rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/popup-placeholder.svg" alt="" className="w-full h-full object-cover" />
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
