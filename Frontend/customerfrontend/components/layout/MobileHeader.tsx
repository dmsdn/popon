// components/layout/MobileHeader.tsx
// 모바일 전용 상단바 - 기본은 로고, 검색 화면에서는 뒤로가기+검색창으로 전환
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchInput } from "@/components/search/SearchInput";
import { useUnreadNotificationCount } from "@/lib/useUnreadNotificationCount";

interface MobileHeaderProps {
  // 검색 결과 화면(/search)에서는 로고 대신 뒤로가기 + 검색창
  searchMode?: boolean;
  initialQuery?: string;
  onSearchFocusChange?: (focused: boolean) => void;
  disableAutoFocus?: boolean;
}

export function MobileHeader({
  searchMode = false,
  initialQuery = "",
  onSearchFocusChange,
  disableAutoFocus = false,
}: MobileHeaderProps) {
  const router = useRouter();
  const unreadCount = useUnreadNotificationCount();

  if (searchMode) {
    return (
      <header className="flex items-center gap-3 h-14 px-4 ">
        <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="text-gray-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
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
    <header className="flex items-center justify-between h-14 px-4 ">
      <Link href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/ui/LOGO_Light.svg" alt="POP-ON" className="h-5 w-auto dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/ui/LOGO_Dark.svg" alt="POP-ON" className="h-5 w-auto hidden dark:block" />
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/search" aria-label="검색">
          <Image src="/icons/ui/Bar_Search_active.svg" alt="검색" width={20} height={20} className="dark:hidden" />
          <Image
            src="/icons/ui/Bar_Search_active_Dark.svg"
            alt="검색"
            width={20}
            height={20}
            className="hidden dark:block"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.src = "/icons/ui/Bar_Search_active.svg";
              img.classList.add("invert");
            }}
          />
        </Link>
        <Link href="/notifications" aria-label="알림" className="relative">
          <Image src="/icons/ui/notification_on.svg" alt="알림" width={20} height={20} className="dark:invert" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-red-500 text-white text-sm font-bold flex items-center justify-center leading-none">
              {unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
