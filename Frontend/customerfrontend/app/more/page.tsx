"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/lib/auth/AuthContext";
import { getKeywords, getMyInterests, type Keyword } from "@/lib/api/customer";
import { getRegions, getMyRegions, type Region } from "@/lib/api/regions";

// 관심으로 설정해둔 것부터 위로 오게 정렬 (나머지는 원래 순서 유지)
function sortByPreferred<T>(all: T[], isPreferred: (item: T) => boolean): T[] {
  return [...all].sort((a, b) => {
    const aPreferred = isPreferred(a);
    const bPreferred = isPreferred(b);
    if (aPreferred === bPreferred) return 0;
    return aPreferred ? -1 : 1;
  });
}

export default function MorePage() {
  const router = useRouter();
  const { isLoggedIn, customer } = useAuth();

  // [수정] 하드코딩된 REGIONS 목록과 getPreferredRegions(죽은 로컬 저장소)를 쓰고
  // 있었어요. 마이페이지 수정 화면에서 저장한 진짜 관심 지역(백엔드)이 여기엔
  // 전혀 반영이 안 됐던 버그라, 카테고리와 동일하게 실제 지역 API로 교체했어요.
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [myRegionIds, setMyRegionIds] = useState<number[]>([]);
  // [수정] CATEGORIES(하드코딩 목록)와 getPreferredCategories(죽은 로컬 저장소)를
  // 쓰고 있었어요 - 실제 키워드는 이제 관리자가 추가/삭제하는 백엔드 목록이라
  // 하드코딩된 목록은 실제 값과 어긋날 수 있고, 관심 표시도 항상 비어 보였어요.
  const [allKeywords, setAllKeywords] = useState<Keyword[]>([]);
  const [myKeywordIds, setMyKeywordIds] = useState<number[]>([]);

  useEffect(() => {
    getRegions()
      .then(setAllRegions)
      .catch((err) => console.error("지역 목록 조회 실패", err));
  }, []);

  useEffect(() => {
    getKeywords()
      .then(setAllKeywords)
      .catch((err) => console.error("키워드 목록 조회 실패", err));
  }, []);

  useEffect(() => {
    if (!customer) return;
    getMyInterests()
      .then((res) => setMyKeywordIds(res?.keywordIds ?? []))
      .catch((err) => console.error("내 관심 키워드 조회 실패", err));
    getMyRegions()
      .then((res) => setMyRegionIds(res?.regionIds ?? []))
      .catch((err) => console.error("내 관심 지역 조회 실패", err));
  }, [customer]);

  const sortedKeywords = sortByPreferred(allKeywords, (k) => myKeywordIds.includes(k.id));
  const sortedRegions = sortByPreferred(allRegions, (r) => myRegionIds.includes(r.id));

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="flex-1">
      <div className="flex items-center gap-2 h-14 px-4 mobile:px-8 border-b border-gray-100 dark:border-[#282B32]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          <img src="/Icon/back_arrow.svg" alt="" width={48} height={48} />
        </button>
        <h1 className="text-lg font-bold">더보기</h1>
      </div>

      {/* 내 계정 정보 */}
      <section className="px-4 mobile:px-8 py-6 border-b border-gray-100 dark:border-[#282B32]">
        {isLoggedIn && customer ? (
          <Link href="/mypage" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-none">
              {customer.profileImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={customer.profileImage} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">{customer.nickname} 님</p>
              <p className="text-sm text-gray-400">내 계정 정보 보기 ›</p>
            </div>
          </Link>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center rounded-full py-3 text-sm font-medium bg-gray-900 text-white"
          >
            로그인 / 회원가입
          </Link>
        )}
      </section>

      {/* 카테고리별 바로가기 - 관심 카테고리로 설정해둔 게 있으면 맨 위로 */}
      {sortedKeywords.length > 0 && (
        <section className="px-4 mobile:px-8 py-2 border-b border-gray-100 dark:border-[#282B32]">
          <h2 className="text-sm font-semibold mb-1 mt-4 text-gray-400">카테고리별 바로가기</h2>
          <nav className="flex flex-col">
            {sortedKeywords.map((kw, i) => (
              <Link
                key={kw.id}
                href={`/search?q=${encodeURIComponent(kw.name)}`}
                className={`flex items-center py-3.5 text-base text-gray-700 dark:text-gray-300 ${
                  i < sortedKeywords.length - 1 ? "border-b border-gray-50 dark:border-[#282B32]" : ""
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {kw.name}
                  {myKeywordIds.includes(kw.id) && (
                    <span className="text-sm text-gray-400">관심</span>
                  )}
                </span>
              </Link>
            ))}
          </nav>
        </section>
      )}

      {/* 지역별 보기 - 관심 지역으로 설정해둔 게 있으면 맨 위로 */}
      <section className="px-4 mobile:px-8 py-2">
        <h2 className="text-sm font-semibold mb-1 mt-4 text-gray-400">지역별 보기</h2>
        <nav className="flex flex-col">
          {sortedRegions.map((region, i) => (
            <Link
              key={region.id}
              href={`/search?q=${encodeURIComponent(region.name)}`}
              className={`flex items-center py-3.5 text-base text-gray-700 dark:text-gray-300 ${
                i < sortedRegions.length - 1 ? "border-b border-gray-50 dark:border-[#282B32]" : ""
              }`}
            >
              <span className="flex items-center gap-1.5">
                {region.name}
                {myRegionIds.includes(region.id) && (
                  <span className="text-sm text-gray-400">관심</span>
                )}
              </span>
            </Link>
          ))}
        </nav>
      </section>

      </div>

      <Footer />
    </main>
  );
}
