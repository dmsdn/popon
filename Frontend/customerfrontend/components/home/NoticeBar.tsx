"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAnnouncements, type Announcement } from "@/lib/api/announcements";

// [수정] 목업(data/notices.ts) 대신 실제 공지사항 API로 최신 공지 하나를 가져와요.
export function NoticeBar() {
  const [notice, setNotice] = useState<Announcement | null>(null);

  useEffect(() => {
    getAnnouncements()
      .then((list) => setNotice(list[0] ?? null))
      .catch((err) => console.error("공지사항 조회 실패", err));
  }, []);

  if (!notice) return null;

  return (
    <div className="mx-4 mobile:mx-8 mb-14 mobile:mb-16 flex items-center justify-between bg-gray-100 rounded-lg px-4 py-3 text-sm">
      {/* 공지 제목 클릭 → 이 공지의 상세 페이지로 이동 */}
      <Link href={`/notice/${notice.id}`} className="truncate flex-1">
        <span className="font-medium">[공지]</span> {notice.title}
      </Link>

      {/* 더보기 클릭 → 마이페이지의 공지사항 목록으로 이동 */}
      <Link
        href="/mypage?menu=공지사항"
        className="text-gray-400 text-sm flex-none ml-3"
      >
        더보기 ›
      </Link>
    </div>
  );
}
