// app/login/success/page.tsx
// 소셜 로그인 성공 후 리다이렉트되는 콜백 페이지
"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/api/client";
import { getSignupStatus } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";
import { consumeRedirectTarget } from "@/lib/postLoginRedirect";

export default function LoginSuccessPage() {
  return (
    <Suspense>
      <LoginSuccessHandler />
    </Suspense>
  );
}

function LoginSuccessHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setToken(token);
    refresh()
      .then(() => getSignupStatus())
      .then(({ signupCompleted }) => {
        const target = consumeRedirectTarget();
        router.replace(signupCompleted ? target ?? "/" : "/signup");
      })
      .catch((error) => {
        console.warn("가입 완료 여부 확인 실패", error);
        router.replace("/signup");
      });
  }, [searchParams, router, refresh]);

  return (
    <main className="flex items-center justify-center min-h-screen">
      <p className="text-sm text-gray-400">로그인 처리 중이에요...</p>
    </main>
  );
}
