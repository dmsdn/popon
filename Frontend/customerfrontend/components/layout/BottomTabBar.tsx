"use client";

// 모바일 전용 하단 탭바 - 홈/바로가기/검색/웨이팅·예약/마이페이지 5개 탭, 웨이팅·예약 탭엔 개수 배지.

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useActiveQueueCount } from "@/lib/useActiveQueueCount";
import { useTheme } from "@/lib/theme/ThemeContext";

/**
 * [수정] 하단바 아이콘을 활성/비활성 상태 + 다크/라이트 테마에 따라 다른 파일로
 * 바꿔요. 지금까지는 라이트 모드 파일 하나만 두고 dark:invert CSS 필터로
 * 다크 모드를 흉내냈는데, 단색 실루엣이 아닌 아이콘(색이 있거나 그림자가
 * 있는 아이콘)은 반전시키면 이상하게 보여서 실제 다크 전용 파일을 받을 수
 * 있게 구조를 바꿨어요.
 *
 * 네이밍 규칙 - public/icons/ui/에 이미 있는 LOGO.svg / LOGO_Dark.svg 패턴을
 * 그대로 따라요:
 *   {Base}_active.svg         라이트 모드(+ 다크 전용 파일이 없을 때의 기본값)
 *   {Base}_active_Dark.svg    다크 모드 전용 (있으면 이걸 써요)
 *   {Base}_inactive.svg       라이트 모드
 *   {Base}_inactive_Dark.svg  다크 모드 전용
 *
 * 기존 라이트 파일 이름은 하나도 안 바꿨어요 - _Dark 파일을 아이콘별로 하나씩
 * 추가하는 대로 점진적으로 반영되고, 아직 안 넣은 아이콘은 자동으로
 * dark:invert(CSS 반전)로 대체돼서 깨지지 않아요.
 */
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

  // [신규] base + 상태(active/inactive)로 아이콘 경로를 만들어요. 다크 모드면
  // 먼저 "_Dark" 전용 파일을 시도하고, 그 파일이 없으면(onError) 라이트 파일 +
  // CSS 반전으로 자동 대체돼요 - 이 폴백 덕분에 다크 전용 파일을 아이콘마다
  // 하나씩 순서대로 추가해도 중간에 깨지는 아이콘이 없어요.
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
                // 다크 전용(_Dark) 파일이 아직 없으면, 라이트 파일을 CSS로
                // 반전시켜서 대체해요. 그마저도 없으면(_active 자체가 없는
                // 경우) _inactive로 한 번 더 대체해요.
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
