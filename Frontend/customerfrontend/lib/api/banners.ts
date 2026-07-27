// lib/api/banners.ts
//
// [신규 연결] 관리자가 이미지 업로드로 관리하는 실제 배너 API가 생겼어요
// (GET /api/banners, 공개). 이전엔 홈 화면 프로모션 캐러셀이 진행중 팝업 데이터를
// 그대로 재활용해서 흉내만 내고 있었는데, 이제 진짜 배너 이미지/링크로 보여줍니다.

import { apiFetch } from "./client";

export interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
}

export function getBanners() {
  return apiFetch<Banner[]>("/api/banners");
}
