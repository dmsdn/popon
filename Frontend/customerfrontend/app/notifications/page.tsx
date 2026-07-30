// app/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Footer } from "@/components/layout/Footer";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { getNotifications, markNotificationRead, type AppNotification, type NotificationType } from "@/lib/api/notifications";
import { LoadingState, EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth/AuthContext";

const TABS: ("전체" | NotificationType)[] = ["전체", "공지", "예약/웨이팅", "찜"];

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
  공지: "/Icon/notice.svg",
  찜: "/Icon/heart.svg",
  "예약/웨이팅": "/Icon/alarm.svg",
};

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
    setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? prev);
    markNotificationRead(id).catch((err) => console.error("알림 읽음 처리 실패", err));
  };

  const filtered = (notifications ?? []).filter((n) => tab === "전체" || n.type === tab);

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="flex-1">
      <div className="hidden mobile:block">
        <Header />
      </div>
      <div className="block mobile:hidden">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
          <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="text-lg text-gray-500">
            ‹
          </button>
          <h1 className="text-lg font-bold">알림</h1>
        </div>
      </div>

      <div className="hidden mobile:block px-8 pt-4">
        <h1 className="text-lg font-bold">알림</h1>
      </div>

      {/* 탭 - 실제로 눌러서 필터링됩니다 */}
      <div className="flex gap-1 px-4 mobile:px-8 py-3 border-b border-gray-100 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-none px-3 py-1.5 rounded-full text-sm ${
              tab === t ? "bg-gray-900 text-white font-medium" : "text-gray-500"
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
              onClick={() => !item.read && handleReadNotification(item.id)}
              className={`flex items-start gap-3 py-4 border-b border-gray-50 text-left w-full ${
                item.read ? "" : "bg-gray-50/60"
              }`}
            >
              <span className="text-lg flex-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TYPE_ICON[item.type]} alt="" width={16} height={16} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-gray-900 flex-none" />}
                  <p className="text-sm font-semibold truncate">{item.title}</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.message}</p>
              </div>
              <span className="text-xs text-gray-400 flex-none">{timeAgo(item.createdAt)}</span>
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
