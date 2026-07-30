// components/search/SearchInput.tsx
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
  // 입력창 포커스/블러 시점을 부모에게 알려줘요 - 검색결과 화면에서 다시 검색하려고
  // 입력창을 탭했을 때, 최근검색어/추천검색어를 다시 보여주는 데 씁니다.
  onFocusChange?: (focused: boolean) => void;
}) {
  const [value, setValue] = useState(initialQuery);
  const router = useRouter();
  const isTyping = value.length > 0;

  // /search?q=... 가 바뀌었는데(예: 추천 검색어 클릭, 뒤로가기 등) 이 컴포넌트는
  // 그대로 유지되는 경우 입력창 값도 같이 맞춰줍니다.
  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  function handleSearch() {
    const trimmed = value.trim();
    if (!trimmed) return;
    addRecentSearch(trimmed);
    onFocusChange?.(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="relative flex-1">
      {isTyping && (
        <Image
          src="/Icon/Bar_Search.svg"
          alt=""
          width={16}
          height={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 dark:invert"
        />
      )}

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => {
          // 추천/최근 검색어를 누르는 클릭이 먼저 처리되도록 살짝 지연 후 닫아요.
          setTimeout(() => onFocusChange?.(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearch();
        }}
        placeholder="검색해보세요"
        autoFocus={autoFocus}
        enterKeyHint="search"
        className={`w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-full py-2 text-sm placeholder:text-gray-400 ${
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
          <Image src="/Icon/Bar_Search.svg" alt="" width={16} height={16} className="dark:invert" />
        </button>
      )}
    </div>
  );
}
