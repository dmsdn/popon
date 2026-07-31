"use client";

import { useEffect, useState } from "react";
import { getRecentReviews } from "@/lib/api/reviews";
import { getPopup, type PopupDetail } from "@/lib/api/popups";
import { toPopupItem } from "@/lib/utils/popupMapper";
import { toDisplayDate } from "@/lib/api/reviews";
import { ReviewCard } from "./ReviewCard";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import type { ReviewItem } from "@/data/mockPopups";

/**
 * [수정] 100% 목업이던 걸 실제 최근 후기 API로 교체했어요. 후기 자체엔 팝업 이름이
 * 안 실려 있어서(popupId만 있음), 후기에 등장하는 팝업들의 정보를 한 번 더 가져와서
 * 이름/상태/지역을 붙여줘요.
 */
export function ReviewSection() {
  const [items, setItems] = useState<ReviewItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    getRecentReviews(10).then(async (reviews) => {
      if (cancelled || reviews.length === 0) return;

      const uniquePopupIds = [...new Set(reviews.map((r) => r.popupId))];
      const popups = await Promise.all(
        uniquePopupIds.map((id) => getPopup(id).catch(() => null))
      );
      const popupById = new Map<number, PopupDetail>();
      popups.forEach((p) => {
        if (p) popupById.set(p.id, p);
      });

      if (cancelled) return;
      const withPopupInfo: ReviewItem[] = reviews
        .filter((r) => popupById.has(r.popupId))
        .map((r) => {
          const popup = popupById.get(r.popupId)!;
          return {
            id: `recent-${r.id}`,
            reviewId: r.id,
            popupId: String(r.popupId),
            popupName: popup.title,
            nickname: "방문자",
            content: r.content,
            date: toDisplayDate(r.createdAt),
            rating: r.rating,
            photos: r.imageUrls.length > 0 ? r.imageUrls : undefined,
            status: toPopupItem(popup).status,
            region: popup.regionName ?? undefined,
          };
        });
      setItems(withPopupInfo);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mb-14 mobile:mb-16 px-4 mobile:px-8">
      <h3 className="text-base mobile:text-lg font-semibold mb-3 mobile:mb-4">실시간 후기 모음</h3>
      <HorizontalCarousel>
        {items.map((r, i) => (
          <ReviewCard key={r.id} review={r} allReviews={items} index={i} />
        ))}
      </HorizontalCarousel>
    </section>
  );
}
