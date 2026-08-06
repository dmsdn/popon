// components/home/PromoCarousel.tsx
// 홈 화면 최상단 프로모션 배너 캐러셀 - 자동 슬라이드, 반응형(700px 기준 높이 전환)
"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { getBanners, type Banner } from "@/lib/api/banners";
import { searchPopups, getPopup } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { toDisplayDate } from "@/lib/api/reviews";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import type { PopupItem } from "@/data/mockPopups";

// DB linkUrl 오타(/popups/N, 복수형) 자동 보정
function normalizeLinkUrl(url: string): string {
  const match = url.match(/^\/popups\/(\d+)$/);
  return match ? `/popup/${match[1]}` : url;
}

const PROMO_COUNT = 7;

// 배너 API(GET /api/banners) 우선 사용, 등록된 배너 없으면(빈 배열) 진행중 팝업으로 대체
export function PromoCarousel() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [fallbackCards, setFallbackCards] = useState<PopupItem[]>([]);
  const [popupInfoByBannerId, setPopupInfoByBannerId] = useState<
    Record<number, { dateRange: string; location: string | null }>
  >({});

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
    if (!banners || banners.length === 0) return;
    let cancelled = false;

    // "^"로 문자열 맨 앞만 매칭 - 절대경로(https://.../popup/13)에서 안 걸리던 문제
    // > "/popup/숫자" 패턴을 문자열 어디서든 찾도록 완화
    const targets = banners
      .map((b) => {
        const match = (b.linkUrl ?? "").match(/\/popups?\/(\d+)/);
        return match ? { bannerId: b.id, popupId: Number(match[1]) } : null;
      })
      .filter((v): v is { bannerId: number; popupId: number } => v !== null);

    // linkUrl은 있는데 위 패턴과 안 맞는 배너가 있으면 콘솔에 원인 로그
    if (targets.length === 0 && banners.some((b) => !!b.linkUrl)) {
      console.warn(
        "[PromoCarousel] linkUrl이 '/popup/숫자' 패턴과 안 맞아 날짜·지역을 못 가져옴:",
        banners.map((b) => b.linkUrl)
      );
    }

    Promise.all(
      targets.map(({ bannerId, popupId }) =>
        getPopup(popupId)
          .then((p) => ({
            bannerId,
            dateRange: `${toDisplayDate(p.startDate)} ~ ${toDisplayDate(p.endDate)}`,
            location: p.regionName ?? p.location ?? null,
          }))
          .catch((err) => {
            console.error(`배너 연결 팝업(${popupId}) 조회 실패`, err);
            return null;
          })
      )
    ).then((results) => {
      if (cancelled) return;
      const next: Record<number, { dateRange: string; location: string | null }> = {};
      results.forEach((r) => {
        if (r) next[r.bannerId] = { dateRange: r.dateRange, location: r.location };
      });
      setPopupInfoByBannerId(next);
    });

    return () => {
      cancelled = true;
    };
  }, [banners]);

  useEffect(() => {
    if (banners === null) return;
    const hasValidBanner = banners.some((b) => !!b.imageUrl);
    if (hasValidBanner) return;
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
    { loop: true, align: "center", containScroll: false },
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

  const validBanners = (banners ?? []).filter((b) => !!b.imageUrl);
  const showRealBanners = validBanners.length > 0;
  const slideCount = showRealBanners ? validBanners.length : fallbackCards.length;

  if (banners === null) return null;
  if (slideCount === 0) return null;

  return (
    <div className="mb-14 mobile:mb-16 min-[700px]:px-4">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4">
          {showRealBanners
            ? validBanners.map((banner, index) => {
                const isValidLink =
                  !!banner.linkUrl && (banner.linkUrl.startsWith("/") || banner.linkUrl.startsWith("http"));
                const href = isValidLink ? normalizeLinkUrl(banner.linkUrl!) : null;
                const slideClass = "flex-[0_0_100%] min-[700px]:flex-[0_0_520px] pl-4";
                const cardClass =
                  "relative block h-[400px] min-[700px]:h-[520px] min-[700px]:rounded-2xl overflow-hidden bg-gray-50";
                const isActive = active === index;
                const info = popupInfoByBannerId[banner.id];
                const content = (
                  <>
                    <ImageWithFallback src={banner.imageUrl} className="w-full h-full object-cover" />
                    {(banner.title || info) && (
                      <div className="absolute left-4 bottom-4 right-4">
                        {info && (
                          <p className="text-gray-300 text-base mobile:text-lg font-medium mb-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                            {info.dateRange}
                            {info.location ? ` · ${info.location}` : ""}
                          </p>
                        )}
                        {banner.title && (
                          <p className="text-white text-3xl font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                            {banner.title}
                          </p>
                        )}
                      </div>
                    )}
                    <div
                      className={`absolute inset-0 bg-black transition-opacity duration-300 pointer-events-none ${
                        isActive ? "opacity-0" : "opacity-50"
                      }`}
                    />
                  </>
                );
                return (
                  <div key={banner.id} className={slideClass}>
                    {href ? (
                      <Link href={href} className={cardClass}>
                        {content}
                      </Link>
                    ) : (
                      <div className={cardClass}>{content}</div>
                    )}
                  </div>
                );
              })
            : fallbackCards.map((card, index) => {
                const isActive = active === index;
                return (
                  <div key={card.id} className="flex-[0_0_100%] min-[700px]:flex-[0_0_520px] pl-4">
                    <Link
                      href={`/popup/${card.id}`}
                      className="relative block h-[400px] min-[700px]:h-[520px] min-[700px]:rounded-2xl overflow-hidden bg-gray-50 flex items-end p-4"
                    >
                      <span className="relative text-sm mobile:text-base font-medium text-gray-700 dark:text-gray-300">
                        {card.name}
                      </span>
                      {/* [참고] 위 실제 배너와 동일 - 텍스트 뒤로 z-index 조정 */}
                      <div
                        className={`absolute inset-0 bg-black transition-opacity duration-300 pointer-events-none ${
                          isActive ? "opacity-0" : "opacity-50"
                        }`}
                      />
                    </Link>
                  </div>
                );
              })}
        </div>
      </div>

      <div className="flex justify-center gap-1 mt-3">
        {Array.from({ length: slideCount }).map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`transition-all duration-300 rounded-full ${
              active === index ? "w-6 h-2 bg-point" : "w-2 h-2 bg-gray-400 dark:bg-gray-600"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
