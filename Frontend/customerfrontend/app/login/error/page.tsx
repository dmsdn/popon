"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui/EmptyState";

/**
 * [신규] 백엔드가 정지된 계정으로 로그인 시도하면 여기(/login/error?message=...)로
 * 리다이렉트하는데, 이 경로 자체가 프론트에 없어서 404가 났어요.
 * (/signup/info와 같은 종류의 문제 - 백엔드 리다이렉트 대상 3곳 중 이것만 빠져있었어요)
 */
export default function LoginErrorPage() {
  return (
    <Suspense fallback={<LoadingState message="불러오는 중..." />}>
      <LoginErrorContent />
    </Suspense>
  );
}

function LoginErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") ?? "로그인에 실패했어요.";

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4">
      <p className="text-sm font-medium text-gray-800">{message}</p>
      <Link
        href="/login"
        className="text-sm font-medium border border-gray-300 dark:border-[#282B32] text-gray-700 dark:text-gray-300 rounded-full px-5 py-2.5"
      >
        로그인 화면으로 돌아가기
      </Link>
    </main>
  );
}
