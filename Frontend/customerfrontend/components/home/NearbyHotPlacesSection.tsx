// components/home/NearbyHotPlacesSection.tsx
// "내 주변 핫플" 섹션 - 팝업 근처의 카페/공원 등 핫플레이스 추천
"use client";

import { useEffect, useState } from "react";
import { getHotPlacesForRegion, findNearestRegion, type HotPlace } from "@/data/hotplaces";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { PlaceCard } from "@/components/popup/PlaceCard";

// 현재 위치를 기준으로 가까운 지역의 핫플레이스를 추천
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
