"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createReview } from "@/lib/api/reviews";
import { getPopup, type PopupDetail } from "@/lib/api/popups";

const MAX_IMAGE_COUNT = 5;
const RATING_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export default function WriteReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [popup, setPopup] = useState<PopupDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
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
    return () => {
      cancelled = true;
    };
  }, [id]);

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

  // TODO: 실제 이미지 업로드(스토리지 연동) 붙이기 전까지는 자리표시용 예시 이미지를 추가해요.
  const handleAddImage = () => {
    if (imageUrls.length >= MAX_IMAGE_COUNT) return;
    setImageUrls((prev) => [...prev, `https://picsum.photos/seed/${Date.now()}/200`]);
  };

  const handleRemoveImage = (url: string) => {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("후기 내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createReview({
        popupId: popup.id,
        rating,
        content: content.trim(),
        imageUrls,
      });
      router.push(`/popup/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "후기 등록에 실패했어요.");
      setSubmitting(false);
    }
  };

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="flex items-center gap-2 px-4 mobile:px-8 py-4 border-b border-gray-100">
        <Link href={`/popup/${id}`} aria-label="뒤로가기" className="text-lg text-gray-500">
          ‹
        </Link>
        <h1 className="text-lg font-bold">후기 작성하기</h1>
      </div>

      <div className="px-4 mobile:px-8 py-6 flex flex-col gap-6">
        <p className="text-sm text-gray-500">{popup.title}</p>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">별점</span>
          <div className="flex flex-wrap gap-2">
            {RATING_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  rating === value
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                ⭐ {value}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">후기 내용</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="팝업에서의 경험을 남겨주세요."
            className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none resize-none"
          />
        </label>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">
            사진 ({imageUrls.length}/{MAX_IMAGE_COUNT})
          </span>
          <div className="flex gap-2 flex-wrap">
            {imageUrls.map((url) => (
              <div key={url} className="relative w-20 h-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-20 h-20 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(url)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center"
                  aria-label="사진 삭제"
                >
                  ×
                </button>
              </div>
            ))}
            {imageUrls.length < MAX_IMAGE_COUNT && (
              <button
                type="button"
                onClick={handleAddImage}
                className="w-20 h-20 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs"
              >
                + 사진
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-full py-3.5 text-sm font-medium bg-gray-900 text-white disabled:opacity-60"
        >
          {submitting ? "등록하는 중..." : "후기 등록하기"}
        </button>
      </div>
    </main>
  );
}
