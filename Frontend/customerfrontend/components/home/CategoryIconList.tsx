"use client";

// 홈 화면 카테고리 아이콘 가로 목록 (lucide-react 아이콘 사용, 56px 원형 배경).

import { useEffect, useState } from "react";
import Link from "next/link";
import { getKeywords, type Keyword } from "@/lib/api/customer";
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
//
// [수정] 관리자가 카테고리별로 아이콘 이미지를 업로드할 수 있게 되면서,
// keyword.iconUrl이 있으면 그 이미지를 쓰고, 없으면(기존 8개처럼 아직 아이콘을
// 안 올린 카테고리) 지금까지 쓰던 lucide 아이콘 폴백을 그대로 보여줘요 -
// popupCategoryIcon.ts는 지우지 않고 폴백용으로 유지해요.
//
// [수정 8/5] 관리자 업로드 아이콘도 뒤로가기 화살표 등 다른 단색 아이콘들과
// 똑같이 dark:invert를 적용했어요 - 백엔드에 새 필드를 추가하는 대신, 지금
// 오는 아이콘 하나를 다크모드에서 CSS로 반전시켜서 보이게 하는 방식이에요.
// ⚠️ 단색(검정 실루엣) 아이콘일 때만 자연스럽게 반전돼요 - 알록달록한 다색
// 아이콘을 올리면 invert가 색상을 이상하게 뒤집어버릴 수 있어요. 카테고리
// 아이콘을 다색으로 올리는 카테고리가 있다면 그 아이콘만 이 반전에서 빼는
// 방법도 있으니 필요하면 말씀해주세요.
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
              {/* [수정] 배경 원이 아이콘 크기에 비해 작아보인다는 피드백 - 아이콘
                  크기(36px)는 그대로 두고 배경 원만 56px→72px로 키웠어요. */}
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
