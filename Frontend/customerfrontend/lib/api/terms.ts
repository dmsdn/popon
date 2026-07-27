// lib/api/terms.ts
//
// [신규 연결] 백엔드 TermsController(GET /api/terms)가 이미 있는데 프론트 어디서도
// 호출하지 않고 있었어요. 회원가입 화면엔 약관 체크박스 라벨만 있고 실제 본문을
// 볼 방법이 없었고, 마이페이지에도 약관을 다시 볼 수 있는 곳이 없었습니다.

import { apiFetch } from "./client";

export interface Terms {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
}

export function getTerms() {
  return apiFetch<Terms>("/api/terms");
}
