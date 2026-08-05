// lib/api/business.ts
//
// [신규 8/5] 백엔드에 소비자용 공개 브랜드 조회 API(GET /api/business/{id}, 로그인
// 불필요)가 새로 생겼어요. 브랜드 상세페이지(app/brand/[id]/page.tsx)가 지금까지
// 로고 이미지 없이 빈 회색 박스만 보여주던 이유가 이 API가 없어서였는데, 이제
// 실제 이미지(profileImage)를 받아올 수 있어요.

import { apiFetch } from "./client";

export interface BrandInfo {
  id: number;
  companyName: string;
  profileImage: string | null;
}

export function getBrandInfo(businessId: number | string) {
  return apiFetch<BrandInfo>(`/api/business/${businessId}`);
}
