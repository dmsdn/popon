// components/layout/BottomTabBar.tsx
// 모바일 전용 하단 탭바 - 홈/바로가기/검색/웨이팅·예약/마이페이지 5개 탭, 웨이팅·예약 탭엔 개수 배지
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useActiveQueueCount } from "@/lib/useActiveQueueCount";
import { useTheme } from "@/lib/theme/ThemeContext";


// ** 네이밍 규칙 **
// {Base}_active.svg         라이트 모드(+ 다크 전용 파일이 없을 때의 기본값)
// {Base}_active_Dark.svg    다크 모드 전용
// {Base}_inactive.svg       라이트 모드
// {Base}_inactive_Dark.svg  다크 모드 전용
export function BottomTabBar() {
  const { isLoggedIn, customer } = useAuth();
  const pathname = usePathname();
  const activeQueueCount = useActiveQueueCount();
  const { theme } = useTheme();

  const tabs = [
    { base: "Bar_Home", label: "홈", href: "/" },
    { base: "Bar_Other", label: "바로가기", href: "/more" },
    { base: "Bar_Search", label: "검색", href: "/search" },
    { base: "Bar_Calender", label: "웨이팅/예약", href: "/mypage?menu=웨이팅 / 예약" },
  ];

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  };

  const iconSrc = (base: string, active: boolean) => {
    const state = active ? "active" : "inactive";
    return theme === "dark" ? `/icons/ui/${base}_${state}_Dark.svg` : `/icons/ui/${base}_${state}.svg`;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around bg-white dark:bg-[#17181a] py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.3)]">
      {tabs.map(({ base, label, href }) => {
        const active = isActive(href);
        return (
          <Link key={label} href={href} aria-label={label} className="relative flex flex-col items-center gap-1 p-2">
            <Image
              src={iconSrc(base, active)}
              alt={label}
              width={24}
              height={24}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                const state = active ? "active" : "inactive";
                const lightSrc = `/icons/ui/${base}_${state}.svg`;
                if (img.src.endsWith("_Dark.svg")) {
                  img.src = lightSrc;
                  img.className = "dark:invert";
                } else {
                  img.src = `/icons/ui/${base}_inactive.svg`;
                }
              }}
            />
            {base === "Bar_Calender" && activeQueueCount > 0 && (
              <span className="animate-float absolute top-0 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-point text-white text-sm font-bold flex items-center justify-center leading-none">
                {activeQueueCount}
              </span>
            )}
          </Link>
        );
      })}

      <Link
        href={isLoggedIn ? "/mypage" : "/login"}
        aria-label="마이"
        className="flex flex-col items-center gap-1 p-2"
      >
        {isLoggedIn && customer?.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={customer.profileImage} alt="" width={24} height={24} className="rounded-full object-cover" />
        ) : (
          <Image
            src={iconSrc("Bar_User", isActive("/mypage"))}
            alt="마이"
            width={24}
            height={24}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              const state = isActive("/mypage") ? "active" : "inactive";
              const lightSrc = `/icons/ui/Bar_User_${state}.svg`;
              if (img.src.endsWith("_Dark.svg")) {
                img.src = lightSrc;
                img.className = "dark:invert";
              } else {
                img.src = "/icons/ui/Bar_User_inactive.svg";
              }
            }}
          />
        )}
      </Link>
    </nav>
  );
}
