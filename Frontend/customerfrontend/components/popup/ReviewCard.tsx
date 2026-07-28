"use client";

import { useState } from "react";
import { ReviewItem } from "@/data/mockPopups";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { StarRatingDisplay } from "@/components/ui/StarRatingDisplay";

const CONTENT_PREVIEW_LENGTH = 60;

export function ReviewCard({ review }: { review: ReviewItem }) {
  const { nickname, content, date, rating, photos } = review;
  const [expanded, setExpanded] = useState(false);

  const isLong = content.length > CONTENT_PREVIEW_LENGTH;

  return (
    <div className="border-b border-gray-100 py-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-none">
          {nickname.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{nickname}</p>
          <p className="text-xs text-gray-400">{date}</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-gray-700 flex-none">
          <StarRatingDisplay rating={rating} size={12} /> {rating}
        </span>
      </div>

      <p className={`text-sm text-gray-700 leading-relaxed ${!expanded && isLong ? "line-clamp-2" : ""}`}>
        {content}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs text-gray-400 mt-1"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      )}

      {photos && photos.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {photos.map((photo, i) => (
            <div
              key={photo + i}
              className="w-20 h-20 flex-none bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-gray-400 text-xs"
            >
              {photo.startsWith("http") || photo.startsWith("/") ? (
                <ImageWithFallback src={photo} className="w-full h-full object-cover" />
              ) : (
                // mock 데이터(실제 URL이 아닌 "p1" 같은 자리표시자)일 때만 회색 박스로 대체
                "사진"
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}