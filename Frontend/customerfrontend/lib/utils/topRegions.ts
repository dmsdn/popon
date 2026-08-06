// lib/utils/topRegions.ts
// 진행 중인 팝업 데이터를 기준으로 인기 지역과 추천 검색 키워드를 동적으로 계산

import type { PopupItem } from "@/data/mockPopups";

export function getTopRegions(openPopups: PopupItem[], count = 3): string[] {
  const anyHasRegionId = openPopups.some((p) => p.regionId != null);
  const counts = new Map<string, number>();
  for (const p of openPopups) {
    if (!p.location) continue;
    if (anyHasRegionId && p.regionId == null) continue;
    counts.set(p.location, (counts.get(p.location) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([region]) => region);
}

// 걸러낼 단어
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
  const anyHasRegionId = openPopups.some((p) => p.regionId != null);
  const counts = new Map<string, number>();
  for (const p of openPopups) {
    if (p.location && (!anyHasRegionId || p.regionId != null)) {
      counts.set(p.location, (counts.get(p.location) ?? 0) + 1);
    }
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
