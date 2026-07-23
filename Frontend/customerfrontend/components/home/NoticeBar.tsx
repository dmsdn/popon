import Link from "next/link";
import { getLatestNotice } from "@/data/notices";

export function NoticeBar() {
  const notice = getLatestNotice();

  if (!notice) return null;

  return (
    <div className="mx-4 mobile:mx-8 my-6 flex items-center justify-between bg-gray-100 rounded-lg px-4 py-3 text-sm">
      {/* 공지 제목 클릭 → 이 공지 상세 페이지 */}
      <Link href={`/notice/${notice.id}`} className="truncate">
        <span className="font-medium">[공지]</span> {notice.title}
      </Link>
      {/* 더보기 클릭 → 공지사항 전체 목록 페이지 */}
      <Link href="/notice" className="text-gray-400 text-xs flex-none ml-3">
        더보기 ›
      </Link>
    </div>
  );
}