"use client";

// 백엔드 연결이 끊겼을 때(mock 데이터로 대체 중일 때) 화면 상단에 뜨는 경고 배너.

import { useSyncExternalStore } from "react";
import { subscribeBackendStatus, getBackendStatusSnapshot } from "@/lib/backendStatus";

export function BackendStatusBanner() {
  const isDown = useSyncExternalStore(subscribeBackendStatus, getBackendStatusSnapshot, () => false);

  if (!isDown) return null;

  return (
    <div className="sticky top-0 z-[60] bg-gray-900 text-white text-sm text-center py-2 px-4">
      ⚠️ 백엔드 서버에 연결할 수 없어요. 화면은 임시 데이터(mock)로 보여드리고 있어요.
    </div>
  );
}
