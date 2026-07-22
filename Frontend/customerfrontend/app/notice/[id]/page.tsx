import Link from "next/link";
import { notFound } from "next/navigation";
import { notices } from "@/data/notices";

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notice = notices.find((n) => n.id === id);

  if (!notice) {
    notFound();
  }

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto px-4 mobile:px-8 py-6">
      <Link href="/" className="inline-block text-sm text-gray-500 mb-6">
        ‹ 뒤로
      </Link>

      <h1 className="text-lg font-bold mb-2">{notice.title}</h1>
      <p className="text-xs text-gray-400 mb-6">{notice.date}</p>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
        {notice.content}
      </p>
    </main>
  );
}
