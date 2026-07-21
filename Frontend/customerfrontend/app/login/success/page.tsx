"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

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
    const onboarded = searchParams.get("onboarded") === "true";

    if (!token) {
      router.replace("/login");
      return;
    }

    setToken(token);
    refresh().then(() => {
      router.replace(onboarded ? "/" : "/signup");
    });
  }, [searchParams, router, refresh]);

  return (
    <main className="flex items-center justify-center min-h-screen">
      <p className="text-sm text-gray-400">로그인 처리 중이에요...</p>
    </main>
  );
}