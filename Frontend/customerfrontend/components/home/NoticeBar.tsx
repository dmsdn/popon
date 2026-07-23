import Link from "next/link";
import { getLatestNotice } from "@/data/notices";

export function NoticeBar() {
  const notice = getLatestNotice();

  if (!notice) return null;

  return (
    <div className="mx-4 mobile:mx-8 my-6 flex items-center justify-between bg-gray-100 rounded-lg px-4 py-3 text-sm">
      {/* 공지 제목 클릭 → 이 공지의 상세 페이지로 이동 */}
      <Link href={`/notice/${notice.id}`} className="truncate flex-1">
        <span className="font-medium">[공지]</span> {notice.title}
      </Link>

      {/* 더보기 클릭 → 마이페이지의 공지사항 목록으로 이동 */}
      <Link
        href="/mypage?menu=공지사항"
        className="text-gray-400 text-xs flex-none ml-3"
      >
        더보기 ›
      </Link>
    </div>
  );
}
