"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui/EmptyState";

/**
 * [신규] 백엔드가 신규 소셜 로그인 사용자를 여기(/signup/info?pendingToken=...)로
 * 리다이렉트하고 있었는데, 이 경로 자체가 프론트에 없어서 계속 404가 났어요.
 * 실제 "회원정보 입력" 화면(pendingToken 처리 로직 포함)은 /signup에 다 있어서,
 * 여긴 pendingToken을 그대로 들고 /signup으로 넘겨주는 얇은 통로예요.
 */
export default function SignupInfoRedirectPage() {
  return (
    <Suspense fallback={<LoadingState message="불러오는 중..." />}>
      <RedirectHandler />
    </Suspense>
  );
}

function RedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const pendingToken = searchParams.get("pendingToken");
    router.replace(pendingToken ? `/signup?pendingToken=${pendingToken}` : "/signup");
  }, [router, searchParams]);

  return <LoadingState message="불러오는 중..." />;
}
