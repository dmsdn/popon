import Link from "next/link";
import { getLatestNotice } from "@/data/notices";

export function NoticeBar() {
  const notice = getLatestNotice();

  if (!notice) return null;

  return (
    <Link
      href="/mypage?menu=공지사항"
      className="mx-4 mobile:mx-8 my-6 flex items-center justify-between bg-gray-100 rounded-lg px-4 py-3 text-sm"
    >
      <span className="truncate">
        <span className="font-medium">[공지]</span> {notice.title}
      </span>
      <span className="text-gray-400 text-xs flex-none ml-3">더보기 ›</span>
    </Link>
  );
}