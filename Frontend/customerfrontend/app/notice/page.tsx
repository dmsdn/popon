// app/notice/page.tsx
// 공지사항 목록 페이지
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAnnouncements, type Announcement } from "@/lib/api/announcements";
import { LoadingState, EmptyState } from "@/components/ui/EmptyState";

export default function NoticeListPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);

  useEffect(() => {
    getAnnouncements()
      .then(setAnnouncements)
      .catch((err) => {
        console.error("공지사항 조회 실패", err);
        setAnnouncements([]);
      });
  }, []);

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto">
      <div className="flex items-center gap-2 h-14 px-4 mobile:px-8 border-b border-gray-100 dark:border-[#282B32]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
        </button>
        <h1 className="text-lg font-bold">공지사항</h1>
      </div>

      <div className="px-4 mobile:px-8 py-2">
        {announcements === null ? (
          <LoadingState />
        ) : announcements.length === 0 ? (
          <EmptyState message="등록된 공지사항이 없어요." />
        ) : (
          <div className="flex flex-col">
            {announcements.map((notice) => (
              <Link
                key={notice.id}
                href={`/notice/${notice.id}`}
                className="block py-4 border-b border-gray-50 dark:border-[#282B32]"
              >
                <p className="text-sm text-gray-800 dark:text-white">{notice.title}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
