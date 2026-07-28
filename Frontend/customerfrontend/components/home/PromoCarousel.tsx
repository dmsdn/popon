"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { getBanners, type Banner } from "@/lib/api/banners";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import type { PopupItem } from "@/data/mockPopups";

const PROMO_COUNT = 7;

// [수정] 관리자가 관리하는 실제 배너 API(GET /api/banners)가 생겨서 이제 그걸 우선
// 써요. 아직 등록된 배너가 없으면(빈 배열) 기존처럼 진행중 팝업으로 대체합니다.
export function PromoCarousel() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [fallbackCards, setFallbackCards] = useState<PopupItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    getBanners()
      .then((list) => {
        if (!cancelled) setBanners(list);
      })
      .catch((err) => {
        console.error("배너 조회 실패", err);
        if (!cancelled) setBanners([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (banners === null || banners.length > 0) return; // 배너가 있으면 fallback 안 씀
    let cancelled = false;
    searchPopups({ status: "OPEN" })
      .then((list) => {
        if (!cancelled) setFallbackCards(list.slice(0, PROMO_COUNT).map(toPopupItem));
      })
      .catch((err) => console.error("프로모션 카드용 팝업 조회 실패", err));
    return () => {
      cancelled = true;
    };
  }, [banners]);

  const autoplay = Autoplay({
    delay: 4000,
    stopOnInteraction: false,
    stopOnMouseEnter: true,
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", containScroll: false },
    [autoplay]
  );

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!emblaApi) return () => {};
      emblaApi.on("select", callback);
      emblaApi.on("reInit", callback);
      return () => {
        emblaApi.off("select", callback);
        emblaApi.off("reInit", callback);
      };
    },
    [emblaApi]
  );

  const active = useSyncExternalStore(
    subscribe,
    () => emblaApi?.selectedScrollSnap() ?? 0,
    () => 0
  );

  const usingRealBanners = !!banners && banners.length > 0;
  const slideCount = usingRealBanners ? banners!.length : fallbackCards.length;

  if (banners === null) return null; // 아직 조회 중
  if (slideCount === 0) return null;

  return (
    <div className="px-4 mobile:px-8 pt-4 mobile:pt-6 mb-14 mobile:mb-16">
      <div className="overflow-hidden" ref={emblaRef}>
        {/* 카드 사이 간격을 부모 gap이 아니라 각 카드의 오른쪽 margin으로 줘서,
            loop이 마지막→처음으로 넘어가는 경계에서도 간격이 그대로 유지돼요. */}
        <div className="flex">
          {usingRealBanners
            ? banners!.map((banner) => (
                <Link
                  key={banner.id}
                  href={banner.linkUrl ?? "#"}
                  className="flex-[0_0_92%] mobile:flex-[0_0_420px] max-h-[50vh] aspect-[3/4] overflow-hidden rounded-md border border-gray-200 bg-gray-50 mr-3 mobile:mr-5"
                >
                  <ImageWithFallback src={banner.imageUrl} className="w-full h-full object-cover" />
                </Link>
              ))
            : fallbackCards.map((card) => (
                <Link
                  key={card.id}
                  href={`/popup/${card.id}`}
                  className="flex-[0_0_92%] mobile:flex-[0_0_420px] max-h-[50vh] aspect-[3/4] overflow-hidden rounded-md border border-gray-200 bg-gray-50 mr-3 mobile:mr-5 flex items-end p-4"
                >
                  <span className="text-sm mobile:text-base font-medium text-gray-700">
                    {card.name}
                  </span>
                </Link>
              ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: slideCount }).map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`transition-all duration-300 rounded-full ${
              active === index ? "w-6 h-2 bg-black" : "w-2 h-2 bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
