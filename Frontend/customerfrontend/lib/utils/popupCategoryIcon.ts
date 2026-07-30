// lib/utils/popupCategoryIcon.ts
//
// [신규] 홈 화면 카테고리 목록(패션/뷰티/푸드 등 팝업 키워드)에 어울리는 아이콘과
// 연한 파스텔 배경색을 매핑해요. 기존 categoryIcon.ts는 핫플레이스용(카페/공원 등
// 장소 종류) 어휘라 팝업 키워드랑은 겹치지 않아서 별도로 만들었어요.
// 정확히 일치하는 키워드가 없으면 기본 아이콘 + 회색 배경으로 대체돼요.

const ICON_RULES: [string[], string][] = [
  [["패션", "의류", "옷"], "/icons/shopping.svg"],
  [["뷰티", "화장품", "코스메틱"], "/icons/idea.svg"],
  [["푸드", "음식", "카페", "디저트"], "/icons/food.svg"],
  [["스포츠", "운동"], "/icons/sports.svg"],
  [["굿즈", "캐릭터", "애니메이션", "애니"], "/icons/art.svg"],
  [["라이프스타일", "리빙", "홈"], "/icons/park.svg"],
  [["엔터테인먼트", "게임", "전시"], "/icons/ferris-wheel.svg"],
  [["도서", "북"], "/icons/book.svg"],
];

const BG_RULES: [string[], string][] = [
  [["패션", "의류", "옷"], "bg-rose-50 dark:bg-rose-950"],
  [["뷰티", "화장품", "코스메틱"], "bg-pink-50 dark:bg-pink-950"],
  [["푸드", "음식", "카페", "디저트"], "bg-orange-50 dark:bg-orange-950"],
  [["스포츠", "운동"], "bg-blue-50 dark:bg-blue-950"],
  [["굿즈", "캐릭터", "애니메이션", "애니"], "bg-violet-50 dark:bg-violet-950"],
  [["라이프스타일", "리빙", "홈"], "bg-emerald-50 dark:bg-emerald-950"],
  [["엔터테인먼트", "게임", "전시"], "bg-amber-50 dark:bg-amber-950"],
  [["도서", "북"], "bg-cyan-50 dark:bg-cyan-950"],
];

export function getPopupCategoryIcon(category: string): string {
  for (const [keywords, path] of ICON_RULES) {
    if (keywords.some((kw) => category.includes(kw))) return path;
  }
  return "/Icon/pin.svg";
}

export function getPopupCategoryBg(category: string): string {
  for (const [keywords, bg] of BG_RULES) {
    if (keywords.some((kw) => category.includes(kw))) return bg;
  }
  return "bg-gray-100 dark:bg-gray-800";
}
