// app/login/dev/page.tsx
// 개발용 임시 로그인 페이지 - 실 로그인 없이 테스트 계정으로
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/api/client";
import { devLogin, getSignupStatus } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";
import { consumeRedirectTarget } from "@/lib/postLoginRedirect";

export default function DevLoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [testId, setTestId] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const result = await devLogin({
        testId: testId.trim() || undefined,
        nickname: nickname.trim() || undefined,
      });

      setToken(result.token);
      await refresh();
      try {
        const { signupCompleted } = await getSignupStatus();
        router.push(signupCompleted ? consumeRedirectTarget() ?? "/" : "/signup");
      } catch (statusError) {
        console.warn("가입 완료 여부 확인 실패", statusError);
        router.push(consumeRedirectTarget() ?? "/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="w-full max-w-sm mx-auto flex flex-col min-h-screen px-6 py-10">
      <Link href="/login" className="self-start text-sm text-gray-500 mb-6">
        <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
          <span>뒤로</span>
      </Link>

      <h1 className="text-lg font-bold mb-1">개발용 로그인</h1>
      <p className="text-sm text-gray-400 mb-8">
        테스트 ID를 다르게 입력하면 각각 다른 계정으로 로그인/가입돼요. 비워두면
        기본(default) 계정으로 로그인됩니다.
      </p>

      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            테스트 ID <span className="text-gray-400 font-normal">(선택)</span>
          </span>
          <input
            type="text"
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            placeholder="tester1"
            className="w-full bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            닉네임 <span className="text-gray-400 font-normal">(선택, 신규 계정일 때만 적용)</span>
          </span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="테스트유저1"
            className="w-full bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-full py-3.5 text-base font-medium bg-gray-900 text-white disabled:opacity-40 mt-2"
        >
          {submitting ? "로그인 중..." : "로그인"}
        </button>
      </div>
    </main>
  );
}
