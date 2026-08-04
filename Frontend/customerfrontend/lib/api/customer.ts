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
// email도 마찬가지예요 — CustomerUpdateRequest.java 확인 결과 nickname/profileImage/birthDate/gender
// 4개 필드만 있고 phone·email은 없어서, 지금 이 값들을 보내도 서버가 조용히 무시해요.
// (email은 최초 가입 때 submitSignupInfo로만 저장 가능하고, 가입 이후엔 수정할 방법이 없는
// 상태예요 — 백엔드에 CustomerUpdateRequest.email 필드 추가를 요청해야 해요.)
export function updateMyInfo(
  payload: Partial<Pick<CustomerInfo, "nickname" | "profileImage" | "phone" | "email" | "birthDate" | "gender">>
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
  // [신규] 관리자가 카테고리별로 업로드하는 아이콘 이미지 - 백엔드가 아직
  // 안 채워준 카테고리는 null/undefined로 와요(기존 8개 카테고리는 아이콘
  // 파일이 없어요). 그런 경우 프론트에서 lucide 아이콘으로 대체해요.
  iconUrl?: string | null;
}

export function getKeywords() {
  return apiFetch<Keyword[]>("/api/keywords");
}

// [신규] 마이페이지 수정 화면에서 기존 선택값을 미리 체크해줄 방법이 없어서 추가.
export function getMyInterests() {
  return apiFetch<{ keywordIds: number[] }>("/api/customer/interests");
}