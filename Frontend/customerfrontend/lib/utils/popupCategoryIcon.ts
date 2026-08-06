// lib/utils/popupCategoryIcon.ts
// 카테고리 아이콘 (현재 관리자 관리로 연결 완료)

import {
  Shirt,
  Sparkles,
  UtensilsCrossed,
  Dumbbell,
  Gift,
  Sofa,
  Ticket,
  BookOpen,
  Tag,
  Grid3x3,
  Palette,
  Laptop,
  type LucideIcon,
} from "lucide-react";

const ICON_RULES: [string[], LucideIcon][] = [
  [["패션", "의류", "옷"], Shirt],
  [["뷰티", "화장품", "코스메틱"], Sparkles],
  [["푸드", "F&B", "음식", "카페", "디저트"], UtensilsCrossed],
  [["스포츠", "운동"], Dumbbell],
  [["굿즈", "캐릭터", "애니메이션", "애니"], Gift],
  [["라이프스타일", "리빙", "홈"], Sofa],
  [["엔터테인먼트", "게임", "전시"], Ticket],
  [["도서", "북"], BookOpen],
  [["브랜드"], Tag],
  [["아트", "예술"], Palette],
  [["테크", "디지털", "전자"], Laptop],
];

export function getPopupCategoryIcon(category: string): LucideIcon {
  for (const [keywords, Icon] of ICON_RULES) {
    if (keywords.some((kw) => category.includes(kw))) return Icon;
  }
  return Grid3x3; // 일치하는 카테고리가 없으면 "기타"
}

export function getPopupCategoryBg(): string {
  // 카테고리마다 다르던 배경을 하나로 통일
  return "bg-gray-100 dark:bg-[#282B32]";
}
