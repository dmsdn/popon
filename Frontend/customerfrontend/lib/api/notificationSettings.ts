// lib/api/notificationSettings.ts
//
// 사용자의 공지·예약/웨이팅·마케팅 알림 수신 설정을 계정에 저장
// 현재 설정을 조회 및 변경
import { apiFetch } from "./client";

export interface NotificationSettings {
  popupNewsAgreed: boolean;
  reservationWaitingAgreed: boolean;
  marketingAgreed: boolean;
}

export function getNotificationSettings() {
  return apiFetch<NotificationSettings>("/api/customer/notification-settings");
}

export function updateNotificationSettings(payload: Partial<NotificationSettings>) {
  return apiFetch<NotificationSettings>("/api/customer/notification-settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
