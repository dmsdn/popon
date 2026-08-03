"use client";

// 홈 화면 "실시간 후기 모음"용 후기 카드 - 팝업 썸네일과 후기 내용을 같이 보여줘요.

import { useState } from "react";
import Link from "next/link";
import { ReviewItem } from "@/data/mockPopups";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { StarRatingDisplay } from "@/components/ui/StarRatingDisplay";
import { ReviewDetailModal } from "./ReviewDetailModal";

/**
 * 홈 "실시간 후기 모음" 카드.
 * [수정] 팝업정보 / 후기내용 / 사진, 세 부분을 각각 카드로 나눠서 서로 구분이
 * 잘 되게 했어요(예전엔 다 붙어있어서 뭐가 뭔지 안 보인다는 피드백이 있었어요).
 * 후기내용 카드엔 최소/최대 높이를 줘서 너무 짧거나 길어서 카드 크기가
 * 들쭉날쭉하지 않게 했어요. 폰트도 한 단계씩 키웠어요.
 */
export function ReviewCard({
  review,
  allReviews,
  index,
}: {
  review: ReviewItem;
  allReviews: ReviewItem[];
  index: number;
}) {
  const { popupId, popupName, nickname, content, date, rating, photos, status, region, category, reviewCount } = review;
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <div className="flex-none w-[260px] flex flex-col gap-0">
        {/* 1. 팝업정보 카드 - 누르면 상세페이지로 바로 이동 */}
        <Link href={`/popup/${popupId}`} className="flex items-start gap-2.5 bg-gray-50 dark:bg-[#282B32] rounded-xl p-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#282B32] flex-none flex items-center justify-center text-sm text-gray-400">
            {popupName[0]}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold truncate">{popupName}</p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <StatusBadge status={status} />
              {region && <span className="text-sm text-gray-500">{region}</span>}
              {category && <span className="text-sm text-gray-500">{category}</span>}
            </div>
          </div>
        </Link>

        <button type="button" onClick={() => setShowDetail(true)} className="flex flex-col gap-0 text-left">
          {/* 2. 후기 내용 카드 - 최소/최대 높이 고정, 테두리 없앰 */}
          <div className="rounded-xl p-3 min-h-[120px] max-h-[160px] flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {nickname}
                {typeof reviewCount === "number" && (
                  <span className="text-gray-400"> · 후기 {reviewCount}</span>
                )}
              </span>
              {rating != null && (
                <span className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 flex-none ml-1">
                  <StarRatingDisplay rating={rating} size={14} /> {rating} / 5
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">{content}</p>
            <span className="text-sm text-gray-400 mt-auto">{date}</span>
          </div>

          {/* 3. 사진 카드 - 있을 때만 */}
          {photos && photos.length > 0 && (
            <div className="h-[160px] rounded-xl bg-gray-100 dark:bg-[#282B32] flex items-center justify-center text-sm text-gray-400 overflow-hidden">
              {photos[0].startsWith("http") || photos[0].startsWith("/") ? (
                <ImageWithFallback src={photos[0]} className="w-full h-full object-cover" />
              ) : (
                `사진 ${photos.length}장`
              )}
            </div>
          )}
        </button>
      </div>

      {showDetail && (
        <ReviewDetailModal reviews={allReviews} initialIndex={index} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}
