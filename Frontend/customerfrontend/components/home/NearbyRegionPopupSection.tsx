"use client";

import { useEffect, useState } from "react";
import { findNearestRegion } from "@/data/hotplaces";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { PopupSection } from "@/components/home/PopupSection";
import type { PopupItem } from "@/data/mockPopups";

/**
 * [신규] "위치 동의하면 가까운 지역으로 고정" - 브라우저 위치 권한을 물어보고,
 * 허용하면 가장 가까운 동네(성수/강남/홍대 등)를 계산해서 그 지역 팝업을 보여줘요.
 * NearbyHotPlacesSection(핫플용)과 같은 방식이고, 팝업 버전이에요.
 * 권한 거부/실패하면 조용히 섹션을 숨겨요(위치 요청을 강요하지 않으려고).
 */
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
