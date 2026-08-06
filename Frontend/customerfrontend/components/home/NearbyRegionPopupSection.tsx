// components/home/NearbyRegionPopupSection.tsx
// "지금 근처" 섹션 - 내 위치(또는 관심지역) 기준으로 가까운 팝업을 보여줌
"use client";

import { useEffect, useState } from "react";
import { findNearestRegion } from "@/data/hotplaces";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { PopupSection } from "@/components/home/PopupSection";
import type { PopupItem } from "@/data/mockPopups";

// 위치 권한을 허용하면 현재 위치와 가장 가까운 지역을 찾음
export function NearbyRegionPopupSection() {
  const [region, setRegion] = useState<string | null>(null);
  const [items, setItems] = useState<PopupItem[]>([]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = findNearestRegion({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setRegion(nearest);
        searchPopups({ status: "OPEN", location: nearest })
          .then((list) => setItems(list.map(toPopupItem)))
          .catch((err) => console.error("가까운 지역 팝업 조회 실패", err));
      },
      () => {
        // 권한 거부/실패 - 조용히 무시
      },
      { timeout: 5000 }
    );
  }, []);

  if (items.length === 0) return null;

  return <PopupSection title={`지금 계신 곳 근처 · ${region}`} items={items} moreHref={`/search?q=${region}`} />;
}
