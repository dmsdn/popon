// app/notifications/page.tsx
import { getNotifications } from "@/lib/api/notifications";

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <main className="mobile:max-w-[1000px] mobile:mx-auto">
      <header className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-lg font-bold">알림 목록</h1>
      </header>

      <div className="flex gap-4 px-4 py-3 text-sm text-gray-500 border-b border-gray-100">
        <span className="text-black font-medium border-b-2 border-black pb-2">전체</span>
        <span>공지</span>
        <span>찜</span>
        <span>예약/웨이팅</span>
        <span>기타</span>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {notifications.map((item: { id: string; title: string; message: string }) => (
          <div key={item.id} className="border border-gray-200 rounded-xl px-4 py-3">
            <p className="font-medium text-sm mb-1">{item.title}</p>
            <p className="text-xs text-gray-500">{item.message}</p>
          </div>
        ))}
      </div>
    </main>
  );
}