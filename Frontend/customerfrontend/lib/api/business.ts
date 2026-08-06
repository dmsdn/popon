// lib/api/business.ts
// 브랜드 조회
//
// [신규] 백엔드에 소비자용 공개 브랜드 조회 API(GET /api/business/{id}, 로그인 불필요)
// 브랜드 상세페이지(app/brand/[id]/page.tsx)에 실제 이미지 받아옴

import { apiFetch } from "./client";

export interface BrandInfo {
  id: number;
  companyName: string;
  profileImage: string | null;
}

export function getBrandInfo(businessId: number | string) {
  return apiFetch<BrandInfo>(`/api/business/${businessId}`);
}
