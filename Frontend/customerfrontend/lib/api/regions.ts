// lib/api/regions.ts
//
// [신규 연결] 예전엔 백엔드 region이 서울/경기/부산 같은 시/도 단위라 이 앱이 실제로 쓰는
// 동네 단위(성수/강남/홍대)랑 안 맞아서 로컬 저장으로만 처리해뒀었는데, 백엔드가
// AdminRegionController로 관리자가 동네 단위 지역을 직접 관리하는 구조로 바뀌었어요.
// 이제 진짜 API로 연결합니다.

import { apiFetch } from "./client";

export interface Region {
  id: number;
  name: string;
}

export function getRegions() {
  return apiFetch<Region[]>("/api/regions");
}

export function saveMyRegions(regionIds: number[]) {
  return apiFetch<{ success: boolean; count: number }>("/api/customer/regions", {
    method: "POST",
    body: JSON.stringify({ regionIds }),
  });
}

// [신규] 마이페이지 수정 화면에서 기존 선택값을 미리 체크해줄 방법이 없어서 추가.
export function getMyRegions() {
  return apiFetch<{ regionIds: number[] }>("/api/customer/regions/mine");
}

export interface PopupByRegion {
  id: number;
  title: string;
  location: string | null;
  regionName: string | null;
}

export function getPopupsByMyRegions() {
  return apiFetch<PopupByRegion[]>("/api/customer/popups/by-region");
}
