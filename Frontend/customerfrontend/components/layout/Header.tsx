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
  const { isLoggedIn } = useAuth();

  return (
    <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
      <Link href="/" className="font-bold text-lg flex-none">팝업</Link>

      <div
        className="relative flex-1"
        onFocus={() => setIsSearchOpen(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsSearchOpen(false);
          }
        }}
      >
        <SearchInput initialQuery={initialQuery} />

        {isSearchOpen && (
          <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50">
            <RecentSearches />
            <SuggestedKeywords />
          </div>
        )}
      </div>

      <Link href="/mypage?menu=예약 / 웨이팅" aria-label="예약/웨이팅">
        <Image src="/icon/Bar_Calender.svg" alt="예약/웨이팅" width={24} height={24} />
      </Link>
      <Link href="/notifications" aria-label="알림">
        <Image src="/icon/notification_on.svg" alt="알림" width={24} height={24} />
      </Link>
      <Link href="/more" aria-label="더보기">
        <Image src="/icon/Bar_Other.svg" alt="더보기" width={24} height={24} />
      </Link>
      <Link href={isLoggedIn ? "/mypage" : "/login"} aria-label="마이페이지">
        <Image
          src={isLoggedIn ? "/icon/loginuser.svg" : "/icon/Bar_User.svg"}
          alt="마이페이지"
          width={24}
          height={24}
        />
      </Link>
    </header>
  );
}