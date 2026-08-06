// components/search/SearchInput.tsx
// 검색어 입력창 컴포넌트 - 포커스 상태를 부모에 알리고, 검색 시 최근 검색어에 기록

"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { addRecentSearch } from "@/lib/searchHistory";

export function SearchInput({
  autoFocus = false,
  initialQuery = "",
  onFocusChange,
}: {
  autoFocus?: boolean;
  initialQuery?: string;
  // 입력창 포커스/블러 시점을 부모에게 알려줌
  //  > 검색결과 화면에서 다시 검색하려고 입력창을 탭했을 때, 최근검색어/추천검색어를 다시 보여줌
  onFocusChange?: (focused: boolean) => void;
}) {
  const [value, setValue] = useState(initialQuery);
  const router = useRouter();
  const isTyping = value.length > 0;

  // /search?q=... 가 바뀌었는데(예: 추천 검색어 클릭, 뒤로가기 등) 이 컴포넌트는 그대로 유지되는 경우 입력창 값도 같이 맞춰줌
  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  function handleSearch() {
    const trimmed = value.trim();
    onFocusChange?.(false);
    // 검색어 없이 눌러도 "전체 보기"로 검색 결과 화면에 들어갈 수 있음
    if (!trimmed) {
      router.push(`/search?all=1`);
      return;
    }
    addRecentSearch(trimmed);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="relative flex-1">
      {isTyping && (
        <>
          <Image
            src="/icons/ui/Bar_Search_active.svg"
            alt=""
            width={24}
            height={24}
            className="absolute left-3 top-1/2 -translate-y-1/2 dark:hidden"
          />
          <Image
            src="/icons/ui/Bar_Search_active_Dark.svg"
            alt=""
            width={24}
            height={24}
            className="absolute left-3 top-1/2 -translate-y-1/2 hidden dark:block"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.src = "/icons/ui/Bar_Search_active.svg";
              img.classList.add("invert");
            }}
          />
        </>
      )}

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => {
          // 추천/최근 검색어를 누르는 클릭이 먼저 처리되도록 살짝 지연 후 닫음
          setTimeout(() => onFocusChange?.(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearch();
        }}
        placeholder="검색해보세요"
        autoFocus={autoFocus}
        enterKeyHint="search"
        className={`w-full bg-white dark:bg-[#282B32] text-gray-900 dark:text-white border border-gray-200 dark:border-[#282B32] rounded-full py-2 text-sm placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 ${
          isTyping ? "pl-9 pr-9" : "pl-4 pr-10"
        }`}
      />

      {isTyping ? (
        <button
          aria-label="입력 지우기"
          onClick={() => setValue("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      ) : (
        <button
          aria-label="검색"
          onClick={handleSearch}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <>
            <Image src="/icons/ui/Bar_Search_active.svg" alt="" width={24} height={24} className="dark:hidden" />
            <Image
              src="/icons/ui/Bar_Search_active_Dark.svg"
              alt=""
              width={24}
              height={24}
              className="hidden dark:block"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.src = "/icons/ui/Bar_Search_active.svg";
                img.classList.add("invert");
              }}
            />
          </>
        </button>
      )}
    </div>
  );
}
