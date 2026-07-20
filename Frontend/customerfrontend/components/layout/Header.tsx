import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
      <span className="font-bold text-lg">팝업</span>
      <input
        placeholder="검색창"
        className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm"
      />
      <button aria-label="알림">
        <Image src="/icon/notification_on.svg" alt="알림" width={24} height={24} />
      </button>
      <Link href="/login" aria-label="마이페이지">
        <Image src="/icon/Bar_User.svg" alt="마이페이지" width={20} height={20} />
      </Link>
    </header>
  );
}