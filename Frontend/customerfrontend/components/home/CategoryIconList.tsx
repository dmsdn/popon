// components/home/CategoryIconList.tsx
// 홈 화면 카테고리 아이콘 가로 목록 (lucide-react 아이콘 사용, 56px 원형 배경)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getKeywords, type Keyword } from "@/lib/api/customer";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { getPopupCategoryIcon, getPopupCategoryBg } from "@/lib/utils/popupCategoryIcon";

// 홈 화면에서 카테고리 아이콘 목록을 표시
// 카테고리별 아이콘을 표시하고 선택된 카테고리를 강조
export function CategoryIconList({ selected }: { selected?: string } = {}) {
  const [categories, setCategories] = useState<Keyword[]>([]);

  useEffect(() => {
    getKeywords()
      .then(setCategories)
      .catch((err) => console.error("키워드 목록 조회 실패", err));
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="px-4 mobile:px-8 pt-4 mobile:pt-6 mb-14 mobile:mb-16">
      <HorizontalCarousel className="gap-5 mobile:gap-8">
        {categories.map(({ name, iconUrl }) => {
          const Icon = getPopupCategoryIcon(name);
          return (
            <Link
              key={name}
              href={`/search?q=${encodeURIComponent(name)}`}
              className="flex flex-col items-center gap-2 mobile:gap-3 flex-none"
            >
              <div
                className={`relative w-[72px] h-[72px] rounded-full ${getPopupCategoryBg()} flex items-center justify-center`}
              >
                {iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconUrl} alt="" className="w-9 h-9 object-contain dark:invert" />
                ) : (
                  <Icon size={36} strokeWidth={1.4} className="text-gray-500 dark:text-gray-300" />
                )}
                {selected === name && (
                  <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-point border-2 border-white dark:border-[#17181a]" />
                )}
              </div>
              <span className="text-sm mobile:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{name}</span>
            </Link>
          );
        })}
      </HorizontalCarousel>
    </div>
  );
}
