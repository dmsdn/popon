"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getAnnouncements, type Announcement } from "@/lib/api/announcements";
import { LoadingState, EmptyState } from "@/components/ui/EmptyState";

// [수정] 목업(data/notices.ts) 대신 실제 API에서 목록을 받아 id로 찾아요.
// 단건 조회 API는 없고 목록 API만 있어서, 목록을 받아 그 안에서 찾는 방식이에요.
export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [notice, setNotice] = useState<Announcement | null | undefined>(undefined);

  useEffect(() => {
    getAnnouncements()
      .then((list) => setNotice(list.find((n) => String(n.id) === id) ?? null))
      .catch((err) => {
        console.error("공지사항 조회 실패", err);
        setNotice(null);
      });
  }, [id]);

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto px-4 mobile:px-8 py-6">
      <Link href="/" className="inline-block text-sm text-gray-500 mb-6">
        <img src="/Icon/back_arrow.svg" alt="" width={48} height={48} />
          <span>뒤로</span>
      </Link>

      {notice === undefined ? (
        <LoadingState />
      ) : notice === null ? (
        <EmptyState message="공지사항을 찾을 수 없어요." />
      ) : (
        <>
          <h1 className="text-lg font-bold mb-2">{notice.title}</h1>
          <p className="text-sm text-gray-400 mb-6">
            {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {notice.content}
          </p>
        </>
      )}
    </main>
  );
}
