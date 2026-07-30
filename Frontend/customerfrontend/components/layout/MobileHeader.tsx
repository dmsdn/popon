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
  // [신규] 텍스트 검색어(q)는 없어도 지역/카테고리 같은 필터로 들어온 경우엔
  // 검색창에 자동 포커스가 가면 안 돼요(포커스 가면 필터링된 결과 화면 대신
  // "최근 검색어" 화면이 떠버렸어요 - 모바일에서 "관심 지역 더보기" 눌렀을 때
  // 지역이 선택된 결과 화면 대신 검색 초기 화면으로 튕기던 버그의 원인이었어요).
  disableAutoFocus?: boolean;
}

export function MobileHeader({
  searchMode = false,
  initialQuery = "",
  onSearchFocusChange,
  disableAutoFocus = false,
}: MobileHeaderProps) {
  const router = useRouter();

  if (searchMode) {
    return (
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="text-gray-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <SearchInput
          autoFocus={!initialQuery && !disableAutoFocus}
          initialQuery={initialQuery}
          onFocusChange={onSearchFocusChange}
        />
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <Link href="/" className="text-lg font-bold tracking-tight text-point">
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
