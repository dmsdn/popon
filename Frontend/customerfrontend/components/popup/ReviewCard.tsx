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
  // [신규] 추천 버튼 - API(likeReview/unlikeReview)는 이미 있었는데 화면에 버튼 자체가 없었어요.
  const [liked, setLiked] = useState(review.likedByMe ?? false);
  const [likeCount, setLikeCount] = useState(review.likeCount ?? 0);
  const [likeBusy, setLikeBusy] = useState(false);
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  const isLong = content.length > CONTENT_PREVIEW_LENGTH;

  const handleToggleLike = async () => {
    if (!isLoggedIn) {
      saveRedirectTarget(window.location.pathname);
      router.push("/login");
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    const nextLiked = !liked;
    // 낙관적으로 먼저 화면부터 바꾸고, 실패하면 되돌려요.
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

  // [신규] 내가 쓴 후기 수정 - 후기 작성 화면을 "수정 모드"로 재사용해요.
  const handleEdit = () => {
    router.push(`/popup/${popupId}/review?editId=${reviewId}`);
  };

  // [신규] 내가 쓴 후기 삭제
  const handleDelete = async () => {
    if (!confirm("이 후기를 삭제할까요?")) return;
    setDeleting(true);
    try {
      await deleteReview(reviewId);
      onDelete?.(reviewId);
    } catch (err) {
      console.error("후기 삭제 실패", err);
      alert("삭제에 실패했어요. 잠시 후 다시 시도해주세요.");
      setDeleting(false);
    }
  };

  if (deleting) return null;

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
      <div className="flex items-center gap-3 mt-1">
        {isLong && (
          <button type="button" onClick={() => setExpanded((prev) => !prev)} className="text-xs text-gray-400">
            {expanded ? "접기" : "더보기"}
          </button>
        )}
        <button
          type="button"
          onClick={handleToggleLike}
          className={`flex items-center gap-1 text-xs ${liked ? "text-gray-900 font-medium" : "text-gray-400"}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? "#111827" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M7 10v11M2 10h4a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2v-11ZM7 10l4.5-8a2 2 0 0 1 3.5 1.4V9h4.8a2 2 0 0 1 1.98 2.3l-1.2 8A2 2 0 0 1 18.6 21H7" />
          </svg>
          추천{likeCount > 0 ? ` ${likeCount}` : ""}
        </button>
        {/* [신규] 내가 쓴 후기면 수정/삭제, 남의 후기면 신고 버튼을 보여줘요. */}
        {isMine ? (
          <>
            <button type="button" onClick={handleEdit} className="text-xs text-gray-300">
              수정
            </button>
            <button type="button" onClick={handleDelete} className="text-xs text-gray-300">
              삭제
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setShowReport(true)} className="text-xs text-gray-300">
            신고
          </button>
        )}
      </div>
      {showReport && <ReportReviewModal reviewId={reviewId} onClose={() => setShowReport(false)} />}

      {photos && photos.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {photos.map((photo, i) => (
            <button
              key={photo + i}
              type="button"
              onClick={() => onImageClick?.(i)}
              className="w-40 h-40 flex-none bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-gray-400 text-xs"
            >
              {photo.startsWith("http") || photo.startsWith("/") ? (
                <ImageWithFallback src={photo} className="w-full h-full object-cover" />
              ) : (
                // mock 데이터(실제 URL이 아닌 "p1" 같은 자리표시자)일 때만 회색 박스로 대체
                "사진"
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}