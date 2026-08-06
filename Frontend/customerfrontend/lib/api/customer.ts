// lib/api/customer.ts
// 고객의 회원정보와 관심 키워드를 조회·수정·관리하는 API
import { apiFetch } from "./client";

export interface CustomerInfo {
  id: number;
  provider: "KAKAO" | "GOOGLE" | "DEV";
  nickname: string;
  profileImage: string | null;
  phone: string | null;
  email: string | null;
  birthDate: string | null; // "YYYY-MM-DD"
  gender: "MALE" | "FEMALE" | "UNKNOWN" | null;
  onboarded: boolean;
}

// 내 회원정보 조회
export async function getMyInfo(): Promise<CustomerInfo> {
  const raw = await apiFetch<Partial<CustomerInfo> & { id: number; nickname: string; provider: string }>(
    "/api/customer/me"
  );
  return {
    id: raw.id,
    provider: (raw.provider as CustomerInfo["provider"]) ?? "DEV",
    nickname: raw.nickname,
    profileImage: raw.profileImage ?? null,
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    birthDate: raw.birthDate ?? null,
    gender: raw.gender ?? null,
    onboarded: raw.onboarded ?? true,
  };
}

// 회원정보 수정
export function updateMyInfo(
  payload: Partial<Pick<CustomerInfo, "nickname" | "profileImage" | "phone" | "email" | "birthDate" | "gender">>
) {
  return apiFetch<CustomerInfo>("/api/customer/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// 회원 탈퇴
export function withdrawCustomer() {
  return apiFetch<{ success: boolean }>("/api/customer/me", { method: "DELETE" });
}

export interface Keyword {
  id: number;
  name: string;
  // [신규] 관리자가 카테고리별로 업로드하는 아이콘 이미지
  iconUrl?: string | null;
}

// 전체 관심 키워드 조회
export function getKeywords() {
  return apiFetch<Keyword[]>("/api/keywords");
}

// [신규] 내가 선택한 관심 키워드 조회
export function getMyInterests() {
  return apiFetch<{ keywordIds: number[] }>("/api/customer/interests");
}