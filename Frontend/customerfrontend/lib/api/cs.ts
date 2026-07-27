// lib/api/cs.ts
import { apiFetch } from "./client";

export interface CsRequestItem {
  id: number;
  customerId: number;
  customerNickname: string;
  title: string;
  content: string;
  status: string; // PENDING | ANSWERED 등
  answerContent: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  createdAt: string;
}

export interface CsCreatePayload {
  title: string;
  content: string;
}

// ⚠️ 백엔드가 customerId를 JWT가 아니라 쿼리파라미터로 받아요 (CsRequestController 기준).
export function createCsRequest(customerId: number, payload: CsCreatePayload) {
  return apiFetch<CsRequestItem>(`/api/cs?customerId=${customerId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyCsRequests(customerId: number) {
  return apiFetch<CsRequestItem[]>(`/api/cs/me?customerId=${customerId}`);
}
