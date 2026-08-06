// components/home/PopupSection.tsx
// "제목 + 더보기 링크 + 가로 캐러셀" 패턴을 재사용하는 공용 섹션 래퍼

import Link from "next/link";
import { PopupItem } from "@/data/mockPopups";
import { PopupCard } from "./PopupCard";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";

export function PopupSection({
  title,
  items,
  limit = 8,
  moreHref,
}: {
  title: string;
  items: PopupItem[];
  limit?: number; // 섹션에 보여줄 최대 개수 (기본 8개)
  moreHref?: string; // "더보기" 클릭 시 이동할 경로 (없으면 그냥 비활성 텍스트로만 표시)
}) {
  const visibleItems = items.slice(0, limit);

  return (
    <section className="mb-14 mobile:mb-16 px-4 mobile:px-8">
      <div className="flex items-baseline justify-between mb-3 mobile:mb-4">
        <h3 className="text-base mobile:text-lg font-semibold">{title}</h3>
        {moreHref ? (
          <Link href={moreHref} className="text-sm mobile:text-base text-gray-400">
            더보기
          </Link>
        ) : (
          <span className="text-sm mobile:text-base text-gray-300">더보기</span>
        )}
      </div>
      <HorizontalCarousel>
        {visibleItems.map((item) => (
          <PopupCard key={item.id} {...item} />
        ))}
      </HorizontalCarousel>
    </section>
  );
}
