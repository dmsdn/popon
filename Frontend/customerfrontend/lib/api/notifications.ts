// lib/api/notifications.ts
// 알림 목록을 관리하는 API
import { apiFetch } from "./client";

export type NotificationType = "공지" | "찜" | "웨이팅/예약";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO datetime
  read: boolean;
  // 알림 클릭 시 관련 화면으로 이동하기 위한 참조 정보
  noticeId: number;
  popupId: number | null;
}

// 내 알림 목록 조회 및 알림 데이터를 앱 형식으로 변환
export async function getNotifications(customerId: number): Promise<AppNotification[]> {
  const raw = await apiFetch<
    {
      noticeId: number;
      recipientId: number;
      popupId: number | null;
      popupTitle: string | null;
      category: string;
      title: string;
      content: string;
      sentAt: string;
      read: boolean;
    }[]
  >(`/api/notices/my?customerId=${customerId}`);
  const typeMap: Record<string, NotificationType> = {
    NOTICE: "공지",
    WISHLIST: "찜",
    RESERVATION: "웨이팅/예약",
    WAITING: "웨이팅/예약",
  };
  return raw.map((n) => ({
    id: String(n.recipientId), // 읽음처리 API가 recipientId 기준이라 이걸 id로
    type: typeMap[n.category] ?? "공지",
    title: n.title,
    message: n.content,
    createdAt: n.sentAt,
    read: n.read,
    noticeId: n.noticeId,
    popupId: n.popupId,
  }));
}

// 알림을 읽음 상태로 변경
export function markNotificationRead(recipientId: string | number, customerId: number) {
  return apiFetch<void>(`/api/notices/my/${recipientId}/read?customerId=${customerId}`, {
    method: "PATCH",
  });
}
