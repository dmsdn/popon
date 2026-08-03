"use client";

// 소셜 로그인 성공 후 리다이렉트되는 콜백 페이지 - 토큰을 저장하고 원래 가려던 곳으로 보내요.

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
        // [수정] 예약하기/웨이팅하기/찜하기 중 로그인하러 온 거면, 로그인 끝나고
        // 원래 있던 페이지(예: 그 팝업 상세페이지)로 돌려보내요. 이전엔 무조건 홈으로 갔어요.
        const target = consumeRedirectTarget();
        router.replace(signupCompleted ? target ?? "/" : "/signup");
      })
      .catch((error) => {
        // 상태 조회 자체가 실패하면(백엔드 미배포 등) 일단 회원정보 입력 화면으로 보내요 —
        // 이미 가입 완료한 회원을 무한 루프에 빠뜨리는 것보다, 최악의 경우 이미 채워진 정보를
        // 다시 한번 보여주는 쪽이 안전해요.
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