// lib/api/banners.ts
// 베너 연결
//
// [신규 연결] 관리자가 이미지 업로드로 관리하는 실제 배너 API (GET /api/banners, 공개)
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
