// components/popup/ReviewCard.tsx
// 팝업 상세페이지의 개별 후기 카드 - 별점(또는 방문 미인증 댓글), 사진, 500px 확장/스크롤, 수정·삭제 버튼
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReviewItem } from "@/data/mockPopups";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { StarRatingDisplay } from "@/components/ui/StarRatingDisplay";
import { ReportReviewModal } from "@/components/popup/ReportReviewModal";
import { likeReview, unlikeReview, deleteReview } from "@/lib/api/reviews";
import { useAuth } from "@/lib/auth/AuthContext";
import { saveRedirectTarget } from "@/lib/postLoginRedirect";
import { appAlert, appConfirm } from "@/lib/ui/alertStore";

const CONTENT_PREVIEW_LENGTH = 60;

export function ReviewCard({
  review,
  onImageClick,
  onDelete,
}: {
  review: ReviewItem;
  onImageClick?: (photoIndex: number) => void;
  onDelete?: (reviewId: number) => void;
}) {
  const { id, reviewId, popupId, nickname, content, date, rating, photos, isMine } = review;
  const [expanded, setExpanded] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(review.likedByMe ?? false);
  const [likeCount, setLikeCount] = useState(review.likeCount ?? 0);
  const [likeBusy, setLikeBusy] = useState(false);
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  const isLong = content.length > CONTENT_PREVIEW_LENGTH;

  const handleToggleLike = async () => {
    // 내가 쓴 후기는 스스로 추천할 수 없게
    if (isMine) return;
    if (!isLoggedIn) {
      saveRedirectTarget(window.location.pathname);
      router.push("/login");
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const result = nextLiked ? await likeReview(reviewId) : await unlikeReview(reviewId);
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch (err) {
      console.error("추천 처리 실패", err);
      setLiked(!nextLiked);
      setLikeCount((c) => c + (nextLiked ? -1 : 1));
    } finally {
      setLikeBusy(false);
    }
  };

  const handleEdit = () => {
    router.push(`/popup/${popupId}/review?editId=${reviewId}`);
  };

  const handleDelete = async () => {
    if (!(await appConfirm("이 후기를 삭제할까요?"))) return;
    setDeleting(true);
    try {
      await deleteReview(reviewId);
      onDelete?.(reviewId);
    } catch (err) {
      console.error("후기 삭제 실패", err);
      await appAlert("삭제에 실패했어요. 잠시 후 다시 시도해주세요.");
      setDeleting(false);
    }
  };

  if (deleting) return null;

  return (
    <div className="border-b border-gray-100 dark:border-[#282B32] py-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400 flex-none">
            {nickname.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{nickname}</p>
            <p className="flex items-center gap-1.5 text-sm text-gray-400">
              {date}
              {/* 예약/웨이팅으로 실제 방문 인증된 후기에만 붙는 문구 */}
              {rating != null && <span className="text-point">· 방문 인증</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-none">
          {rating != null && (
            <span className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <StarRatingDisplay rating={rating} size={16} /> {rating}
            </span>
          )}
          {isMine && (
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={handleEdit} className="text-base font-medium text-gray-500">
                수정
              </button>
              <button type="button" onClick={handleDelete} className="text-base font-medium text-gray-500">
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      <p
        className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${
          !expanded && isLong ? "line-clamp-2" : expanded ? "max-h-[500px] overflow-y-auto" : ""
        }`}
      >
        {content}
      </p>
      {isLong && (
        <button type="button" onClick={() => setExpanded((prev) => !prev)} className="text-sm text-gray-400 mt-1">
          {expanded ? "접기" : "더보기"}
        </button>
      )}

      {photos && photos.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {photos.map((photo, i) => (
            <button
              key={photo + i}
              type="button"
              onClick={() => onImageClick?.(i)}
              className="w-[220px] h-[220px] flex-none bg-gray-100 dark:bg-[#282B32] rounded-lg overflow-hidden flex items-center justify-center text-gray-400 text-sm"
            >
              {photo.startsWith("http") || photo.startsWith("/") ? (
                <ImageWithFallback src={photo} className="w-full h-full object-cover" />
              ) : (
                "사진"
              )}
            </button>
          ))}
        </div>
      )}

      {/* 추천/신고 버튼 */}
      <div className="flex items-center gap-4 mt-3">
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={isMine}
          className={`flex items-center gap-1.5 text-sm ${
            isMine ? "text-gray-300 cursor-default" : liked ? "text-gray-900 dark:text-white font-medium" : "text-gray-500"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={liked && !isMine ? "#111827" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M7 10v11M2 10h4a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2v-11ZM7 10l4.5-8a2 2 0 0 1 3.5 1.4V9h4.8a2 2 0 0 1 1.98 2.3l-1.2 8A2 2 0 0 1 18.6 21H7" />
          </svg>
          추천{likeCount > 0 ? ` ${likeCount}` : ""}
        </button>
        {!isMine && (
          <button type="button" onClick={() => setShowReport(true)} className="text-sm text-gray-400">
            신고
          </button>
        )}
      </div>
      {showReport && <ReportReviewModal reviewId={reviewId} onClose={() => setShowReport(false)} />}
    </div>
  );
}
