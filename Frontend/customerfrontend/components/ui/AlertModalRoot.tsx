// components/ui/AlertModalRoot.tsx
// 전역 alert/confirm 모달
"use client";

import { useSyncExternalStore } from "react";
import { getAlertSnapshot, resolveAlertRequest, subscribeAlertStore } from "@/lib/ui/alertStore";

export function AlertModalRoot() {
  const request = useSyncExternalStore(subscribeAlertStore, getAlertSnapshot, () => null);

  if (!request) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-[100]"
      onClick={() => {
        // 바깥 영역을 눌러 닫는 건 "취소"와 같은 의미로 처리
        resolveAlertRequest(false);
      }}
    >
      <div
        className="bg-white dark:bg-[#282B32] rounded-2xl px-6 py-6 w-full max-w-xs text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap mb-6">{request.message}</p>
        {request.kind === "confirm" ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => resolveAlertRequest(false)}
              className="flex-1 rounded-full py-3 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              {request.cancelLabel ?? "취소"}
            </button>
            <button
              type="button"
              onClick={() => resolveAlertRequest(true)}
              className="flex-1 rounded-full py-3 text-sm font-bold bg-point text-gray-900 dark:text-white"
            >
              {request.confirmLabel ?? "확인"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => resolveAlertRequest(true)}
            className="w-full rounded-full py-3 text-sm font-bold bg-point text-gray-900 dark:text-white"
          >
            확인
          </button>
        )}
      </div>
    </div>
  );
}
