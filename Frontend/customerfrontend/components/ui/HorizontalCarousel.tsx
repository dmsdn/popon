// components/ui/HorizontalCarousel.tsx
// 가로 스크롤 캐러셀 공용 래퍼
"use client";

import { ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";

// 좌우 스와이프/드래그 스크롤 캐러셀
// PromoCarousel과 동일한 embla 기반
// 자동 재생과 하단 점(dot) 인디케이터는 없음
export function HorizontalCarousel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const [emblaRef] = useEmblaCarousel({
    loop: false,
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className={`flex gap-3 mobile:gap-4 ${className}`}>{children}</div>
    </div>
  );
}
