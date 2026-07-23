import { apiFetch } from "./client";

export interface CustomerInfo {
  id: number;
  provider: "KAKAO" | "GOOGLE" | "DEV";
  nickname: string;
  profileImage: string | null;
  phone: string | null;
  email: string | null;
  onboarded: boolean;
}

// ⚠️ 백엔드 CustomerResponse(domain/consumer/dto/CustomerResponse.java)에는
// 지금 phone과 onboarded 필드가 아예 없어요. 그래서 이 두 값은 응답에 없을 수 있고,
// 없으면 안전한 기본값(phone: null, onboarded: true)으로 채워서 씁니다.
// → 백엔드에 이 두 필드가 추가되면 이 보정 없이도 정확한 값이 내려올 거예요.
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
    onboarded: raw.onboarded ?? true,
  };
}

export function updateMyInfo(payload: Partial<Pick<CustomerInfo, "nickname" | "profileImage" | "phone" | "email">>) {
  return apiFetch<CustomerInfo>("/api/customer/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function withdrawCustomer() {
  return apiFetch<{ success: boolean }>("/api/customer/me", { method: "DELETE" });
}

export interface Keyword {
  id: number;
  name: string;
}

export function getKeywords() {
  return apiFetch<Keyword[]>("/api/keywords");
}