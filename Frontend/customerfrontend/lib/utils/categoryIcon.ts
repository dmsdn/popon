// lib/utils/categoryIcon.ts
//
// 핫플 카테고리가 "한식", "카페·편집숍 거리", "서울 랜드마크·전망대"처럼 자유
// 텍스트라서 정확히 일치하는 값으로 아이콘을 매핑할 수 없어요. 대신 문자열
// 안에 흔한 키워드가 포함되어 있는지로 판단해서 대략 맞는 아이콘을 붙여줍니다.
//
// [수정] 인라인 React 컴포넌트 대신 public/icons/의 실제 svg 파일 경로를
// 반환하도록 바꿨어요. (요청: "아이콘은 svg 파일로 저장해서 넣어줘")

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
