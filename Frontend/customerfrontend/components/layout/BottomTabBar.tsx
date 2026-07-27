"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

export function BottomTabBar() {
  const { isLoggedIn } = useAuth();

  const tabs = [
    { icon: "/icon/Bar_Home.svg", label: "홈", href: "/" },
    { icon: "/icon/Bar_Other.svg", label: "더보기", href: "/more" },
    { icon: "/icon/Bar_Search.svg", label: "검색", href: "/search" },
    { icon: "/icon/Bar_Cart.svg", label: "예약/웨이팅", href: "/mypage?menu=예약 / 웨이팅" },
    {
      icon: isLoggedIn ? "/icon/loginuser.svg" : "/icon/Bar_User.svg",
      label: "마이",
      href: isLoggedIn ? "/mypage" : "/login",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t bg-white py-2">
      {tabs.map(({ icon, label, href }) =>
        href ? (
          <Link key={label} href={href} aria-label={label} className="flex flex-col items-center gap-1 p-2">
            <Image src={icon} alt={label} width={24} height={24} />
          </Link>
        ) : (
          <button key={label} aria-label={label} className="flex flex-col items-center gap-1 p-2">
            <Image src={icon} alt={label} width={24} height={24} />
          </button>
        )
      )}
    </nav>
  );
}