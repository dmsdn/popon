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
import { LoadingState, EmptyState } from "@/components/ui/EmptyState";
import { getKeywords } from "@/lib/api/customer";

const STATUSES = ["예정", "진행중", "종료"] as const;

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; region?: string }>;
}) {
  const { q: query, status: statusParam, region: regionParam } = use(searchParams);
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    getKeywords()
      .then((list) => setCategories(list.map((k) => k.name)))
      .catch((err) => console.error("키워드 목록 조회 실패", err));
  }, []);
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

  // 검색어 자체가 지역/운영여부 키워드와 그대로 일치하면(예: "성수", "홍대")
  // 전체 텍스트 검색과 별개로 그 필터 버튼도 같이 선택된 상태로 맞춰줍니다.
  // (q 없이 status/region 파라미터로 바로 들어온 경우는 그 값을 그대로 유지해요.)
  useEffect(() => {
    if (!query) return;
    const q = query.trim();
    setCategory(categories.find((c) => c === q) ?? null);
    setRegion(REGIONS.find((r) => r === q) ?? null);
    setStatus(STATUSES.find((s) => s === q) ?? null);
  }, [query, categories, REGIONS]);

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
      // [수정] 백엔드에 실제 popup_hashtag 데이터가 생겨서, 이름/지역 텍스트로 카테고리를
      // 유추하던 방식 대신 정확한 해시태그 매칭으로 바꿨어요.
      if (category) {
        const matchesCategory = item.hashtags?.includes(category) ?? false;
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
    <main className="min-h-screen flex flex-col pb-16 mobile:pb-0 mobile:max-w-[1000px] mobile:mx-auto">
      {/* 데스크톱: 원래 쓰던 헤더(로고+검색창+아이콘) 그대로, 검색어만 채워서 보여줌 */}
      <div className="hidden mobile:block">
        <Header initialQuery={query ?? ""} />
      </div>

      {/* 모바일: 뒤로가기 + 검색창만 있는 검색 모드 헤더 */}
      <div className="block mobile:hidden">
        <MobileHeader searchMode initialQuery={query ?? ""} onSearchFocusChange={setMobileSearchFocused} />
      </div>

      {/* [신규] 내용이 짧아도(예: 검색결과 0건) Footer가 화면 중간에 붕 뜨지 않고
          항상 화면 맨 아래에 붙어있도록, 이 사이 영역이 남는 공간을 다 차지하게 해요. */}
      <div className="flex-1">
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
            <span className="text-xs text-gray-400">필터</span>
            <div className="flex items-center gap-2 flex-wrap">
              <FilterDropdown label="카테고리" options={categories} selected={category} onSelect={setCategory} />
              <FilterDropdown label="지역" options={REGIONS} selected={region} onSelect={setRegion} />
              <FilterDropdown label="운영여부" options={[...STATUSES]} selected={status} onSelect={setStatus} />
              {/* [수정] "지도로 보기" 문구를 "지도에서 찾기"로 바꾸고, 필터 칩들 옆으로
                  옮겼어요(기존엔 따로 한 줄을 차지하고 있었어요). */}
              <Link
                href="/map"
                className="flex-none flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-full px-3 py-1.5"
              >
                <img src="/icon/pin.svg" alt="" width={13} height={13} className="text-gray-500" />
                지도에서 찾기
              </Link>
            </div>
          </div>

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
            className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-4 mx-4 mobile:mx-0 mb-4"
          >
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-none">
              <img src="/icon/pin.svg" alt="" className="text-gray-500" width={18} height={18}  />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">지도로 팝업 찾기</p>
              <p className="text-xs text-gray-400">내 주변 팝업을 지도에서 확인해보세요</p>
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
    </main>
  );
}

function FilterDropdown<T extends string>({
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
  const [open, setOpen] = useState(false);
  // [신규] 드롭다운 목록을 마우스로 클릭+드래그해서 위아래로 스크롤할 수 있게 -
  // 스크롤바를 안 보이게 하는 대신, 데스크탑 마우스 사용자도 스크롤할 방법이
  // 있어야 해서 추가했어요. (터치/트랙패드는 원래도 자연스럽게 스크롤 가능)
  const dropdownScrollRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartScrollTop = useRef(0);
  const handleDropdownMouseDown = (e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
    dragStartScrollTop.current = dropdownScrollRef.current?.scrollTop ?? 0;
  };
  const handleDropdownMouseMove = (e: React.MouseEvent) => {
    if (dragStartY.current === null || !dropdownScrollRef.current) return;
    const delta = e.clientY - dragStartY.current;
    dropdownScrollRef.current.scrollTop = dragStartScrollTop.current - delta;
  };
  const handleDropdownDragEnd = () => {
    dragStartY.current = null;
  };
  const ref = useRef<HTMLDivElement>(null);

  // 바깥을 누르면 드롭다운이 닫히게
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border ${
          selected ? "border-gray-900 text-gray-900 font-medium" : "border-gray-200 text-gray-600"
        }`}
      >
        {selected ?? label}
        <span className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {open && (
        <div
          ref={dropdownScrollRef}
          onMouseDown={handleDropdownMouseDown}
          onMouseMove={handleDropdownMouseMove}
          onMouseUp={handleDropdownDragEnd}
          onMouseLeave={handleDropdownDragEnd}
          className="absolute top-full left-0 mt-1.5 z-20 bg-white border border-gray-200 rounded-xl shadow-md p-2 flex flex-col gap-0.5 min-w-[120px] max-h-60 overflow-y-auto scrollbar-hide cursor-grab active:cursor-grabbing"
        >
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className={`text-left text-xs px-3 py-2 rounded-lg ${
              selected === null ? "bg-gray-100 font-medium text-gray-900" : "text-gray-600"
            }`}
          >
            전체
          </button>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onSelect(option);
                setOpen(false);
              }}
              className={`text-left text-xs px-3 py-2 rounded-lg ${
                selected === option ? "bg-gray-100 font-medium text-gray-900" : "text-gray-600"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
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
