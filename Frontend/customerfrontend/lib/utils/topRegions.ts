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
