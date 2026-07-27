"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/lib/auth/AuthContext";
import { REGIONS, CATEGORIES, getPreferredRegions, getPreferredCategories } from "@/lib/preferences";

// 관심으로 설정해둔 것부터 위로 오게 정렬 (나머지는 원래 순서 유지)
function sortByPreferred(all: string[], preferred: string[]): string[] {
  return [...all].sort((a, b) => {
    const aPreferred = preferred.includes(a);
    const bPreferred = preferred.includes(b);
    if (aPreferred === bPreferred) return 0;
    return aPreferred ? -1 : 1;
  });
}

export default function MorePage() {
  const router = useRouter();
  const { isLoggedIn, customer } = useAuth();

  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);

  useEffect(() => {
    setPreferredRegions(getPreferredRegions());
    setPreferredCategories(getPreferredCategories());
  }, []);

  const sortedCategories = sortByPreferred(CATEGORIES, preferredCategories);
  const sortedRegions = sortByPreferred(REGIONS, preferredRegions);

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto pb-16 mobile:pb-0">
      <div className="flex items-center gap-2 px-4 mobile:px-8 py-4 border-b border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          ‹
        </button>
        <h1 className="text-lg font-bold">더보기</h1>
      </div>

      {/* 내 계정 정보 */}
      <section className="px-4 mobile:px-8 py-6 border-b border-gray-100">
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
              <p className="text-xs text-gray-400">내 계정 정보 보기 ›</p>
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
      <section className="px-4 mobile:px-8 py-2 border-b border-gray-100">
        <h2 className="text-sm font-semibold mb-1 mt-4">카테고리별 바로가기</h2>
        <nav className="flex flex-col">
          {sortedCategories.map((category, i) => (
            <Link
              key={category}
              href={`/search?q=${encodeURIComponent(category)}`}
              className={`flex items-center justify-between py-3.5 text-sm text-gray-700 ${
                i < sortedCategories.length - 1 ? "border-b border-gray-50" : ""
              }`}
            >
              <span className="flex items-center gap-1.5">
                {category}
                {preferredCategories.includes(category) && (
                  <span className="text-[10px] text-gray-400">관심</span>
                )}
              </span>
              <span className="text-gray-300">›</span>
            </Link>
          ))}
        </nav>
      </section>

      {/* 지역별 보기 - 관심 지역으로 설정해둔 게 있으면 맨 위로 */}
      <section className="px-4 mobile:px-8 py-2">
        <h2 className="text-sm font-semibold mb-1 mt-4">지역별 보기</h2>
        <nav className="flex flex-col">
          {sortedRegions.map((region, i) => (
            <Link
              key={region}
              href={`/search?q=${encodeURIComponent(region)}`}
              className={`flex items-center justify-between py-3.5 text-sm text-gray-700 ${
                i < sortedRegions.length - 1 ? "border-b border-gray-50" : ""
              }`}
            >
              <span className="flex items-center gap-1.5">
                {region}
                {preferredRegions.includes(region) && (
                  <span className="text-[10px] text-gray-400">관심</span>
                )}
              </span>
              <span className="text-gray-300">›</span>
            </Link>
          ))}
        </nav>
      </section>

      <Footer />
    </main>
  );
}
