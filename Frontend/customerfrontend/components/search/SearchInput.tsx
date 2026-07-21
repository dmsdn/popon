// components/search/SearchInput.tsx
"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchInput({ autoFocus = false }: { autoFocus?: boolean }) {
  const [value, setValue] = useState("");
  const router = useRouter();
  const isTyping = value.length > 0;

  function handleSearch() {
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="relative flex-1">
      {isTyping && (
        <Image
          src="/icon/Bar_Search.svg"
          alt=""
          width={16}
          height={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
        />
      )}

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearch();
        }}
        placeholder="검색해보세요"
        autoFocus={autoFocus}
        enterKeyHint="search"
        className={`w-full border border-gray-200 rounded-full py-2 text-sm placeholder:text-gray-400 ${
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
          <Image src="/icon/Bar_Search.svg" alt="" width={16} height={16} />
        </button>
      )}
    </div>
  );
}