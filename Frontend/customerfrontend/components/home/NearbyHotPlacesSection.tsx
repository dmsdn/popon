"use client";

import { useEffect, useState } from "react";
import { getHotPlacesForRegion, findNearestRegion, type HotPlace } from "@/data/hotplaces";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { PlaceCard } from "@/components/popup/PlaceCard";

/**
 * 브라우저 위치 권한을 물어보고, 허용하면 제일 가까운 동네의 핫플을 보여줘요.
 * 권한을 거부하거나 위치를 못 가져오면 그냥 조용히 섹션 자체를 안 보여줍니다
 * (에러 메시지나 재요청 팝업 없음 - 홈 화면에서 위치 권한을 강요하는 느낌을 주지
 * 않으려고 최소한으로만 시도해요).
 *
 * [수정] 카드 마크업을 따로 두지 않고 PlaceCard를 그대로 재사용해요 - 팝업 상세페이지
 * 핫플 카드랑 크기/비율/아이콘이 항상 자동으로 같이 맞춰지게 됩니다.
 */
export function NearbyHotPlacesSection() {
  const [region, setRegion] = useState<string | null>(null);
  const [places, setPlaces] = useState<HotPlace[]>([]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = findNearestRegion({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setRegion(nearest);
        setPlaces(getHotPlacesForRegion(nearest));
      },
      () => {
        // 권한 거부/실패 - 조용히 무시, 섹션 안 보여줌
      },
      { timeout: 5000 }
    );
  }, []);

  if (places.length === 0) return null;

  return (
    <section className="mb-14 mobile:mb-16 px-4 mobile:px-8">
      <h3 className="text-base mobile:text-lg font-semibold mb-3 mobile:mb-4">
        내 주변 핫플 · {region}
      </h3>
      <HorizontalCarousel>
        {places.map((place) => (
          <PlaceCard
            key={place.name}
            category={place.category}
            name={place.name}
            distance={place.distance}
            imageUrl={place.imageUrl}
            href={place.linkUrl}
          />
        ))}
      </HorizontalCarousel>
    </section>
  );
}
