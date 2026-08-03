// lib/utils/popupCategoryIcon.ts
//
// [수정] 제가 직접 SVG 좌표를 손으로 짜서 그리다 보니 (렌더링해서 눈으로 확인할
// 방법이 없는 환경이라) 퀄리티가 많이 떨어졌어요. 대신 실제로 검증된 아이콘
// 라이브러리(lucide-react)의 컴포넌트를 그대로 쓰기로 했어요 - 파일 경로가
// 아니라 React 컴포넌트를 반환해요. lucide-react가 프로젝트에 없다면
// `npm install lucide-react`로 설치해주세요 (MIT 라이선스, 무료).

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

// [수정] 실제 카테고리 목록을 보니 "F&B"/"아트"/"테크"처럼 제 키워드 목록에
// 없던 이름들이 있어서, 다 "기타"(Grid3x3, 네모 격자 모양이라 "네모난 아이콘만
// 뜬다"고 느끼셨던 거예요) 로 빠지고 있었어요. 실제 이름 기준으로 규칙을 넓혔어요.
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
  // 카테고리마다 다르던 파스텔 배경을 연한 회색 하나로 통일했어요.
  return "bg-gray-100 dark:bg-[#282B32]";
}
