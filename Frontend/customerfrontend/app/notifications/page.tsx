// app/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { getNotifications, markNotificationRead, type AppNotification, type NotificationType } from "@/lib/api/notifications";
import { LoadingState, EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMyReservations } from "@/lib/api/reservations";
import { getMyWaitingIds, getMyWaitingStatus } from "@/lib/api/waiting";

const TABS: ("전체" | NotificationType)[] = ["전체", "공지", "웨이팅/예약", "찜"];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

const TYPE_ICON: Record<NotificationType, string> = {
  공지: "/icons/ui/notice.svg",
  찜: "/icons/ui/heart_alarm.svg",
  "웨이팅/예약": "/icons/ui/alarm.svg",
};

// [신규] 알림 목록 → 알림 설정 화면으로 이동하는 톱니바퀴 아이콘. 별도 svg
// 파일 없이 인라인으로 그려서 새 아이콘 파일 추가 없이 바로 쓸 수 있게 했어요.
function SettingsGearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { customer } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("전체");
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    if (!customer) {
      setNotifications([]);
      return;
    }
    getNotifications(customer.id)
      .then(setNotifications)
      .catch((err) => {
        console.error("알림 조회 실패", err);
        setNotifications([]);
      });
  }, [customer]);

  // [신규] 알림을 누르면 읽음 처리 - 화면은 먼저 바꾸고(낙관적 업데이트), 실패해도
  // 사용자 경험엔 큰 영향 없어서 조용히 무시해요.
  const handleReadNotification = (id: string) => {
    if (!customer) return;
    setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? prev);
    markNotificationRead(id, customer.id).catch((err) => console.error("알림 읽음 처리 실패", err));
  };

  // [신규] 알림 내용을 누르면 관련 화면으로 이동해요.
  // - 공지: 해당 공지 상세페이지로
  // - 찜: 해당 팝업 상세페이지로
  // - 웨이팅/예약: 같은 팝업의 내 예약/웨이팅 중 하나를 찾아서 그 상세페이지로
  //   (여러 개면 가장 최근 걸로 이동, 못 찾으면 팝업 상세로 대체)
  // router.push로 이동하니 뒤로가기를 누르면 자연스럽게 다시 이 알림 목록으로 돌아와요.
  const handleNotificationClick = async (item: AppNotification) => {
    if (!item.read) handleReadNotification(item.id);

    if (item.type === "공지") {
      router.push(`/notice/${item.noticeId}`);
      return;
    }

    if (item.type === "찜") {
      if (item.popupId) router.push(`/popup/${item.popupId}`);
      return;
    }

    // [신규] "찜한/예약한/웨이팅 중인 팝업 정보 변경" 알림(NoticeService.notifyPopupUpdated)은
    // 카테고리가 웨이팅/예약이어도, 예약·웨이팅 상태 자체가 아니라 "팝업 내용이
    // 바뀌었다"는 안내라서 예약/웨이팅 상세 대신 팝업 상세페이지로 바로 보내는 게
    // 맞아요. 반면 순번 알림("5번째가 됐어요" 등)처럼 진짜 웨이팅/예약 상태에 대한
    // 알림은 계속 그 예약/웨이팅 상세로 보내야 해서, 제목으로 구분해요.
    if (item.type === "웨이팅/예약" && item.title.includes("정보 변경")) {
      if (item.popupId) router.push(`/popup/${item.popupId}`);
      return;
    }

    // 웨이팅/예약
    if (!item.popupId || !customer) return;
    try {
      const [reservations, waitingIds] = await Promise.all([
        getMyReservations(customer.id).catch(() => []),
        Promise.resolve(getMyWaitingIds()),
      ]);
      const matchedReservation = reservations
        .filter((r) => r.popupId === item.popupId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (matchedReservation) {
        router.push(`/reservations/${matchedReservation.id}`);
        return;
      }
      const waitings = await Promise.all(waitingIds.map((id) => getMyWaitingStatus(id).catch(() => null)));
      const matchedWaiting = waitings
        .filter((w): w is NonNullable<typeof w> => w !== null && w.popupId === item.popupId)
        .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())[0];
      if (matchedWaiting) {
        router.push(`/waiting/${matchedWaiting.id}`);
        return;
      }
      // 매칭되는 웨이팅/예약을 못 찾으면 팝업 상세로 대체
      router.push(`/popup/${item.popupId}`);
    } catch (err) {
      console.error("알림 관련 웨이팅/예약 조회 실패", err);
      router.push(`/popup/${item.popupId}`);
    }
  };

  const filtered = (notifications ?? []).filter((n) => tab === "전체" || n.type === tab);

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="flex-1">
      <div className="hidden mobile:block">
        <Header />
      </div>
      <div className="block mobile:hidden">
        <div className="flex items-center gap-2 h-14 px-4 border-b border-gray-100 dark:border-[#282B32]">
          <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="text-lg text-gray-500">
            <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
          </button>
          <h1 className="text-lg font-bold flex-1">알림</h1>
          {/* [신규] 알림 목록에서 바로 알림 설정 화면으로 갈 수 있도록 톱니바퀴
              아이콘을 넣었어요. */}
          <Link href="/mypage?menu=알림 설정" aria-label="알림 설정" className="text-gray-500 dark:text-gray-400">
            <SettingsGearIcon />
          </Link>
        </div>
      </div>

      <div className="hidden mobile:flex items-center justify-between px-8 pt-4">
        <h1 className="text-lg font-bold">알림</h1>
        <Link href="/mypage?menu=알림 설정" aria-label="알림 설정" className="text-gray-500 dark:text-gray-400">
          <SettingsGearIcon />
        </Link>
      </div>

      {/* 탭 - 실제로 눌러서 필터링됩니다 */}
      <div className="flex gap-1 px-4 mobile:px-8 py-3 border-b border-gray-100 dark:border-[#282B32] overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-none px-3 py-1.5 rounded-full text-sm border ${
              tab === t
                ? "border-point text-[#218B09] font-medium"
                : "border-gray-200 dark:border-[#282B32] text-gray-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {notifications === null ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState message="알림이 없어요." icon={null} />
      ) : (
        <div className="flex flex-col px-4 mobile:px-8">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNotificationClick(item)}
              className="flex items-start gap-3 py-4 border-b border-gray-50 dark:border-[#282B32] text-left w-full"
            >
              <span className="text-lg flex-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TYPE_ICON[item.type]} alt="" width={24} height={24} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-point flex-none" />}
                  {/* [수정] 읽은 알림은 안 읽은 알림과 구분되게 글자색을 옅게
                      죽였어요. 안 읽은 알림의 회색 배경은 뺐어요 - 점 표시만으로도
                      구분이 충분했고, 다크모드에서 특히 배경이 지저분해 보였어요. */}
                  <p className={`text-sm font-semibold truncate ${item.read ? "text-gray-300 dark:text-gray-600" : ""}`}>
                    {item.title}
                  </p>
                </div>
                <p className={`text-sm leading-relaxed ${item.read ? "text-gray-300 dark:text-gray-600" : "text-gray-500"}`}>
                  {item.message}
                </p>
              </div>
              <span className="text-sm text-gray-400 flex-none">{timeAgo(item.createdAt)}</span>
            </button>
          ))}
        </div>
      )}

      </div>

      <Footer />
      <div className="block mobile:hidden">
        <BottomTabBar />
      </div>
    </main>
  );
}
