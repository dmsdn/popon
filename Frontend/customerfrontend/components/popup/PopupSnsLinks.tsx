// components/popup/PopupSnsLinks.tsx
// 팝업 상세의 SNS/홈페이지 링크 목록.

import Image from "next/image";
import type { SnsLink } from "@/lib/api/popups";

// [신규] popup_sns_link 데이터를 아이콘 + 링크로 보여줘요.
// [수정] 팀에서 플랫폼별 실제 아이콘 파일을 만들어주셔서 교체했어요. Facebook/TikTok은
// 전용 아이콘이 없어서 "기타(Ect)" 아이콘으로 대체했어요 - 파일 생기면 바로 바꿀 수 있어요.
const PLATFORM_ICON: Record<SnsLink["platform"], string> = {
  INSTAGRAM: "/icons/ui/Instagram.svg",
  YOUTUBE: "/icons/ui/YouTube.svg",
  X: "/icons/ui/X.svg",
  FACEBOOK: "/icons/ui/Ect.svg",
  TIKTOK: "/icons/ui/Ect.svg",
  BLOG: "/icons/ui/Naver_Blog.svg",
  HOMEPAGE: "/icons/ui/Homepage.svg",
  ETC: "/icons/ui/Ect.svg",
};

const PLATFORM_LABEL: Record<SnsLink["platform"], string> = {
  INSTAGRAM: "인스타그램",
  YOUTUBE: "유튜브",
  X: "X",
  FACEBOOK: "페이스북",
  TIKTOK: "틱톡",
  BLOG: "블로그",
  HOMEPAGE: "홈페이지",
  ETC: "링크",
};

export function PopupSnsLinks({ links }: { links: SnsLink[] }) {
  if (links.length === 0) return null;

  const sorted = [...links].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section>
      {/* [수정] "이용 정보"/"상세 이미지"처럼 다른 섹션엔 다 이름이 있는데 여기만
          없어서 구분이 안 됐어요. 이름 추가하고, 아이콘을 왼쪽 대신 오른쪽에
          훨씬 크게 배치했어요. */}
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
