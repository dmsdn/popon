// components/home/ReviewDetailModal.tsx
// 후기 카드를 눌렀을 때 뜨는 "크게 보기" 모달 - 사진 위주로 넘겨보는 뷰어
"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ReviewItem } from "@/data/mockPopups";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { StarRatingDisplay } from "@/components/ui/StarRatingDisplay";

const DRAG_THRESHOLD = 50;

export function ReviewDetailModal({
  reviews,
  initialIndex,
  onClose,
}: {
  reviews: ReviewItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [reviewIndex, setReviewIndex] = useState(initialIndex);
  const [photoIndex, setPhotoIndex] = useState(0);

  const review = reviews[reviewIndex];
  const photos = review?.photos ?? [];

  const canGoNext = photoIndex < photos.length - 1 || reviewIndex < reviews.length - 1;
  const canGoPrev = photoIndex > 0 || reviewIndex > 0;

  const goNext = () => {
    if (photoIndex < photos.length - 1) {
      setPhotoIndex(photoIndex + 1);
      return;
    }
    if (reviewIndex < reviews.length - 1) {
      setReviewIndex(reviewIndex + 1);
      setPhotoIndex(0);
    }
  };

  const goPrev = () => {
    if (photoIndex > 0) {
      setPhotoIndex(photoIndex - 1);
      return;
    }
    if (reviewIndex > 0) {
      const prevPhotos = reviews[reviewIndex - 1]?.photos ?? [];
      setReviewIndex(reviewIndex - 1);
      setPhotoIndex(Math.max(prevPhotos.length - 1, 0));
    }
  };

  const dragStartX = useRef<number | null>(null);
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragStartX.current === null) return;
    const diff = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (diff > DRAG_THRESHOLD) goPrev();
    else if (diff < -DRAG_THRESHOLD) goNext();
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - dragStartX.current;
    dragStartX.current = null;
    if (diff > DRAG_THRESHOLD) goPrev();
    else if (diff < -DRAG_THRESHOLD) goNext();
  };

  if (typeof document === "undefined" || !review) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#282B32] rounded-2xl overflow-hidden max-w-[500px] w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative w-full aspect-square bg-gray-100 dark:bg-[#282B32] cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {photos.length > 0 ? (
            <ImageWithFallback src={photos[photoIndex]} className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              등록된 사진이 없어요
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-base"
          >
            ✕
          </button>

          {canGoPrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="이전"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center text-lg"
            >
              ‹
            </button>
          )}
          {canGoNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="다음"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center text-lg"
            >
              ›
            </button>
          )}
          {photos.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm text-white bg-black/40 rounded-full px-2 py-0.5">
              {photoIndex + 1} / {photos.length}
            </div>
          )}
        </div>

        {/* 팝업 정보 + 후기 내용 - 넓게 잡아서 읽기 편하게 */}
        <div className="p-5">
          <Link
            href={`/popup/${review.popupId}`}
            className="flex items-center gap-3 mb-4 border border-gray-200 dark:border-[#282B32] rounded-xl p-3"
          >
            <div className="w-11 h-11 rounded-lg bg-gray-100 dark:bg-[#282B32] flex-none flex items-center justify-center text-base text-gray-400">
              {review.popupName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold truncate">{review.popupName}</p>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <StatusBadge status={review.status} />
                {review.region && (
                  <span className="text-sm text-gray-500 bg-gray-50 rounded px-1.5 py-0.5">
                    {review.region}
                  </span>
                )}
              </div>
            </div>
            <span className="text-gray-300 text-lg flex-none">›</span>
          </Link>

          <div className="flex items-center justify-between mb-3">
            <span className="text-base text-gray-700 dark:text-gray-300">{review.nickname}</span>
            {review.rating != null && (
              <span className="flex items-center gap-1 text-base font-medium text-gray-800 dark:text-gray-300">
                <StarRatingDisplay rating={review.rating} size={16} /> {review.rating} / 5
              </span>
            )}
          </div>

          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap mb-2">{review.content}</p>
          <p className="text-sm text-gray-400">{review.date}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
