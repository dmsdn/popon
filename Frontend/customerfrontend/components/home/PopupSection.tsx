import { PopupItem } from "@/data/mockPopups";
import { PopupCard } from "./PopupCard";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";

export function PopupSection({
  title,
  items,
  limit = 8,
}: {
  title: string;
  items: PopupItem[];
  /** 섹션에 보여줄 최대 개수 (기본 8개) */
  limit?: number;
}) {
  const visibleItems = items.slice(0, limit);

  return (
    <section className="mb-10 mobile:mb-14 px-4 mobile:px-8">
      <div className="flex items-baseline justify-between mb-3 mobile:mb-4">
        <h3 className="text-base mobile:text-lg font-semibold">{title}</h3>
        <span className="text-sm mobile:text-base text-gray-400">더보기 ›</span>
      </div>
      <HorizontalCarousel>
        {visibleItems.map((item) => (
          <PopupCard key={item.id} {...item} />
        ))}
      </HorizontalCarousel>
    </section>
  );
}
