import Image from "next/image";
import type { SnsLink } from "@/lib/api/popups";

// [신규] popup_sns_link 데이터를 아이콘 + 링크로 보여줘요.
// [수정] 팀에서 플랫폼별 실제 아이콘 파일을 만들어주셔서 교체했어요. Facebook/TikTok은
// 전용 아이콘이 없어서 "기타(Ect)" 아이콘으로 대체했어요 - 파일 생기면 바로 바꿀 수 있어요.
const PLATFORM_ICON: Record<SnsLink["platform"], string> = {
  INSTAGRAM: "/Icon/Instagram.svg",
  YOUTUBE: "/Icon/YouTube.svg",
  X: "/Icon/X.svg",
  FACEBOOK: "/Icon/Ect.svg",
  TIKTOK: "/Icon/Ect.svg",
  BLOG: "/Icon/Naver_Blog.svg",
  HOMEPAGE: "/Icon/Homepage.svg",
  ETC: "/Icon/Ect.svg",
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
    <section className="flex flex-wrap gap-2 mb-5">
      {sorted.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-800 rounded-full pl-2 pr-3 py-1.5 text-sm text-gray-600 dark:text-gray-400"
        >
          <Image src={PLATFORM_ICON[link.platform]} alt="" width={14} height={14} />
          {link.displayName || PLATFORM_LABEL[link.platform]}
        </a>
      ))}
    </section>
  );
}
