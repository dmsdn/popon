// lib/api/notifications.ts
//import { apiFetch, API_BASE } from "./client";

export async function getNotifications() {
  return [
    { id: "1", title: "테스트", message: "테스트입니다." },
  ];
}