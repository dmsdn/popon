// lib/api/reports.ts
// 후기 신고 API

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
