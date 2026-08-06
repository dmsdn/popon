// app/popup/[id]/review/page.tsx
// 후기(또는 방문 미인증 댓글) 작성/수정 페이지
"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createReview, updateReview, getMyReviews } from "@/lib/api/reviews";
import { uploadFile } from "@/lib/api/upload";
import { getPopup, getPopupImages, type PopupDetail } from "@/lib/api/popups";
import { getMyReservations } from "@/lib/api/reservations";
import { getMyWaitingIds, getMyWaitingStatus } from "@/lib/api/waiting";
import { useAuth } from "@/lib/auth/AuthContext";
import { StarRatingInput } from "@/components/popup/StarRatingInput";
import { ImageCropModal } from "@/components/popup/ImageCropModal";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

const MAX_IMAGE_COUNT = 5;

export default function WriteReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customer } = useAuth();

  const [popup, setPopup] = useState<PopupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);

  // ?rating 쿼리로 별점 초기값 설정
  const initialRating = Number(searchParams.get("rating")) || 0;
  const [rating, setRating] = useState(initialRating);
  const [content, setContent] = useState("");

  // ?editId 쿼리 - 후기 수정 모드(기존 내용 프리필, updateReview 분기)
  const editId = searchParams.get("editId");
  // 다녀간 날짜 - 체크인/입장 기록 기반 자동 산출(읽기전용), 기록 없으면 항목 자체 제외
  const [visitDate, setVisitDate] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!editId) return;
    getMyReviews()
      .then((reviews) => {
        const target = reviews.find((r) => r.id === Number(editId));
        if (!target) return;
        setRating(target.rating ?? 0);
        setContent(target.content);
        setImageUrls(target.imageUrls ?? []);
      })
      .catch((err) => console.error("수정할 후기 조회 실패", err));
  }, [editId]);
  const [pendingFile, setPendingFile] = useState<File | null>(null); // 크롭 대기 중인 파일
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAlreadyReviewed, setShowAlreadyReviewed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // id 변경 즉시 popup state 초기화 (다른 팝업 데이터 잔존 방지)
    setPopup(null);
    setLoading(true);
    getPopup(id)
      .then((data) => {
        if (!cancelled) setPopup(data);
      })
      .catch((err) => console.error("팝업 정보 조회 실패", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // 대표 이미지 조회 - type === "THUMBNAIL" 우선, 없으면 첫 이미지로 폴백
    getPopupImages(id)
      .then((images) => {
        const cover = images.find((img) => img.type === "THUMBNAIL") ?? images[0];
        if (!cancelled) setMainImageUrl(cover?.imageUrl ?? null);
      })
      .catch((err) => console.error("팝업 이미지 조회 실패", err));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!customer || !popup) return;
    let cancelled = false;
    const popupId = popup.id;

    const reservationDates = getMyReservations(customer.id)
      .then((list) =>
        list
          .filter((r) => r.popupId === popupId && r.status !== "CANCELLED")
          .filter((r) => {
            if (r.entryStatus === "CHECKED_IN") return true;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return !!r.reservationDate && new Date(r.reservationDate) < today;
          })
          .map((r) => r.reservationDate ?? r.createdAt.slice(0, 10))
      )
      .catch(() => [] as string[]);

    const waitingDates = Promise.all(
      getMyWaitingIds().map((waitingId) => getMyWaitingStatus(waitingId).catch(() => null))
    ).then((results) =>
      results
        .filter((w): w is NonNullable<typeof w> => w !== null && w.popupId === popupId && !!w.enteredAt)
        .map((w) => (w.enteredAt as string).slice(0, 10))
    );

    Promise.all([reservationDates, waitingDates]).then(([resDates, waitDates]) => {
      if (cancelled) return;
      const allDates = [...resDates, ...waitDates].filter(Boolean).sort();
      setVisitDate(allDates.length > 0 ? allDates[allDates.length - 1] : null);
    });

    return () => {
      cancelled = true;
    };
  }, [customer, popup]);

  if (loading) {
    return <main className="px-6 py-20 text-center text-gray-400">불러오는 중이에요...</main>;
  }

  if (!popup) {
    return (
      <main className="px-6 py-20 text-center text-gray-400">
        팝업 정보를 찾을 수 없어요.
      </main>
    );
  }

  // 사진 선택 시 크롭 모달 우선 표시, 확정 시 800x800 고정 업로드
  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;
    if (imageUrls.length >= MAX_IMAGE_COUNT) return;
    setPendingFile(file);
  };

  const handleCropConfirm = async (blob: Blob) => {
    setPendingFile(null);
    setUploading(true);
    setError(null);
    try {
      const croppedFile = new File([blob], "review-photo.jpg", { type: "image/jpeg" });
      const { url } = await uploadFile(croppedFile);
      setImageUrls((prev) => [...prev, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이미지 업로드에 실패했어요.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  };

  // 뒤로가기 - back() 사용 (Link push 방식은 히스토리 중복 쌓임)
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/popup/${id}`);
    }
  };

  // visitDate 있으면 방문 인증 후기, 없으면 미인증 댓글(별점 불필요)
  const isVisited = visitDate !== null;

  const handleSubmit = async () => {
    if (isVisited && rating === 0) {
      setError("별점을 선택해주세요.");
      return;
    }
    if (!content.trim()) {
      setError("후기 내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editId) {
        await updateReview(Number(editId), {
          popupId: popup.id,
          rating: isVisited ? rating : undefined,
          content: content.trim(),
          imageUrls,
          visitDate: visitDate ?? undefined,
        });
      } else {
        await createReview({
          popupId: popup.id,
          rating: isVisited ? rating : undefined,
          content: content.trim(),
          imageUrls,
          visitDate: visitDate ?? undefined,
        });
      }
      // 등록 성공 시 replace()로 상세 후기탭(?tab=review) 이동 (히스토리 미추가)
      router.replace(`/popup/${id}?tab=review`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "후기 등록에 실패했어요.";
      // 중복 작성 감지 - "이미 "(공백 포함)로 검사해 "이미지"와 구분
      const looksLikeDuplicate =
        message.includes("이미 ") &&
        (message.includes("작성") || message.includes("리뷰") || message.includes("후기") || message.includes("댓글"));

      // 백엔드 "이미 작성했다" 응답 그대로 신뢰 (재확인 로직 제거)
      if (looksLikeDuplicate) {
        setShowAlreadyReviewed(true);
      } else {
        setError(message);
      }
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="flex items-center gap-2 h-14 px-4 mobile:px-8 border-b border-gray-100 dark:border-[#282B32]">
        <button
          type="button"
          onClick={handleBack}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
        </button>
        <h1 className="text-lg font-bold">{editId ? "후기 수정하기" : isVisited ? "후기 작성하기" : "댓글 작성하기"}</h1>
      </div>

      <div className="px-4 mobile:px-8 py-6 flex flex-col gap-6">
        {/* 대표 이미지+기간/장소 카드 */}
        <div className="flex items-center gap-3 border border-gray-200 dark:border-[#282B32] rounded-xl p-3">
          <div className="w-14 h-14 rounded-lg bg-gray-100 flex-none overflow-hidden">
            {mainImageUrl ? (
              <ImageWithFallback src={mainImageUrl} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                이미지
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{popup.title}</p>
            <p className="text-sm text-gray-400 truncate">
              {new Date(popup.startDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} -{" "}
              {new Date(popup.endDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
              {popup.location ? ` · ${popup.location}` : ""}
            </p>
          </div>
        </div>

        {isVisited ? (
          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">별점</span>
            <StarRatingInput value={rating} onChange={setRating} />
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            예약/웨이팅으로 방문 인증된 분들만 별점을 남길 수 있어요. 지금은 댓글로 남겨져요.
          </p>
        )}

        {visitDate && (
          <div className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">다녀간 날짜</span>
            <div className="w-full bg-gray-100 dark:bg-[#282B32] rounded-lg px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
              {visitDate}
            </div>
            <p className="text-sm text-gray-400 mt-1.5">예약/웨이팅 방문 기록에서 자동으로 채워졌어요.</p>
          </div>
        )}

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isVisited ? "후기 내용" : "댓글 내용"}
          </span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="팝업에서의 경험을 남겨주세요."
            className="w-full bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm outline-none resize-none"
          />
        </label>

        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            사진 ({imageUrls.length}/{MAX_IMAGE_COUNT})
          </span>
          <div className="flex gap-2 flex-wrap">
            {imageUrls.map((url) => (
              <div key={url} className="relative w-28 h-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-28 h-28 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(url)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gray-900 text-white text-sm flex items-center justify-center"
                  aria-label="사진 삭제"
                >
                  ×
                </button>
              </div>
            ))}
            {imageUrls.length < MAX_IMAGE_COUNT && (
              <label
                className={`w-28 h-28 rounded-lg border border-dashed border-gray-300 dark:border-[#282B32] flex items-center justify-center text-gray-400 text-sm ${
                  uploading ? "opacity-50" : "cursor-pointer"
                }`}
              >
                {uploading ? "업로드 중" : "+ 사진"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    handleFileSelected(e.target.files?.[0]);
                    e.target.value = ""; // 같은 파일 다시 선택해도 onChange 다시 뜨도록
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="w-full rounded-full py-3.5 text-base font-medium bg-point text-gray-900 dark:text-white disabled:opacity-60 disabled:bg-gray-300 dark:disabled:bg-gray-700"
        >
          {submitting ? "저장하는 중..." : editId ? "수정 완료" : isVisited ? "후기 등록하기" : "댓글 등록하기"}
        </button>
      </div>

      {pendingFile && (
        <ImageCropModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}

      {/* 이미 작성한 경우 안내 모달 */}
      {showAlreadyReviewed && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50"
          onClick={() => setShowAlreadyReviewed(false)}
        >
          <div
            className="bg-white dark:bg-[#282B32] rounded-xl px-6 py-6 w-full max-w-xs text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium mb-6">이미 댓글 / 후기를 남겼습니다.</p>
            <button
              type="button"
              onClick={() => router.replace(`/popup/${id}?tab=review`)}
              className="w-full rounded-full py-3 text-sm font-medium bg-gray-900 text-white"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
