// lib/api/notifications.ts
import { apiFetch } from "./client";

export type NotificationType = "공지" | "찜" | "웨이팅/예약";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO datetime
  read: boolean;
  // [신규] 알림을 눌렀을 때 관련 화면으로 이동하기 위한 참조 정보 -
  // 백엔드가 이미 내려주고 있었는데 여기서 놓치고 있었어요.
  noticeId: number;
  popupId: number | null;
}

// [수정] 백엔드에 실제 알림 API가 생겨서 mock 대신 연결해요. (팀원분이 주신 코드 그대로)
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
    id: String(n.recipientId), // 읽음처리 API가 recipientId 기준이라 이걸 id로 써야 함
    type: typeMap[n.category] ?? "공지",
    title: n.title,
    message: n.content,
    createdAt: n.sentAt,
    read: n.read,
    noticeId: n.noticeId,
    popupId: n.popupId,
  }));
}

// [수정] 백엔드가 markAsRead(@PathVariable recipientId, @RequestParam customerId)로
// customerId를 필수 쿼리파라미터로 요구하는데, 여기서 안 보내고 있었어요. 그래서
// 매번 실패하고 있었는데 화면은 낙관적 업데이트로 읽음처리된 것처럼 보여서
// (실제로는 반영이 안 되니 새로고침하면 다시 안읽음으로 돌아갔을 거예요)
// "읽음처리가 안 된다"는 문제로 나타났던 거예요.
export function markNotificationRead(recipientId: string | number, customerId: number) {
  return apiFetch<void>(`/api/notices/my/${recipientId}/read?customerId=${customerId}`, {
    method: "PATCH",
  });
}
