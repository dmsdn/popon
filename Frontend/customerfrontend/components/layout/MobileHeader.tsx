// components/layout/MobileHeader.tsx
"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchInput } from "@/components/search/SearchInput";

interface MobileHeaderProps {
  // 검색 결과 화면(/search)에서는 로고 대신 뒤로가기 + 검색창을 보여줍니다.
  searchMode?: boolean;
  initialQuery?: string;
  onSearchFocusChange?: (focused: boolean) => void;
}

export function MobileHeader({
  searchMode = false,
  initialQuery = "",
  onSearchFocusChange,
}: MobileHeaderProps) {
  const router = useRouter();

  if (searchMode) {
    return (
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="text-gray-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <SearchInput autoFocus={!initialQuery} initialQuery={initialQuery} onFocusChange={onSearchFocusChange} />
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <Link href="/" className="text-lg font-bold tracking-tight">
        팝업
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/search" aria-label="검색">
          <Image src="/icon/Bar_Search.svg" alt="검색" width={20} height={20} />
        </Link>
        <Link href="/notifications" aria-label="알림">
          <Image src="/icon/notification_on.svg" alt="알림" width={20} height={20} />
        </Link>
      </div>
    </header>
  );
}
