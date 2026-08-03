"use client";

// 홈 화면 카테고리 아이콘 가로 목록 (lucide-react 아이콘 사용, 56px 원형 배경).

import { useEffect, useState } from "react";
import Link from "next/link";
import { getKeywords } from "@/lib/api/customer";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { getPopupCategoryIcon, getPopupCategoryBg } from "@/lib/utils/popupCategoryIcon";

// [수정] 하드코딩된 목업 카테고리 목록 대신 실제 관리자 키워드 API로 교체했어요.
// (검색 페이지는 이미 이렇게 바꿔뒀었는데, 홈 화면은 그대로 목업이었어요.)
//
// [수정] 아이콘을 직접 그린 SVG 파일 대신 lucide-react 아이콘 컴포넌트로
// 바꿨어요 - 손으로 좌표를 그리다 보니 퀄리티가 낮았는데, 검증된 라이브러리를
// 쓰면 그럴 걱정이 없어요. 칸은 56x56, 아이콘은 36x36으로 맞췄고, 배경은
// 파스텔 대신 연한 회색으로 통일했어요. 포인트 컬러는 선택된 카테고리의
// 오른쪽 위에 작은 점 배지로만 얹어요.
export function CategoryIconList({ selected }: { selected?: string } = {}) {
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
        {categories.map((name) => {
          const Icon = getPopupCategoryIcon(name);
          return (
            <Link
              key={name}
              href={`/search?q=${encodeURIComponent(name)}`}
              className="flex flex-col items-center gap-2 mobile:gap-3 flex-none"
            >
              {/* [수정] 배경 원이 아이콘 크기에 비해 작아보인다는 피드백 - 아이콘
                  크기(36px)는 그대로 두고 배경 원만 56px→72px로 키웠어요. */}
              <div
                className={`relative w-[72px] h-[72px] rounded-full ${getPopupCategoryBg()} flex items-center justify-center`}
              >
                <Icon
                  size={36}
                  strokeWidth={1.4}
                  className="text-gray-500 dark:text-gray-300"
                />
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
