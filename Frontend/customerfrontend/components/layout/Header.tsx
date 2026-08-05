"use client";

// 웹(데스크톱) 전용 상단바 - 검색창, 웨이팅·예약/알림 아이콘(배지 포함), 마이페이지 링크.
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SearchInput } from "@/components/search/SearchInput";
import { RecentSearches } from "@/components/search/RecentSearches";
import { SuggestedKeywords } from "@/components/search/SuggestedKeywords";
import { useAuth } from "@/lib/auth/AuthContext";
import { useActiveQueueCount } from "@/lib/useActiveQueueCount";
import { useUnreadNotificationCount } from "@/lib/useUnreadNotificationCount";

export function Header({ initialQuery = "" }: { initialQuery?: string }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isLoggedIn, customer } = useAuth();
  const activeQueueCount = useActiveQueueCount();
  const unreadCount = useUnreadNotificationCount();

  return (
    <header className="flex items-center gap-4 h-14 px-4">
      <Link href="/" className="flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/ui/LOGO_Light.svg" alt="POP-ON" className="h-6 w-auto dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/ui/LOGO_Dark.svg" alt="POP-ON" className="h-6 w-auto hidden dark:block" />
      </Link>

      <div
        className="relative flex-1"
        onFocus={() => setIsSearchOpen(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsSearchOpen(false);
          }
        }}
      >
        <SearchInput initialQuery={initialQuery} onFocusChange={setIsSearchOpen} />

        {isSearchOpen && (
          <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-[#282B32] border border-gray-200 dark:border-[#282B32] rounded-xl shadow-lg z-50">
            <RecentSearches onNavigate={() => setIsSearchOpen(false)} />
            <SuggestedKeywords onNavigate={() => setIsSearchOpen(false)} />
          </div>
        )}
      </div>

      <Link href="/mypage?menu=웨이팅 / 예약" aria-label="웨이팅/예약" className="relative">
        <>
          <Image src="/icons/ui/Bar_Calender_active.svg" alt="웨이팅/예약" width={24} height={24} className="dark:hidden" />
          <Image
            src="/icons/ui/Bar_Calender_active_Dark.svg"
            alt="웨이팅/예약"
            width={24}
            height={24}
            className="hidden dark:block"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.src = "/icons/ui/Bar_Calender_active.svg";
              img.classList.add("invert");
            }}
          />
        </>
        {/* [신규] 활성 웨이팅/예약 개수를 동그란 말풍선 배지로 - 다른 말풍선처럼
            살짝 동동 뜨는 애니메이션을 넣었어요. */}
        {activeQueueCount > 0 && (
          <span className="animate-float absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-point text-white text-sm font-bold flex items-center justify-center leading-none">
            {activeQueueCount}
          </span>
        )}
      </Link>
      <Link href="/notifications" aria-label="알림" className="relative">
        <Image src="/icons/ui/notification_on.svg" alt="알림" width={24} height={24} className="dark:invert" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-sm font-bold flex items-center justify-center leading-none">
            {unreadCount}
          </span>
        )}
      </Link>
      {/* [수정 8/5] 공개 메뉴(화면 설정 등)가 /login 페이지 안으로 옮겨가서,
          마이페이지는 다시 로그인 전용이에요. 로그아웃 상태면 그 메뉴가 있는
          /login으로 보내요. */}
      <Link href={isLoggedIn ? "/mypage" : "/login"} aria-label="마이페이지">
        {isLoggedIn && customer?.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customer.profileImage}
            alt="마이페이지"
            width={24}
            height={24}
            className="rounded-full object-cover"
          />
        ) : (
          <>
            <Image src="/icons/ui/Bar_User_active.svg" alt="마이페이지" width={24} height={24} className="dark:hidden" />
            <Image
              src="/icons/ui/Bar_User_active_Dark.svg"
              alt="마이페이지"
              width={24}
              height={24}
              className="hidden dark:block"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.src = "/icons/ui/Bar_User_active.svg";
                img.classList.add("invert");
              }}
            />
          </>
        )}
      </Link>
    </header>
  );
}