// lib/utils/topRegions.ts
//
// [신규] "인기 추천 팝업" 지역 탭이 성수/여의도/홍대로 고정되어 있었는데, 지금
// 진행중인 팝업이 가장 많은 지역 3개를 동적으로 계산하도록 바꿔요. 예를 들어
// 잠실에 진행중 팝업이 많아지면 잠실이 올라오고, 덜 활발한 지역은 자연스럽게
// 빠지게 돼요.

import type { PopupItem } from "@/data/mockPopups";

export function getTopRegions(openPopups: PopupItem[], count = 3): string[] {
  const counts = new Map<string, number>();
  for (const p of openPopups) {
    if (!p.location) continue;
    counts.set(p.location, (counts.get(p.location) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([region]) => region);
}

// [신규] 검색창 "추천 키워드"용 - 지역과 카테고리를 한데 모아서, 지금 진행중인
// 팝업이 가장 많은 순으로 상위 N개를 뽑아요. "더현대"처럼 특정 브랜드명이
// 고정되어 있던 것도 이걸로 대체해요 - 실제로 활발한 지역/카테고리가 자동으로
// 올라와요.
// [신규] 팝업 이름에 들어간 단어(브랜드명 등)도 추천 키워드 후보에 넣어요. 완벽한
// 형태소 분석은 아니고, 공백으로 쪼갠 뒤 "팝업"/"스토어" 같은 흔한 일반 단어와
// 너무 짧은 단어(1글자)를 걸러내는 단순한 방식이에요 - 가끔 애매한 단어가
// 섞일 수 있지만, 백엔드 없이도 "아디다스 ○○ 팝업"에서 "아디다스"처럼 자주
// 나오는 브랜드명이 자연스럽게 상위로 올라와요.
const GENERIC_TITLE_WORDS = new Set([
  "팝업",
  "팝업스토어",
  "스토어",
  "단독",
  "한정",
  "기획전",
  "오픈",
  "체험",
  "전시",
  "공식",
  "특별",
  "이벤트",
  "매장",
]);

function extractTitleWords(title: string): string[] {
  return title
    .split(/[\s·,\-()[\]]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !GENERIC_TITLE_WORDS.has(w));
}

export function getTopKeywords(openPopups: PopupItem[], count = 5): string[] {
  const counts = new Map<string, number>();
  for (const p of openPopups) {
    if (p.location) counts.set(p.location, (counts.get(p.location) ?? 0) + 1);
    for (const k of p.keywordNames ?? []) {
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const w of extractTitleWords(p.name)) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([keyword]) => keyword);
}
