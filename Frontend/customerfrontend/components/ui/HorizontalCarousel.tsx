"use client";

import { ReactNode } from "react";

/**
 * 좌우 스와이프/드래그 스크롤 캐러셀.
 *
 * [수정] embla-carousel의 dragFree(관성 스크롤) 물리 엔진이 계속 "너무 가볍게
 * 휙휙 움직인다"는 피드백을 받았어요. 마찰(friction) 값을 내부 API로 조절해봤는데도
 * 여전했던 걸 보면, 그 방식이 이 버전에서 제대로 안 먹혔던 것 같아요(비공식/내부
 * API라 버전마다 동작이 다를 수 있어요). 그래서 아예 커스텀 물리 엔진을 걷어내고,
 * 브라우저 기본 스크롤(overflow-x-auto)로 바꿨어요. 다들 원래 익숙한 스크롤
 * 느낌이라 "가볍다"고 느껴질 일이 없고, 동작도 훨씬 예측 가능해요.
 * 스크롤바만 시각적으로 숨겨서(scrollbar-hide) 디자인은 그대로 유지했습니다.
 */
export function HorizontalCarousel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className={`flex gap-3 mobile:gap-4 ${className}`}>{children}</div>
    </div>
  );
}
