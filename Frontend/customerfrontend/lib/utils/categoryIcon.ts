// lib/utils/categoryIcon.ts
// 핫플 카테고리 아이콘 매핑 유틸

const ICON_RULES: [string[], string][] = [
  [["카페"], "/icons/hotplace/cafe.svg"],
  [["음식점"], "/icons/hotplace/food.svg"],
  [["전시"], "/icons/hotplace/art.svg"],
  [["공원"], "/icons/hotplace/park.svg"],
  [["아쿠아리움"], "/icons/hotplace/aquarium.svg"],
  [["쇼핑", "컨벤션"], "/icons/hotplace/shopping.svg"],
  [["야구장"], "/icons/hotplace/sports.svg"],
  [["도서관"], "/icons/hotplace/book.svg"],
  [["야경"], "/icons/hotplace/moon.svg"],
  [["테마파크"], "/icons/hotplace/ferris-wheel.svg"],
  [["체험관"], "/icons/hotplace/idea.svg"],
  [["거리"], "/icons/hotplace/walk.svg"],
];

export function getCategoryIcon(category: string): string {
  for (const [keywords, path] of ICON_RULES) {
    if (keywords.some((kw) => category.includes(kw))) return path;
  }
  return "/icons/ui/pin.svg";
}
