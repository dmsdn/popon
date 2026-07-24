"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/lib/auth/AuthContext";

const CATEGORY_SHORTCUTS = ["뷰티", "패션", "애니", "푸드", "스포츠", "라이프", "굿즈", "문구"];

export default function MorePage() {
  const router = useRouter();
  const { isLoggedIn, customer } = useAuth();

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

      {/* 카테고리별 바로가기 */}
      <section className="px-4 mobile:px-8 py-6 border-b border-gray-100">
        <h2 className="text-sm font-semibold mb-3">카테고리별 바로가기</h2>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORY_SHORTCUTS.map((category) => (
            <Link
              key={category}
              href={`/search?q=${encodeURIComponent(category)}`}
              className="aspect-square rounded-[4px] border border-gray-200 text-xs font-medium flex items-center justify-center text-gray-600"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>

      {/* 이용 관련 */}
      <section className="px-4 mobile:px-8 py-2">
        <h2 className="text-sm font-semibold mb-1 mt-4">이용</h2>
        <nav className="flex flex-col">
          <Link href="/mypage?menu=예약 / 웨이팅" className="py-3.5 text-sm text-gray-700 border-b border-gray-50">
            예약 / 웨이팅 내역
          </Link>
          <Link href="/mypage?menu=찜 목록" className="py-3.5 text-sm text-gray-700 border-b border-gray-50">
            찜 목록
          </Link>
          <Link href="/mypage?menu=다녀간 팝업" className="py-3.5 text-sm text-gray-700 border-b border-gray-50">
            다녀간 팝업 (내 후기)
          </Link>
          <Link href="/notifications" className="py-3.5 text-sm text-gray-700 border-b border-gray-50">
            알림
          </Link>
          <Link href="/mypage?menu=공지사항" className="py-3.5 text-sm text-gray-700 border-b border-gray-50">
            공지사항
          </Link>
          <Link href="/mypage?menu=1:1 문의" className="py-3.5 text-sm text-gray-700 border-b border-gray-50">
            1:1 문의
          </Link>
          <Link href="/mypage?menu=Q&A" className="py-3.5 text-sm text-gray-700">
            Q&A
          </Link>
        </nav>
      </section>

      <Footer />
    </main>
  );
}
