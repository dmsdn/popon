// components/layout/MobileHeader.tsx
import Image from "next/image";
import Link from "next/link";

export function MobileHeader() {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b">
      <span className="text-lg font-semibold tracking-tight">POPUP</span>
      <div className="flex items-center gap-4">
        <Link href="/search" aria-label="검색">
          <Image src="/icon/Bar_Search.svg" alt="검색" width={20} height={20} />
        </Link>
        <Link href="/notifications" aria-label="알림">
          <Image src="/icon/notification_on.svg" alt="알림" width={20} height={20} />
        </Link>
      </div>
    </header>
  );
}