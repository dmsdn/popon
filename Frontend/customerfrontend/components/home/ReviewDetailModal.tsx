"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import { ReviewItem } from "@/data/mockPopups";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

/**
 * 후기 카드를 눌렀을 때 뜨는 "크게 보기" 모달입니다.
 * ReservationModal/WaitingModal과 같은 반응형 패턴을 그대로 씁니다:
 * - 모바일(1000px 미만): 화면 하단에서 올라오는 시트
 * - 웹(1000px 이상): 화면 중앙 다이얼로그
 * 별도로 모바일/웹 컴포넌트를 나누지 않고 하나로 두 화면 다 대응해요.
 *
 * [수정] 이 모달을 ReviewCard 안에서 그대로 렌더링했더니, ReviewCard가 들어있는
 * HorizontalCarousel(embla-carousel)이 슬라이드 이동을 위해 조상 요소에
 * CSS transform을 걸어놔서 — position:fixed의 기준이 화면 전체가 아니라 그
 * transform 걸린 캐러셀 박스가 되어버렸어요. 그래서 모달이 캐러셀의
 * overflow-hidden 영역 안에서만 보이고 위아래가 잘리고, 닫기 버튼도 그
 * 잘린 영역 밖으로 밀려나 안 보였던 거예요. createPortal로 document.body에
 * 바로 붙여서 캐러셀의 transform/overflow 영향을 아예 안 받게 했습니다.
 */
export function ReviewDetailModal({ review, onClose }: { review: ReviewItem; onClose: () => void }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 flex items-end mobile:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full mobile:max-w-md bg-white rounded-t-2xl mobile:rounded-2xl px-6 pt-6 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-semibold">후기</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-500 text-lg">
            ✕
          </button>
        </div>

        {/* 팝업 정보 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-lg bg-gray-100 flex-none flex items-center justify-center text-sm text-gray-400">
            {review.popupName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{review.popupName}</p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <StatusBadge status={review.status} />
              {review.region && (
                <span className="text-[11px] text-gray-500 bg-gray-50 rounded px-1.5 py-0.5">
                  {review.region}
                </span>
              )}
              {review.category && (
                <span className="text-[11px] text-gray-500 bg-gray-50 rounded px-1.5 py-0.5">
                  {review.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 사진 (있을 때만, 여러 장이면 가로 스크롤) */}
        {review.photos && review.photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto mb-5">
            {review.photos.map((photo, i) => (
              <div
                key={photo + i}
                className="w-40 h-40 flex-none rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-xs text-gray-400"
              >
                {photo.startsWith("http") || photo.startsWith("/") ? (
                  <ImageWithFallback src={photo} className="w-full h-full object-cover" />
                ) : (
                  `사진 ${i + 1}`
                )}
              </div>
            ))}
          </div>
        )}

        {/* 리뷰어 정보 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-700">
            {review.nickname}
            {typeof review.reviewCount === "number" && (
              <span className="text-gray-400"> · 이 팝업 후기 {review.reviewCount}개</span>
            )}
          </span>
          <span className="text-sm font-medium text-gray-800">⭐ {review.rating.toFixed(1)} / 5.0</span>
        </div>

        {/* 후기 본문 - 전체 다 보여줌 (홈 카드에선 2줄로 잘려있던 것) */}
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">{review.content}</p>
        <p className="text-xs text-gray-400 mb-6">{review.date}</p>

        <Link
          href={`/popup/${review.popupId}`}
          className="block w-full text-center rounded-full py-3 text-sm font-medium bg-gray-900 text-white"
        >
          팝업 보러가기
        </Link>
      </div>
    </div>,
    document.body
  );
}
