"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getKeywords } from "@/lib/api/customer";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { getPopupCategoryIcon, getPopupCategoryBg } from "@/lib/utils/popupCategoryIcon";

// [수정] 하드코딩된 목업 카테고리 목록 대신 실제 관리자 키워드 API로 교체했어요.
// (검색 페이지는 이미 이렇게 바꿔뒀었는데, 홈 화면은 그대로 목업이었어요.)
export function CategoryIconList() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    getKeywords()
      .then((list) => setCategories(list.map((k) => k.name)))
      .catch((err) => console.error("키워드 목록 조회 실패", err));
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="px-4 mobile:px-8 pt-4 mobile:pt-6 mb-14 mobile:mb-16">
      <HorizontalCarousel className="gap-5 mobile:gap-8">
        {categories.map((name) => (
          <Link
            key={name}
            href={`/search?q=${encodeURIComponent(name)}`}
            className="flex flex-col items-center gap-2 mobile:gap-3 flex-none"
          >
            {/* [수정] 키워드마다 어울리는 아이콘 + 연한 파스텔 배경을 넣었어요.
                일치하는 키워드가 없으면 기본 회색 배경 + 핀 아이콘으로 대체돼요. */}
            <div
              className={`w-14 h-14 mobile:w-20 mobile:h-20 rounded-md ${getPopupCategoryBg(
                name
              )} flex items-center justify-center`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPopupCategoryIcon(name)}
                alt=""
                className="w-7 h-7 mobile:w-10 mobile:h-10"
              />
            </div>
            <span className="text-sm mobile:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{name}</span>
          </Link>
        ))}
      </HorizontalCarousel>
    </div>
  );
}
