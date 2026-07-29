// lib/api/notificationSettings.ts
//
// [신규 연결] 마이페이지 "알림 설정"이 이제까지 로그인 계정이랑 무관하게 브라우저
// localStorage에만 저장되고 있었어요(다른 기기/브라우저에서 안 보이고, 서버가
// 실제 발송 여부를 판단할 근거도 없었음). 백엔드에 GET/PATCH
// /api/customer/notification-settings가 생겨서 실제 계정에 저장하도록 교체합니다.

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
