import Link from "next/link";
import { categories } from "@/data/mockPopups";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";

export function CategoryIconList() {
  return (
    <div className="px-4 mobile:px-8 py-4 mobile:py-6">
      <HorizontalCarousel className="gap-5 mobile:gap-8">
        {categories.map((name, i) => (
          <Link
            key={i}
            href={`/search?q=${encodeURIComponent(name)}`}
            className="flex flex-col items-center gap-2 mobile:gap-3 flex-none"
          >
            <div className="w-14 h-14 mobile:w-20 mobile:h-20 rounded-md bg-gray-100 border border-gray-200" />
            <span className="text-xs mobile:text-sm text-gray-600 whitespace-nowrap">{name}</span>
          </Link>
        ))}
      </HorizontalCarousel>
    </div>
  );
}
