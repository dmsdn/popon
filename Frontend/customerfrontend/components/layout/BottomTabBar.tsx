"use client";

// 모바일 전용 하단 탭바 - 홈/바로가기/검색/웨이팅·예약/마이페이지 5개 탭, 웨이팅·예약 탭엔 개수 배지.

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useActiveQueueCount } from "@/lib/useActiveQueueCount";

/**
 * [수정] 하단바 아이콘을 활성/비활성 상태에 따라 다른 파일로 바꿔요.
 * 지금 있는 페이지랑 탭의 href가 일치하면 "_active"(꽉 찬 아이콘), 아니면
 * "_inactive"(선 아이콘) 파일을 써요.
 *
 * ⚠️ public/icons/ui/에는 각 아이콘의 "_inactive"(선) 버전만 있고, 꽉 찬(active)
 * 버전은 아직 없어요. 그래서 지금은 active 파일이 없으면 자동으로 inactive로
 * 대체돼요(onError) - 꽉 찬 버전 파일(Bar_Home_active.svg, Bar_Other_active.svg,
 * Bar_Search_active.svg, Bar_Calender_active.svg, Bar_User_active.svg)을 주시면
 * 바로 반영됩니다.
 */
export function BottomTabBar() {
  const { isLoggedIn, customer } = useAuth();
  const pathname = usePathname();
  const activeQueueCount = useActiveQueueCount();

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around bg-white dark:bg-[#17181a] py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.3)]">
      {tabs.map(({ base, label, href }) => {
        const active = isActive(href);
        const icon = active ? `/icons/ui/${base}_active.svg` : `/icons/ui/${base}_inactive.svg`;
        return (
          <Link key={label} href={href} aria-label={label} className="relative flex flex-col items-center gap-1 p-2">
            <Image
              src={icon}
              alt={label}
              width={24}
              height={24}
              className="dark:invert"
              onError={(e) => {
                // _active 파일이 아직 없으면 조용히 _inactive로 대체 (깨진 이미지 방지)
                (e.currentTarget as HTMLImageElement).src = `/icons/ui/${base}_inactive.svg`;
              }}
            />
            {/* [신규] 웨이팅/예약 탭에만 활성 개수를 동동 뜨는 말풍선 배지로 */}
            {base === "Bar_Calender" && activeQueueCount > 0 && (
              <span className="animate-float absolute top-0 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-point text-white text-sm font-bold flex items-center justify-center leading-none">
                {activeQueueCount}
              </span>
            )}
          </Link>
        );
      })}

      {/* [수정] 로그인했을 때 초록색 아이콘(loginuser.svg)이 뜨고 있었는데, 프로필
          사진이 있는데도 그냥 아이콘만 보여서 "내 계정"이라는 느낌이 약했어요.
          실제 프로필 사진이 있으면 그걸 보여주고, 없으면 기본 회색 아이콘을 써요. */}
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
            src={isActive("/mypage") ? "/icons/ui/Bar_User_active.svg" : "/icons/ui/Bar_User_inactive.svg"}
            alt="마이"
            width={24}
            height={24}
            className="dark:invert"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/icons/ui/Bar_User_inactive.svg";
            }}
          />
        )}
      </Link>
    </nav>
  );
}
