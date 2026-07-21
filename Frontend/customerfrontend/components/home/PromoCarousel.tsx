"use client";

import { useCallback, useEffect, useState } from "react";
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
  {
    loop: true,
    align: "start",
    containScroll: false,
  },
  [autoplay]
);

  const [active, setActive] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActive(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    onSelect();

    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="px-4 mobile:px-8 pt-4 mobile:pt-6">
      {/* Embla Viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        {/* Embla Container */}
        <div className="flex gap-3 mobile:gap-5">
          {promoCards.map((card) => (
            <div key={card.id} className=" flex-[0_0_92%] mobile:flex-[0_0_420px] aspect-[3/4] overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 pb-6">
              <span className="text-sm mobile:text-base text-gray-500">
                {card.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Indicator */}
      <div className="flex justify-center gap-2 mt-4">
        {promoCards.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`transition-all duration-300 rounded-full ${
              active === index
                ? "w-6 h-2 bg-black"
                : "w-2 h-2 bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}