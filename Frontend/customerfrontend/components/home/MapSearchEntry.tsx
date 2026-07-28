import Link from "next/link";

/**
 * [신규] 홈 화면에서 지도 검색(/map)으로 바로 갈 수 있는 진입 카드예요.
 */
export function MapSearchEntry() {
  return (
    <div className="px-4 mobile:px-8 mb-14 mobile:mb-16">
      <Link
        href="/map"
        className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-4"
      >
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/pin.svg" alt="" width={20} height={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">지도로 팝업 찾기</p>
          <p className="text-xs text-gray-400">내 주변 팝업스토어를 지도에서 한눈에 확인해보세요</p>
        </div>
        <span className="text-gray-300 text-lg flex-none">›</span>
      </Link>
    </div>
  );
}
