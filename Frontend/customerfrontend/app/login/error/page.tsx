// app/login/error/page.tsx
// 소셜 로그인 실패 시 보여주는 에러 안내 페이지
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui/EmptyState";

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
