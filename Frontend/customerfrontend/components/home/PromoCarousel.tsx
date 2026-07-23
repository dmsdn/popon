"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import type { PopupItem } from "@/data/mockPopups";

const PROMO_COUNT = 7;

export function PromoCarousel() {
  const [cards, setCards] = useState<PopupItem[]>([]);

  // 실제 DB의 진행중인 팝업 중 앞에서부터 몇 개를 프로모션 카드로 노출합니다.
  // (어떤 팝업을 프로모션으로 노출할지 고르는 기획/운영 기준이 별도로 필요하면
  //  나중에 그 조건으로 이 fetch만 바꾸면 돼요.)
  useEffect(() => {
    let cancelled = false;
    searchPopups({ status: "OPEN" })
      .then((list) => {
        if (!cancelled) setCards(list.slice(0, PROMO_COUNT).map(toPopupItem));
      })
      .catch((err) => console.error("프로모션 카드용 팝업 조회 실패", err));
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (cards.length === 0) return null;

  return (
    <div className="px-4 mobile:px-8 pt-4 mobile:pt-6">
      <div className="overflow-hidden" ref={emblaRef}>
        {/* 카드 사이 간격을 부모 gap이 아니라 각 카드의 오른쪽 margin으로 줘서,
            loop이 마지막→처음으로 넘어가는 경계에서도 간격이 그대로 유지돼요. */}
        <div className="flex">
          {cards.map((card) => (
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
        {cards.map((_, index) => (
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
