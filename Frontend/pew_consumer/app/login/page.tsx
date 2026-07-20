"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginWithKakao, loginWithGoogle, type Provider } from "@/lib/api/auth";

export default function LoginPage() {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);

  const handleSocialLogin = async (provider: Provider) => {
    setLoadingProvider(provider);
    try {
      const loginFn = provider === "kakao" ? loginWithKakao : loginWithGoogle;
      const { isNewUser } = await loginFn();

      if (isNewUser) {
        router.push(`/signup?provider=${provider}`);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error(`${provider} 로그인 실패`, error);
      alert("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <main>
      {/* 상단바 */}
      <header className="flex items-center px-4 py-3 border-b border-gray-100">
        <Link href="/" className="font-bold text-lg">팝업</Link>
      </header>

      {/* 로그인 버튼 영역 */}
      <div className="flex flex-col items-center justify-center px-6 pt-40">
        <div className="relative mb-3">
          <span className="whitespace-nowrap bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs text-gray-600 shadow-sm">
            웨이팅은 카카오로만 가능해요
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleSocialLogin("kakao")}
          disabled={loadingProvider !== null}
          className="w-full max-w-sm flex items-center gap-3 bg-[#FEE500] rounded-full px-5 py-3.5 mb-3 disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#391B1B">
            <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.83 5.18 4.58 6.58-.2.75-.73 2.72-.84 3.14-.13.51.19.5.4.36.16-.1 2.6-1.77 3.66-2.49.71.1 1.44.16 2.2.16 5.52 0 10-3.48 10-7.75S17.52 3 12 3z"/>
          </svg>
          <span className="flex-1 text-center text-sm font-medium text-gray-900">
            {loadingProvider === "kakao" ? "연결하는 중..." : "카카오로 시작하기"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          disabled={loadingProvider !== null}
          className="w-full max-w-sm flex items-center gap-3 bg-gray-100 rounded-full px-5 py-3.5 disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 015.5 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 002.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="flex-1 text-center text-sm font-medium text-gray-900">
            {loadingProvider === "google" ? "연결하는 중..." : "구글로 시작하기"}
          </span>
        </button>
      </div>
    </main>
  );
}
