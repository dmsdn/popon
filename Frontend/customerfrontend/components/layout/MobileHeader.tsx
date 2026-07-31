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
      <header className="flex items-center gap-3 h-14 px-4 border-b border-gray-100 dark:border-[#282B32]">
        <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="text-gray-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Icon/back_arrow.svg" alt="" width={48} height={48} />
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
    <header className="flex items-center justify-between h-14 px-4 border-b border-gray-100 dark:border-[#282B32]">
      <Link href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Icon/LOGO_Light.svg" alt="POP-ON" className="h-5 w-auto dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Icon/LOGO_Dark.svg" alt="POP-ON" className="h-5 w-auto hidden dark:block" />
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/search" aria-label="검색">
          <Image src="/Icon/Bar_Search.svg" alt="검색" width={20} height={20} />
        </Link>
        <Link href="/notifications" aria-label="알림">
          <Image src="/Icon/notification_on.svg" alt="알림" width={20} height={20} />
        </Link>
      </div>
    </header>
  );
}
