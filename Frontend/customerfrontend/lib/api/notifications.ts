// lib/api/notifications.ts
import { apiFetch } from "./client";

export type NotificationType = "공지" | "찜" | "예약/웨이팅";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO datetime
  read: boolean;
}

// [수정] 백엔드에 실제 알림 API가 생겨서 mock 대신 연결해요. (팀원분이 주신 코드 그대로)
export async function getNotifications(customerId: number): Promise<AppNotification[]> {
  const raw = await apiFetch<
    {
      noticeId: number;
      recipientId: number;
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
    RESERVATION: "예약/웨이팅",
    WAITING: "예약/웨이팅",
  };
  return raw.map((n) => ({
    id: String(n.recipientId), // 읽음처리 API가 recipientId 기준이라 이걸 id로 써야 함
    type: typeMap[n.category] ?? "공지",
    title: n.title,
    message: n.content,
    createdAt: n.sentAt,
    read: n.read,
  }));
}

// [신규] 예전에 정리해뒀던 알림 API 목록에 읽음 처리(PATCH /api/notices/my/{recipientId}/read)도
// 있었어요 - getNotifications가 돌려주는 id가 정확히 이 recipientId예요.
export function markNotificationRead(recipientId: string | number) {
  return apiFetch<void>(`/api/notices/my/${recipientId}/read`, {
    method: "PATCH",
  });
}
