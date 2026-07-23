import { apiFetch } from "./client";

export interface CustomerInfo {
  id: number;
  provider: "KAKAO" | "GOOGLE" | "EMAIL";
  nickname: string;
  profileImage: string | null;
  phone: string | null;
  email: string | null;
  onboarded: boolean;
}

export function getMyInfo() {
  return apiFetch<CustomerInfo>("/api/customer/me");
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