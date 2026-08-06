// app/signup/info/page.tsx
// 회원가입 완료 후 관심사 선택(preferences) 페이지로 보내는 리다이렉트 전용 페이지
"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui/EmptyState";

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
