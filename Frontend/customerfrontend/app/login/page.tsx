// app/login/page.tsx
// 로그인 페이지 - 카카오/구글 소셜 로그인 버튼과 간편 가입 안내 말풍선, 화면설정/공지사항/Q&A 진입 링크
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { redirectToKakaoLogin, redirectToGoogleLogin } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { loginAsTestUser } = useAuth();

  const handleTestLogin = () => {
    loginAsTestUser();
    try {
      const raw = window.localStorage.getItem("mock_customer");
      const onboarded = raw ? JSON.parse(raw).onboarded : false;
      router.push(onboarded ? "/" : "/signup");
    } catch {
      router.push("/signup");
    }
  };

  return (

    <main className="min-h-dvh flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto">
      {/* 상단바 */}
      <header className="flex items-center h-14 px-4 border-b border-gray-100 dark:border-[#282B32]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
        </button>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        {/* 간편 가입 안내 말풍선 */}
        <div className="relative bg-gray-100 dark:bg-[#282B32] rounded-2xl px-5 py-3 animate-float">
          <p className="text-sm font-medium text-center">간편 가입으로 서비스를 편리하게 이용해보세요</p>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-gray-100 dark:bg-[#282B32] rotate-45" />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/ui/LOGO_Light.svg" alt="POP-ON" className="w-[220px] h-auto dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/ui/LOGO_Dark.svg" alt="POP-ON" className="w-[220px] h-auto hidden dark:block" />

        <div className="w-full flex flex-col items-center gap-3 mt-6">
          <button
            type="button"
            onClick={redirectToKakaoLogin}
            className="w-full max-w-sm flex items-center gap-3 rounded-full px-5 py-3.5 bg-[#FEE500]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ui/kakao.svg" alt="" width={20} height={20} />
            <span className="flex-1 text-center text-base font-medium text-gray-900">
              카카오로 시작하기
            </span>
          </button>

          <button
            type="button"
            onClick={redirectToGoogleLogin}
            className="w-full max-w-sm flex items-center gap-3 bg-gray-100 dark:bg-[#282B32] rounded-full px-5 py-3.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/ui/google.svg" alt="" width={20} height={20} />
            <span className="flex-1 text-center text-base font-medium text-gray-900 dark:text-white">
              구글로 시작하기
            </span>
          </button>

          {process.env.NODE_ENV === "development" && (
            <>
              <button
                type="button"
                onClick={handleTestLogin}
                className="w-full max-w-sm rounded-full py-3.5 text-base font-medium border border-dashed border-gray-300 dark:border-[#282B32] text-gray-500 mt-2"
              >
                [개발용] 테스트 계정으로 계속하기
              </button>
              <Link
                href="/login/dev"
                className="w-full max-w-sm text-center rounded-full py-3.5 text-sm font-medium border border-dashed border-gray-300 dark:border-[#282B32] text-gray-500"
              >
                [개발용] 테스트 ID로 로그인
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 pt-4 pb-[max(5rem,env(safe-area-inset-bottom))]">
        <Link href="/login/settings" className="text-sm text-gray-400">
          화면 설정
        </Link>
        <span className="text-gray-200 dark:text-[#282B32]" aria-hidden="true">|</span>
        <Link href="/notice" className="text-sm text-gray-400">
          공지사항
        </Link>
        <span className="text-gray-200 dark:text-[#282B32]" aria-hidden="true">|</span>
        <Link href="/login/qna" className="text-sm text-gray-400">
          Q&A
        </Link>
      </div>
    </main>
  );
}
