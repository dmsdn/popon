// components/popup/PopupSnsLinks.tsx
// 팝업 상세의 SNS/홈페이지 링크 목록

import Image from "next/image";
import type { SnsLink } from "@/lib/api/popups";

// popup_sns_link 데이터를 아이콘 + 링크로
const PLATFORM_ICON: Record<SnsLink["platform"], string> = {
  INSTAGRAM: "/icons/ui/Instagram.svg",
  YOUTUBE: "/icons/ui/YouTube.svg",
  X: "/icons/ui/X.svg",
  BLOG: "/icons/ui/Naver_Blog.svg",
  HOMEPAGE: "/icons/ui/Homepage.svg",
  NAVERMAP: "/icons/ui/Ect.svg",
  ETC: "/icons/ui/Ect.svg",
};

const PLATFORM_LABEL: Record<SnsLink["platform"], string> = {
  INSTAGRAM: "인스타그램",
  YOUTUBE: "유튜브",
  X: "X",
  BLOG: "블로그",
  HOMEPAGE: "홈페이지",
  NAVERMAP: "네이버지도",
  ETC: "링크",
};

export function PopupSnsLinks({ links }: { links: SnsLink[] }) {
  if (links.length === 0) return null;

  const sorted = [...links].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section>
      <h2 className="text-sm font-semibold mb-2">SNS / 홈페이지</h2>
      <div className="flex flex-col gap-1">
        {sorted.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between border-b border-gray-50 dark:border-[#17181a] py-3"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {link.displayName || PLATFORM_LABEL[link.platform]}
            </span>
            <Image src={PLATFORM_ICON[link.platform]} alt="" width={28} height={28} />
          </a>
        ))}
      </div>
    </section>
  );
}
