"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SearchInput } from "@/components/search/SearchInput";
import { RecentSearches } from "@/components/search/RecentSearches";
import { SuggestedKeywords } from "@/components/search/SuggestedKeywords";
import { useAuth } from "@/lib/auth/AuthContext";

export function Header({ initialQuery = "" }: { initialQuery?: string }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isLoggedIn, customer } = useAuth();

  return (
    <header className="flex items-center gap-4 h-14 px-4 border-b border-gray-100 dark:border-[#282B32]">
      <Link href="/" className="flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Icon/LOGO_Light.svg" alt="POP-ON" className="h-6 w-auto dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Icon/LOGO_Dark.svg" alt="POP-ON" className="h-6 w-auto hidden dark:block" />
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

      <Link href="/mypage?menu=예약 / 웨이팅" aria-label="예약/웨이팅">
        <Image src="/Icon/Bar_Calender.svg" alt="예약/웨이팅" width={24} height={24} className="dark:invert" />
      </Link>
      <Link href="/notifications" aria-label="알림">
        <Image src="/Icon/notification_on.svg" alt="알림" width={24} height={24} className="dark:invert" />
      </Link>
      <Link href="/more" aria-label="더보기">
        <Image src="/Icon/Bar_Other.svg" alt="더보기" width={24} height={24} className="dark:invert" />
      </Link>
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
          <Image src="/Icon/Bar_User.svg" alt="마이페이지" width={24} height={24} className="dark:invert" />
        )}
      </Link>
    </header>
  );
}