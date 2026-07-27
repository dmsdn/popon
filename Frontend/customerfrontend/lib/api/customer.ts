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
    birthDate: raw.birthDate ?? null,
    gender: raw.gender ?? null,
    onboarded: raw.onboarded ?? true,
  };
}

// ⚠️ phone은 백엔드 CustomerUpdateRequest에 아직 없을 수 있어요(요청은 넣어뒀지만 반영 여부 미확인).
// 반영 전이면 이 값을 보내도 서버가 조용히 무시해요.
export function updateMyInfo(
  payload: Partial<Pick<CustomerInfo, "nickname" | "profileImage" | "phone" | "birthDate" | "gender">>
) {
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