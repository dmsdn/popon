import Link from "next/link";
import { notices } from "@/data/notices";

export default function NoticeListPage() {
  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto px-4 mobile:px-8 py-6">
      <Link href="/" className="inline-block text-sm text-gray-500 mb-6">
        ‹ 뒤로
      </Link>

      <h1 className="text-lg font-bold mb-6">공지사항</h1>

      <div className="flex flex-col">
        {notices.map((notice) => (
          <Link
            key={notice.id}
            href={`/notice/${notice.id}`}
            className="block py-4 border-b border-gray-100"
          >
            <p className="text-sm text-gray-800">{notice.title}</p>
            <p className="text-xs text-gray-400 mt-1">{notice.date}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}