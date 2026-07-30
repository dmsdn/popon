"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * [수정] 하단바 아이콘을 활성/비활성 상태에 따라 다른 파일로 바꿔요.
 * 지금 있는 페이지랑 탭의 href가 일치하면 "_active"(꽉 찬 아이콘), 아니면
 * "_inactive"(선 아이콘) 파일을 써요.
 *
 * ⚠️ 지금 public/Icon/에는 각 아이콘의 "선(outline)" 버전만 있고, 꽉 찬(active)
 * 버전은 아직 없어요(Bar_Calender만 이번에 주신 파일로 _inactive를 채웠어요).
 * 그래서 지금은 active/inactive 둘 다 같은(선) 파일을 가리키고 있어요 - 나머지
 * 아이콘들의 꽉 찬 버전 파일(Bar_Home_active.svg, Bar_Other_active.svg,
 * Bar_Search_active.svg, Bar_Calender_active.svg, Bar_User_active.svg)을 주시면
 * 바로 교체할게요.
 */
export function BottomTabBar() {
  const { isLoggedIn, customer } = useAuth();
  const pathname = usePathname();

  const tabs = [
    { base: "Bar_Home", label: "홈", href: "/" },
    { base: "Bar_Other", label: "더보기", href: "/more" },
    { base: "Bar_Search", label: "검색", href: "/search" },
    { base: "Bar_Calender", label: "예약/웨이팅", href: "/mypage?menu=예약 / 웨이팅" },
  ];

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-gray-100 bg-white py-2">
      {tabs.map(({ base, label, href }) => {
        const active = isActive(href);
        // TODO: _active.svg 파일들이 아직 없어서 임시로 _inactive를 같이 써요.
        const icon = active ? `/icon/${base}_active.svg` : `/icon/${base}_inactive.svg`;
        return (
          <Link key={label} href={href} aria-label={label} className="flex flex-col items-center gap-1 p-2">
            <Image
              src={icon}
              alt={label}
              width={24}
              height={24}
              onError={(e) => {
                // _active 파일이 아직 없으면 조용히 _inactive로 대체 (깨진 이미지 방지)
                (e.currentTarget as HTMLImageElement).src = `/icon/${base}_inactive.svg`;
              }}
            />
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
            src={isActive("/mypage") ? "/icon/Bar_User_active.svg" : "/icon/Bar_User_inactive.svg"}
            alt="마이"
            width={24}
            height={24}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/icon/Bar_User_inactive.svg";
            }}
          />
        )}
      </Link>
    </nav>
  );
}
