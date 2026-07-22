"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  recentPopups,
  popularPopups,
  openingSoonPopups,
  freePopups,
  addReview,
  type PopupItem,
} from "@/data/mockPopups";

function findPopupById(id: string): PopupItem | undefined {
  const all = [...recentPopups, ...popularPopups, ...openingSoonPopups, ...freePopups];
  return all.find((item) => item.id === id);
}

function formatToday(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

export default function WriteReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isLoggedIn, loading, customer } = useAuth();
  const popup = findPopupById(id);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [loading, isLoggedIn, router]);

  if (loading || !isLoggedIn) return null;

  if (!popup) {
    return (
      <main className="px-6 py-20 text-center text-gray-400">
        팝업 정보를 찾을 수 없어요.
      </main>
    );
  }

  const canSubmit = rating > 0 && content.trim().length > 0 && !submitting;
  const displayRating = hoverRating || rating;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    addReview({
      id: `${Date.now()}`,
      popupName: popup.name,
      nickname: customer?.nickname ?? "익명",
      content: content.trim(),
      date: formatToday(),
      rating,
    });

    setSubmitting(false);
    router.push(`/popup/${id}`);
  };

  return (
    <main className="w-full mobile:max-w-[600px] mobile:mx-auto flex flex-col min-h-screen px-6 py-10">
      <button
        type="button"
        onClick={() => router.back()}
        className="self-start text-sm text-gray-500 mb-6"
      >
        ‹ 뒤로
      </button>

      <h1 className="text-lg font-bold mb-1">{popup.name}</h1>
      <p className="text-sm text-gray-400 mb-8">방문 후기를 남겨주세요</p>

      <div className="flex justify-center gap-2 mb-8">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            aria-label={`${star}점`}
            className="text-4xl leading-none"
          >
            <span className={displayRating >= star ? "text-yellow-400" : "text-gray-200"}>
              ★
            </span>
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="방문 경험을 자유롭게 남겨주세요."
        rows={6}
        className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none resize-none mb-8"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full rounded-full py-3.5 text-sm font-medium bg-[#FEE500] disabled:opacity-50 mt-auto"
      >
        {submitting ? "등록하는 중..." : "후기 등록하기"}
      </button>
    </main>
  );
}