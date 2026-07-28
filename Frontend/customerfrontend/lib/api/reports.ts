// lib/api/reports.ts
//
// [신규 연결] 후기 신고 API(POST /api/reports)가 있는데 프론트에 "신고하기" 버튼
// 자체가 없었어요.

import { apiFetch } from "./client";

export type ReportReason = "ABUSE" | "SPAM" | "FALSE_INFO" | "OTHER";

export interface ReportCreatePayload {
  reviewId: number;
  reason: ReportReason;
  detail?: string;
}

export function createReport(customerId: number, payload: ReportCreatePayload) {
  return apiFetch<{ id: number }>(`/api/reports?customerId=${customerId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
