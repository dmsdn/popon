// lib/api/regions.ts
// 지역 목록 조회, 사용자 관심 지역 저장 및 조회, 관심지역 기준으로 팝업 목록 가져오는 API

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

// 기존에 선택한 관심 지역을 불러와 내 정보 수정 화면에 표시
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
