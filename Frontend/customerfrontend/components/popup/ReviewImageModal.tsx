"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ReviewItem } from "@/data/mockPopups";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { StarRatingDisplay } from "@/components/ui/StarRatingDisplay";

const DRAG_THRESHOLD = 50; // 이 정도는 움직여야 "넘기려는 의도"로 인정해요

/**
 * 후기 이미지를 크게(약 500x500) 보여주는 모달.
 * - 이미지 위: 좌우로 드래그하거나 화살표를 누르면 "그 후기 안의" 사진을 넘겨요.
 * - 카드 바깥(어두운 배경) 좌우: 화살표를 누르거나 드래그하면 "후기 자체"를 넘겨요.
 *   [수정] 원래 카드 안쪽에 "이전 후기/다음 후기" 글자 버튼이 있었는데, 후기 내용이랑
 *   자리가 겹쳐 보였어요. 화면 바깥(카드 밖) 가장자리로 빼서 내용이랑 안 겹치게 했고,
 *   두 종류 넘기기 다 마우스로 잡아끌어도 되게 만들었어요.
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

  const goToReview = (delta: number) => {
    const next = reviewIndex + delta;
    if (next < 0 || next >= reviews.length) return;
    setReviewIndex(next);
    setPhotoIndex(0);
  };

  const goToPhoto = (delta: number) => {
    const next = photoIndex + delta;
    if (next < 0 || next >= photos.length) return;
    setPhotoIndex(next);
  };

  // [수정] 사진 드래그와 후기 드래그가 시작 좌표를 하나의 ref로 같이 쓰면, "카드
  // 바깥에서 시작해서 이미지 위에서 손을 떼는" 경우처럼 두 드래그가 뒤섞여 엉뚱한
  // 방향으로 넘어갈 수 있어요. 각자 독립된 ref를 쓰도록 분리했어요.
  const photoDragStartX = useRef<number | null>(null);
  const reviewDragStartX = useRef<number | null>(null);

  const photoDrag = {
    onMouseDown: (e: React.MouseEvent) => {
      e.stopPropagation();
      photoDragStartX.current = e.clientX;
    },
    onMouseUp: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (photoDragStartX.current === null) return;
      const diff = e.clientX - photoDragStartX.current;
      photoDragStartX.current = null;
      if (diff > DRAG_THRESHOLD) goToPhoto(-1);
      else if (diff < -DRAG_THRESHOLD) goToPhoto(1);
    },
    onTouchStart: (e: React.TouchEvent) => {
      e.stopPropagation();
      photoDragStartX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.stopPropagation();
      if (photoDragStartX.current === null) return;
      const diff = e.changedTouches[0].clientX - photoDragStartX.current;
      photoDragStartX.current = null;
      if (diff > DRAG_THRESHOLD) goToPhoto(-1);
      else if (diff < -DRAG_THRESHOLD) goToPhoto(1);
    },
  };

  const reviewDrag = {
    onMouseDown: (e: React.MouseEvent) => {
      reviewDragStartX.current = e.clientX;
    },
    onMouseUp: (e: React.MouseEvent) => {
      if (reviewDragStartX.current === null) return;
      const diff = e.clientX - reviewDragStartX.current;
      reviewDragStartX.current = null;
      if (diff > DRAG_THRESHOLD) goToReview(-1);
      else if (diff < -DRAG_THRESHOLD) goToReview(1);
    },
    onTouchStart: (e: React.TouchEvent) => {
      reviewDragStartX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (reviewDragStartX.current === null) return;
      const diff = e.changedTouches[0].clientX - reviewDragStartX.current;
      reviewDragStartX.current = null;
      if (diff > DRAG_THRESHOLD) goToReview(-1);
      else if (diff < -DRAG_THRESHOLD) goToReview(1);
    },
  };

  if (typeof document === "undefined" || !review) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 select-none"
      onClick={onClose}
      {...reviewDrag}
    >
      {/* 후기 넘기기 - 카드 바깥 화면 가장자리에 큼직하게 배치, 클릭도 드래그도 가능 */}
      {reviewIndex > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToReview(-1);
          }}
          aria-label="이전 후기"
          className="hidden mobile:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white items-center justify-center text-2xl"
        >
          ‹
        </button>
      )}
      {reviewIndex < reviews.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToReview(1);
          }}
          aria-label="다음 후기"
          className="hidden mobile:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white items-center justify-center text-2xl"
        >
          ›
        </button>
      )}
      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/70">
        후기 {reviewIndex + 1} / {reviews.length} · 좌우로 끌어서 다음 후기 보기
      </span>

      <div
        className="bg-white rounded-2xl overflow-hidden max-w-[500px] w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full aspect-square bg-gray-100 cursor-grab active:cursor-grabbing" {...photoDrag}>
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

          {/* 사진 넘기기 - 이 후기 안에 사진이 여러 장일 때만 */}
          {photos.length > 1 && (
            <>
              {photoIndex > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPhoto(-1);
                  }}
                  aria-label="이전 사진"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
                >
                  ‹
                </button>
              )}
              {photoIndex < photos.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPhoto(1);
                  }}
                  aria-label="다음 사진"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
                >
                  ›
                </button>
              )}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-white bg-black/40 rounded-full px-2 py-0.5">
                {photoIndex + 1} / {photos.length}
              </div>
            </>
          )}
        </div>

        {/* 후기 정보 - 이제 넘기기 버튼이 카드 밖으로 빠져서 내용이랑 안 겹쳐요 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                {review.nickname.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">{review.nickname}</p>
                <p className="text-[11px] text-gray-400">{review.date}</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-gray-700">
              <StarRatingDisplay rating={review.rating} size={12} /> {review.rating}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{review.content}</p>
        </div>

        {/* 모바일에서는 바깥 화살표가 안 보이니(hidden mobile:flex), 카드 안에도
            작게 이전/다음 버튼을 하나씩 남겨뒀어요. 드래그로도 넘길 수 있어요. */}
        <div className="flex mobile:hidden items-center justify-between px-4 pb-4">
          <button
            type="button"
            onClick={() => goToReview(-1)}
            disabled={reviewIndex === 0}
            className="text-xs text-gray-500 disabled:text-gray-200 disabled:cursor-default"
          >
            ‹ 이전 후기
          </button>
          <button
            type="button"
            onClick={() => goToReview(1)}
            disabled={reviewIndex === reviews.length - 1}
            className="text-xs text-gray-500 disabled:text-gray-200 disabled:cursor-default"
          >
            다음 후기 ›
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
