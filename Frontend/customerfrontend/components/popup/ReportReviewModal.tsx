"use client";

// 후기 신고 사유를 선택하는 모달.

import { createPortal } from "react-dom";
import { useState } from "react";
import { createReport, type ReportReason } from "@/lib/api/reports";
import { useAuth } from "@/lib/auth/AuthContext";
import { saveRedirectTarget } from "@/lib/postLoginRedirect";
import { useRouter } from "next/navigation";

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: "ABUSE", label: "욕설/비방" },
  { value: "SPAM", label: "광고/스팸" },
  { value: "FALSE_INFO", label: "허위 정보" },
  { value: "OTHER", label: "기타" },
];

/**
 * 후기 카드 옆 "신고" 버튼을 누르면 뜨는 신고 사유 선택 모달.
 * 다른 모달들과 동일하게 캐러셀 안에서도 잘리지 않게 portal로 렌더링해요.
 */
export function ReportReviewModal({ reviewId, onClose }: { reviewId: number; onClose: () => void }) {
  const { customer } = useAuth();
  const router = useRouter();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    if (!customer) {
      saveRedirectTarget(window.location.pathname);
      router.push("/login");
      return;
    }
    setSubmitting(true);
    try {
      await createReport(customer.id, { reviewId, reason, detail: detail.trim() || undefined });
      setDone(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "신고 접수에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-end mobile:items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full mobile:max-w-sm bg-white dark:bg-[#282B32] rounded-t-2xl mobile:rounded-2xl px-6 pt-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <>
            <p className="text-sm font-semibold mb-2">신고가 접수됐어요</p>
            <p className="text-sm text-gray-500 mb-6">확인 후 조치할게요. 알려주셔서 감사해요.</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full py-3 text-base font-medium bg-gray-900 text-white"
            >
              닫기
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold">후기 신고</p>
              <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-500 text-lg">
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              {REASON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setReason(opt.value)}
                  className={`flex items-center gap-2 rounded-lg py-3 px-3 text-sm border text-left ${
                    reason === opt.value ? "border-gray-900 text-gray-900 dark:text-white font-medium" : "border-gray-200 dark:border-[#282B32] text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-none ${
                      reason === opt.value ? "border-gray-900 dark:border-white" : "border-gray-300 dark:border-[#282B32]"
                    }`}
                  >
                    {reason === opt.value && <span className="w-2 h-2 rounded-full bg-gray-900" />}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>

            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="상세 내용 (선택)"
              rows={3}
              className="w-full bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm outline-none resize-none mb-4"
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="w-full rounded-full py-3 text-base font-medium bg-gray-900 text-white disabled:opacity-50"
            >
              {submitting ? "접수 중..." : "신고하기"}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
