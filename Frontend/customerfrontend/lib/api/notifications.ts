// lib/api/notifications.ts
import { apiFetch } from "./client";

export type NotificationType = "공지" | "찜" | "예약/웨이팅" | "기타";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO datetime
  read: boolean;
}

// ⚠️ 백엔드에 "알림 목록"을 내려주는 API가 아직 없어요 (SmsNotificationService/EmailNotificationService는
// 발송만 하지, 발송 이력을 고객이 조회할 수 있게 저장/노출하는 기능이 없어요).
// 그래서 지금은 항상 이 mock 목록을 보여줘요 - 실제로 내 계정에 온 알림이 아니에요.
// 백엔드에 알림 조회 API(예: GET /api/customer/notifications)가 생기면 이 함수 안쪽만
// apiFetch 호출로 바꾸면 나머지 화면은 그대로 동작해요.
const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "1",
    type: "예약/웨이팅",
    title: "웨이팅 순서가 다가오고 있어요",
    message: "곧 입장 순서예요. 5분 내로 도착해주세요.",
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    read: false,
  },
  {
    id: "2",
    type: "찜",
    title: "찜한 팝업이 곧 종료돼요",
    message: "찜해두신 팝업의 운영이 이번 주에 종료될 예정이에요.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    read: false,
  },
  {
    id: "3",
    type: "공지",
    title: "서비스 점검 안내",
    message: "더 나은 서비스를 위해 점검을 진행했어요.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
  },
];

export async function getNotifications(): Promise<AppNotification[]> {
  try {
    return await apiFetch<AppNotification[]>("/api/customer/notifications");
  } catch (error) {
    console.warn("[notifications] 실 API 없음 → mock 데이터로 대체합니다.", error);
    return MOCK_NOTIFICATIONS;
  }
}
