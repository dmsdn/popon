"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ReviewItem } from "@/data/mockPopups";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { StarRatingDisplay } from "@/components/ui/StarRatingDisplay";

const DRAG_THRESHOLD = 50;

/**
 * 후기 이미지를 크게(약 500x500) 보여주는 모달.
 * [수정] 예전엔 "사진 넘기기"랑 "후기 넘기기"가 버튼이 따로 있었는데(이미지 위 화살표 +
 * 카드 바깥 화살표), 헷갈린다는 피드백이 있었어요. 이제 화살표 하나로 통일해서 -
 * 지금 후기의 사진을 먼저 넘기다가, 마지막 사진이면 다음(이전) 후기의 사진으로
 * 자연스럽게 이어지도록 바꿨어요.
 */
export function ReviewImageModal({
  reviews,
  initialReviewIndex,
  initialPhotoIndex,
  onClose,
}: {
  reviews: ReviewItem[];
  initialReviewIndex: number;
  initialPhotoIndex: number;
  onClose: () => void;
}) {
  const [reviewIndex, setReviewIndex] = useState(initialReviewIndex);
  const [photoIndex, setPhotoIndex] = useState(initialPhotoIndex);

  const review = reviews[reviewIndex];
  const photos = review?.photos ?? [];

  // [신규] 사진 넘기기와 후기 넘기기를 하나로 합친 이동 로직.
  // 지금 후기 안에 사진이 더 있으면 그 사진으로, 없으면(마지막/처음 사진이면)
  // 다음/이전 후기로 넘어가면서 그 후기의 첫(다음일 땐) 또는 마지막(이전일 땐) 사진을 보여줘요.
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

  // 드래그로도 넘길 수 있게
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 select-none" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden max-w-[500px] w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative w-full aspect-square bg-gray-100 cursor-grab active:cursor-grabbing"
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
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-sm"
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

        {/* 후기 정보 - 넓게 잡아서 내용이 읽기 편하게 */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
                {review.nickname.charAt(0)}
              </div>
              <div>
                <p className="text-base font-medium">{review.nickname}</p>
                <p className="text-sm text-gray-400">{review.date}</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-base font-medium text-gray-700 dark:text-gray-300">
              <StarRatingDisplay rating={review.rating} size={16} /> {review.rating} / 5
            </span>
          </div>
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{review.content}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
