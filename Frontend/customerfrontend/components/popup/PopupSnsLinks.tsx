import Image from "next/image";
import type { SnsLink } from "@/lib/api/popups";

// [신규] popup_sns_link 데이터를 아이콘 + 링크로 보여줘요.
// ⚠️ 지금 public/Icon/에 인스타그램 아이콘만 있고 유튜브/X/페이스북/틱톡/블로그
// 전용 아이콘은 없어요. 그래서 인스타그램만 전용 아이콘을 쓰고, 나머지는 전부
// 모니터(웹사이트) 아이콘으로 통일했어요 - 나중에 플랫폼별 아이콘 파일 주시면
// 하나씩 바꿔드릴 수 있어요.
const PLATFORM_ICON: Record<SnsLink["platform"], string> = {
  INSTAGRAM: "/Icon/Name=instagram.svg",
  YOUTUBE: "/Icon/Name=monitor.svg",
  X: "/Icon/Name=monitor.svg",
  FACEBOOK: "/Icon/Name=monitor.svg",
  TIKTOK: "/Icon/Name=monitor.svg",
  BLOG: "/Icon/Name=monitor.svg",
  HOMEPAGE: "/Icon/Name=monitor.svg",
  ETC: "/Icon/Name=monitor.svg",
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
          className="flex items-center gap-1.5 border border-gray-200 rounded-full pl-2 pr-3 py-1.5 text-xs text-gray-600"
        >
          <Image src={PLATFORM_ICON[link.platform]} alt="" width={14} height={14} />
          {link.displayName || PLATFORM_LABEL[link.platform]}
        </a>
      ))}
    </section>
  );
}
