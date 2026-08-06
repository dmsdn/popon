// components/layout/VisitLogger.tsx
// 팝업 상세페이지 방문 기록을 백엔드에 남기는 보이지 않는 컴포넌트
"use client";

import { useEffect } from "react";
import { logVisit } from "@/lib/api/visits";

export function VisitLogger() {
  useEffect(() => {
    logVisit();
  }, []);

  return null;
}
