"use client";

import { useEffect } from "react";
import { logVisit } from "@/lib/api/visits";

/**
 * 화면에 아무것도 그리지 않고, 앱이 처음 켜질 때 방문 로그만 한 번 조용히 남겨요.
 * 같은 날 여러 번 켜도 서버가 중복 기록을 걸러줘서 매번 불러도 괜찮아요.
 */
export function VisitLogger() {
  useEffect(() => {
    logVisit();
  }, []);

  return null;
}
