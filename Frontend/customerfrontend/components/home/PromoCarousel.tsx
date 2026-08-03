"use client";

// 홈 화면 최상단 프로모션 배너 캐러셀 - 자동 슬라이드, 반응형(700px 기준 높이 전환).

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { getBanners, type Banner } from "@/lib/api/banners";
import { searchPopups } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import type { PopupItem } from "@/data/mockPopups";

// [수정] 실제 원인을 찾았어요 - 배너 linkUrl이 DB에 "/popups/13"(복수형)처럼
// 오타로 저장되어 있었어요. 실제 팝업 상세페이지 경로는 "/popup/13"(단수)이라
// 그대로는 항상 404가 났어요. 이 특정 오타 패턴을 감지해서 자동 교정해요 -
// 근본적으로는 배너 DB의 linkUrl 값 자체를 고치는 게 맞지만, 그때까지 화면이
// 깨지지 않도록 방어해둡니다.
function normalizeLinkUrl(url: string): string {
  const match = url.match(/^\/popups\/(\d+)$/);
  return match ? `/popup/${match[1]}` : url;
}

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
    if (banners === null) return;
    const hasValidBanner = banners.some((b) => !!b.imageUrl);
    if (hasValidBanner) return; // 유효한 배너가 있으면 fallback 안 씀
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

  // [수정] "등록된 배너가 없을 때 이미지를 못 불러온다 + 누르면 404로 간다"는 문제가
  // 있었어요. 원인은 배너 API가 빈 배열이 아니라, imageUrl/linkUrl이 비어있는
  // "미완성" 배너 행을 그대로 내려주고 있었기 때문이에요 - banners.length > 0이라
  // 팝업 카드로 대체되지도 않고, 그렇다고 실제로 보여줄 이미지/링크도 없었던 거예요.
  // 이미지 URL이 있는 배너만 "진짜 등록된 배너"로 치도록 걸러냈어요.
  const validBanners = (banners ?? []).filter((b) => !!b.imageUrl);
  const showRealBanners = validBanners.length > 0;
  const slideCount = showRealBanners ? validBanners.length : fallbackCards.length;

  if (banners === null) return null; // 아직 조회 중
  if (slideCount === 0) return null;

  return (
    <div className="mb-14 mobile:mb-16 min-[700px]:px-4">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {showRealBanners
            ? validBanners.map((banner) => {
                // [수정] linkUrl이 있어도 "/"나 "http"로 시작하지 않으면 정상적인
                // 경로가 아닐 가능성이 높아요(예: 앞에 슬래시가 빠진 값). 이런 값을
                // 그대로 Link에 넘기면 엉뚱한 경로로 붙어서 404로 이어질 수 있어서,
                // 형태가 이상하면 클릭 안 되게 막았어요.
                const isValidLink =
                  !!banner.linkUrl && (banner.linkUrl.startsWith("/") || banner.linkUrl.startsWith("http"));
                const href = isValidLink ? normalizeLinkUrl(banner.linkUrl!) : null;
                // [수정] 600px 미만: 높이 고정 300px(600의 절반) + 좌우 꽉 채움.
                // 600px 이상: 고정 600×600 정사각형으로 바뀌면서, 옆에 다음 배너가
                // 살짝 보이도록 카드 사이 여백과 둥근 모서리를 살려요.
                const sizeClass =
                  "flex-[0_0_100%] h-[400px] min-[700px]:flex-[0_0_600px] min-[700px]:h-[600px] min-[700px]:mr-4 min-[700px]:rounded-2xl";
                return href ? (
                  <Link key={banner.id} href={href} className={`${sizeClass} overflow-hidden bg-gray-50`}>
                    <ImageWithFallback src={banner.imageUrl} className="w-full h-full object-cover" />
                  </Link>
                ) : (
                  <div key={banner.id} className={`${sizeClass} overflow-hidden bg-gray-50`}>
                    <ImageWithFallback src={banner.imageUrl} className="w-full h-full object-cover" />
                  </div>
                );
              })
            : fallbackCards.map((card) => (
                <Link
                  key={card.id}
                  href={`/popup/${card.id}`}
                  className="flex-[0_0_100%] h-[400px] min-[700px]:flex-[0_0_600px] min-[700px]:h-[600px] min-[700px]:mr-4 min-[700px]:rounded-2xl overflow-hidden bg-gray-50 flex items-end p-4"
                >
                  <span className="text-sm mobile:text-base font-medium text-gray-700 dark:text-gray-300">
                    {card.name}
                  </span>
                </Link>
              ))}
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
