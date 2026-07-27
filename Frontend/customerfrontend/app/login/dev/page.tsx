"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/api/client";
import { devLogin, getSignupStatus } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";

// 백엔드의 실제 개발용 로그인(POST /api/customer/dev-login)에 연결된 화면입니다.
// testId를 다르게 입력하면 서로 다른 테스트 계정으로 로그인/가입돼요.
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
      // [수정] 이전엔 무조건 홈으로 보냈는데, 그러면 방금 만든 신규 테스트 계정도
      // 회원정보 입력 화면을 건너뛰어서 phone 등 필수값이 계속 비어있게 됐어요.
      // 실제 가입완료 여부를 확인해서 그에 맞게 보냅니다.
      try {
        const { signupCompleted } = await getSignupStatus();
        router.push(signupCompleted ? "/" : "/signup");
      } catch (statusError) {
        console.warn("가입 완료 여부 확인 실패", statusError);
        router.push("/");
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
        ‹ 뒤로
      </Link>

      <h1 className="text-lg font-bold mb-1">개발용 로그인</h1>
      <p className="text-sm text-gray-400 mb-8">
        테스트 ID를 다르게 입력하면 각각 다른 계정으로 로그인/가입돼요. 비워두면
        기본(default) 계정으로 로그인됩니다.
      </p>

      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            테스트 ID <span className="text-gray-400 font-normal">(선택)</span>
          </span>
          <input
            type="text"
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            placeholder="tester1"
            className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            닉네임 <span className="text-gray-400 font-normal">(선택, 신규 계정일 때만 적용)</span>
          </span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="테스트유저1"
            className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
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
          className="w-full rounded-full py-3.5 text-sm font-medium bg-gray-900 text-white disabled:opacity-40 mt-2"
        >
          {submitting ? "로그인 중..." : "로그인"}
        </button>
      </div>
    </main>
  );
}
