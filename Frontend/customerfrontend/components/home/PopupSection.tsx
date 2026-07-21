import { PopupItem } from "@/data/mockPopups";
import { PopupCard } from "./PopupCard";
import { FilterChip } from "@/components/ui/FilterChip";

export function PopupSection({
  title,
  items,
  filterOptions,
}: {
  title: string;
  items: PopupItem[];
  filterOptions?: string[];
}) {
  return (
    <section className="mb-10 mobile:mb-14 px-4 mobile:px-8">
      <div className="flex items-baseline justify-between mb-3 mobile:mb-4">
        <h3 className="text-base mobile:text-lg font-semibold">{title}</h3>
        <span className="text-sm mobile:text-base text-gray-400">더보기 ›</span>
      </div>
      {filterOptions && <FilterChip options={filterOptions} />}
      <div className="flex gap-3 mobile:gap-4 overflow-x-auto pb-1">
        {items.map((item) => (
          <PopupCard key={item.id} {...item} />
        ))}
      </div>
    </section>
  );
}