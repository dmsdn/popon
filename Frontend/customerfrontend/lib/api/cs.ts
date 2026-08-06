// lib/api/cs.ts
// 고객 문의 작성 및 내 문의 내역 조회를 담당
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

// 이 CS API는 로그인한 사용자의 JWT에서 customerId를 가져오는 게 아니라, 
// URL의 customerId 쿼리 파라미터로 고객 ID를 전달받음
export function createCsRequest(customerId: number, payload: CsCreatePayload) {
  return apiFetch<CsRequestItem>(`/api/cs?customerId=${customerId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyCsRequests(customerId: number) {
  return apiFetch<CsRequestItem[]>(`/api/cs/me?customerId=${customerId}`);
}
