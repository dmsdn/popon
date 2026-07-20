// components/layout/MobileHeader.tsx
import Image from "next/image";

export function MobileHeader() {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b">
      <span className="text-lg font-semibold tracking-tight">POPUP</span>
      <div className="flex items-center gap-4">
        <button aria-label="검색">
          <Image src="/icon/Bar_Search.svg" alt="검색" width={24} height={24} />
        </button>
        <button aria-label="메뉴">
          <Image src="/icon/Bar_Other.svg" alt="메뉴" width={24} height={24} />
        </button>
      </div>
    </header>
  );
}