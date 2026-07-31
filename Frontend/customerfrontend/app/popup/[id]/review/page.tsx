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

  // [신규] 홈/상세페이지의 "다녀오셨나요?" 카드에서 별을 눌러서 넘어온 경우,
  // ?rating=4 같은 쿼리로 별점을 미리 채운 채로 시작해요.
  const initialRating = Number(searchParams.get("rating")) || 0;
  const [rating, setRating] = useState(initialRating);
  const [content, setContent] = useState("");

  // [신규] 후기 수정 모드 - /popup/{id}/review?editId=123 형태로 들어오면, 기존에
  // 썼던 후기 내용(별점/글/사진)을 불러와서 미리 채워둬요. 제출할 때 새로 만들지
  // (createReview) 않고 기존 걸 고치도록(updateReview) 분기해요.
  const editId = searchParams.get("editId");
  // [수정] "다녀간 날짜"를 직접 고르게 하던 걸 없앴어요. 이 팝업에 대해 내가 실제로
  // 체크인 완료했거나(예약 - entryStatus === "CHECKED_IN" / 예약일이 이미 지남) 입장
  // 완료한(웨이팅 - enteredAt) 기록이 있으면 그 중 가장 최근 날짜를 자동으로 채워서
  // 읽기 전용으로 보여주고, 그런 기록이 하나도 없으면 이 항목 자체를 화면과 제출
  // payload에서 완전히 뺍니다. (거짓으로 날짜를 입력할 수 있던 문제를 해소)
  const [visitDate, setVisitDate] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!editId) return;
    getMyReviews()
      .then((reviews) => {
        const target = reviews.find((r) => r.id === Number(editId));
        if (!target) return;
        setRating(target.rating);
        setContent(target.content);
        setImageUrls(target.imageUrls ?? []);
      })
      .catch((err) => console.error("수정할 후기 조회 실패", err));
  }, [editId]);
  const [pendingFile, setPendingFile] = useState<File | null>(null); // 크롭 대기 중인 파일
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPopup(id)
      .then((data) => {
        if (!cancelled) setPopup(data);
      })
      .catch((err) => console.error("팝업 정보 조회 실패", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // [신규] 상단에 대표 이미지를 보여주기 위한 조회
    getPopupImages(id)
      .then((images) => {
        if (!cancelled) setMainImageUrl(images[0]?.imageUrl ?? null);
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

  // [수정] 파일을 고르면 바로 업로드하지 않고, 먼저 정사각형으로 잘라내는 화면을 띄웁니다.
  // 크롭이 끝나면(ImageCropModal의 onConfirm) 항상 800x800px로 고정된 이미지가 나와서
  // 그걸 업로드해요 - 후기 사진 크기가 들쭉날쭉하지 않게 통일됩니다.
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

  // [수정] 상단 <img src="/Icon/back_arrow.svg" alt="" width={48} height={48} /> 버튼도 제출 성공 시와 동일하게 back()을 씁니다.
  // 이전엔 <Link href={`/popup/${id}`}>라서 뒤로가기 버튼을 눌러도 "새 이동(push)"이
  // 일어났어요. 그러면 히스토리가 [..., 상세, 후기작성, 상세(새로 push)]가 되어,
  // 방금 뒤로가기로 나간 상세페이지에서 또 뒤로가기를 누르면 원래 오던 곳이 아니라
  // 바로 직전의 후기 작성 페이지로 돌아가는 문제가 있었습니다. back()을 쓰면 새 항목을
  // 쌓지 않고 원래 있던 상세페이지로 돌아가서 이 문제가 사라져요.
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/popup/${id}`);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
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
          rating,
          content: content.trim(),
          imageUrls,
          visitDate: visitDate ?? undefined,
        });
      } else {
        await createReview({
          popupId: popup.id,
          rating,
          content: content.trim(),
          imageUrls,
          visitDate: visitDate ?? undefined,
        });
      }
      // [수정] 등록 성공 후에는 back() 대신 replace()로 상세페이지의 후기탭
      // (?tab=review)으로 보냅니다.
      // - back()만 쓰면 상세페이지가 "정보" 탭인 채로 돌아가서, 방금 등록한 후기를
      //   보려면 사용자가 직접 후기 탭을 다시 눌러야 했어요. replace + ?tab=review로
      //   보내면 곧바로 후기 탭이 선택된 상태로 열립니다.
      // - replace()는 현재 히스토리 항목(이 후기 작성 페이지)을 "대체"할 뿐 새 항목을
      //   추가하지 않아서, 상세페이지에서 뒤로가기를 눌러도 방금 작성을 끝낸 이
      //   후기 작성 페이지로 다시 돌아가는 일이 없습니다.
      router.replace(`/popup/${id}?tab=review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "후기 등록에 실패했어요.");
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
          <img src="/Icon/back_arrow.svg" alt="" width={48} height={48} />
        </button>
        <h1 className="text-lg font-bold">{editId ? "후기 수정하기" : "후기 작성하기"}</h1>
      </div>

      <div className="px-4 mobile:px-8 py-6 flex flex-col gap-6">
        {/* [수정] 팝업 제목 한 줄만 있던 걸, 대표 이미지 + 기간/장소까지 보이는
            카드로 바꿨어요 - 지금 어떤 팝업에 대한 후기를 쓰는지 더 명확하게 보여요. */}
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

        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">별점</span>
          <StarRatingInput value={rating} onChange={setRating} />
        </div>

        {visitDate && (
          <div className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">다녀간 날짜</span>
            <div className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
              {visitDate}
            </div>
            <p className="text-sm text-gray-400 mt-1.5">예약/웨이팅 방문 기록에서 자동으로 채워졌어요.</p>
          </div>
        )}

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">후기 내용</span>
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
                className={`w-28 h-28 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm ${
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
          className="w-full rounded-full py-3.5 text-base font-medium bg-gray-900 text-white disabled:opacity-60"
        >
          {submitting ? "저장하는 중..." : editId ? "수정 완료" : "후기 등록하기"}
        </button>
      </div>

      {pendingFile && (
        <ImageCropModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </main>
  );
}
