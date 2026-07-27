"use client";

import { useState } from "react";
import Link from "next/link";
import { ReviewItem } from "@/data/mockPopups";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { ReviewDetailModal } from "./ReviewDetailModal";

/**
 * 홈 "실시간 후기 모음" 카드.
 * - 팝업 정보(아바타+이름) 영역: 누르면 바로 그 팝업 상세페이지로 이동
 * - 나머지 영역(후기 본문/사진 등): 누르면 후기를 크게 보는 모달이 뜸
 *   (모바일에선 하단시트, 웹에선 중앙 다이얼로그로 자동으로 다르게 보여요 - ReviewDetailModal 참고)
 */
export function ReviewCard(review: ReviewItem) {
  const { popupId, popupName, nickname, content, date, rating, photos, status, region, category, reviewCount } = review;
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <div className="flex-none w-[220px] border border-gray-100 rounded-xl p-3 flex flex-col gap-2.5">
        {/* 팝업 정보: 누르면 상세페이지로 바로 이동 */}
        <Link href={`/popup/${popupId}`} className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex-none flex items-center justify-center text-xs text-gray-400">
            {popupName[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{popupName}</p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <StatusBadge status={status} />
              {region && (
                <span className="text-[11px] text-gray-500 bg-gray-50 rounded px-1.5 py-0.5">{region}</span>
              )}
              {category && (
                <span className="text-[11px] text-gray-500 bg-gray-50 rounded px-1.5 py-0.5">{category}</span>
              )}
            </div>
          </div>
        </Link>

        {/* 나머지 영역: 누르면 후기 크게 보기 모달 */}
        <button type="button" onClick={() => setShowDetail(true)} className="flex flex-col gap-2.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 truncate">
              {nickname}
              {typeof reviewCount === "number" && (
                <span className="text-gray-400"> · 후기 {reviewCount}</span>
              )}
            </span>
            <span className="text-xs font-medium text-gray-700 flex-none ml-1">
              ⭐ {rating.toFixed(1)} / 5.0
            </span>
          </div>

          <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{content}</p>

          {photos && photos.length > 0 && (
            <div className="h-[100px] rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 overflow-hidden">
              {photos[0].startsWith("http") || photos[0].startsWith("/") ? (
                <ImageWithFallback src={photos[0]} className="w-full h-full object-cover" />
              ) : (
                `사진 ${photos.length}장`
              )}
            </div>
          )}

          <span className="text-[11px] text-gray-400">{date}</span>
        </button>
      </div>

      {showDetail && <ReviewDetailModal review={review} onClose={() => setShowDetail(false)} />}
    </>
  );
}
