"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { promoCards } from "@/data/mockPopups";

export function PromoCarousel() {
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
    () => 0 // 서버 스냅샷 (SSR/hydration용)
  );

  return (
    <div className="px-4 mobile:px-8 pt-4 mobile:pt-6">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3 mobile:gap-5">
          {promoCards.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="flex-[0_0_92%] mobile:flex-[0_0_420px] aspect-[3/4] overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 pb-6"
            >
              <span className="text-sm mobile:text-base text-gray-500">
                {card.title}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {promoCards.map((_, index) => (
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