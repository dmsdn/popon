"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

export function BottomTabBar() {
  const { isLoggedIn, customer } = useAuth();

  const tabs = [
    { icon: "/icon/Bar_Home.svg", label: "홈", href: "/" },
    { icon: "/icon/Bar_Other.svg", label: "더보기", href: "/more" },
    { icon: "/icon/Bar_Search.svg", label: "검색", href: "/search" },
    { icon: "/icon/Bar_Cart.svg", label: "예약/웨이팅", href: "/mypage?menu=예약 / 웨이팅" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-gray-100 bg-white py-2">
      {tabs.map(({ icon, label, href }) => (
        <Link key={label} href={href} aria-label={label} className="flex flex-col items-center gap-1 p-2">
          <Image src={icon} alt={label} width={24} height={24} />
        </Link>
      ))}

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
          <Image src="/icon/Bar_User.svg" alt="마이" width={24} height={24} />
        )}
      </Link>
    </nav>
  );
}
