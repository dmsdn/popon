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
    <main>
      {/* 상단바 */}
      <header className="flex items-center px-4 py-3 border-b border-gray-100">
        <Link href="/" className="font-bold text-lg">팝업</Link>
      </header>

      {/* 로그인 버튼 영역 */}
      <div className="flex flex-col items-center justify-center px-6 pt-40 gap-3">
        <div className="relative mb-3">
          <span className="whitespace-nowrap bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs text-gray-600 shadow-sm">
            웨이팅은 카카오로만 가능해요
          </span>
        </div>

        <button
          type="button"
          onClick={redirectToKakaoLogin}
          className="w-full max-w-sm rounded-full py-3.5 text-sm font-medium bg-[#FEE500]"
        >
          카카오로 시작하기
        </button>

        <button
          type="button"
          onClick={redirectToGoogleLogin}
          className="w-full max-w-sm flex items-center gap-3 bg-gray-100 rounded-full px-5 py-3.5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-gray-900">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"/>
            <path d="M5.84 14.09A6.6 6.6 0 015.5 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 002.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="flex-1 text-center text-sm font-medium text-gray-900">
            구글로 시작하기
          </span>
        </button>

        {process.env.NODE_ENV === "development" && (
          <>
            <button
              type="button"
              onClick={handleTestLogin}
              className="w-full max-w-sm rounded-full py-3.5 text-sm font-medium border border-dashed border-gray-300 text-gray-500 mt-2"
            >
              [개발용] 테스트 계정으로 계속하기
            </button>
            <Link
              href="/login/dev"
              className="w-full max-w-sm text-center rounded-full py-3.5 text-sm font-medium border border-dashed border-gray-300 text-gray-500"
            >
              [개발용] 테스트 ID로 로그인
            </Link>
          </>
        )}
      </div>
    </main>
  );
}