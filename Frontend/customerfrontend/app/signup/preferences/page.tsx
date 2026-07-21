"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getKeywords, type Keyword } from "@/lib/api/customer";
import { submitPreferences } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";

export default function PreferencesPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getKeywords()
      .then(setKeywords)
      .catch((error) => {
        console.warn("키워드 목록 조회 실패(개발 중 CORS 등으로 무시)", error);
        setKeywords([]);
      });
  }, []);

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  };

  const finish = async (ids: number[]) => {
    setSubmitting(true);
    try {
      await submitPreferences(ids);
    } catch (error) {
      console.warn("취향 저장 실패(개발 중 CORS 등으로 무시하고 진행)", error);
      if (process.env.NODE_ENV !== "development") {
        alert("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
        setSubmitting(false);
        return;
      }
    }

    try {
      await refresh();
    } catch (error) {
      console.warn("로그인 정보 갱신 실패(개발 중 CORS 등으로 무시)", error);
    }

    setSubmitting(false);
    router.push("/");
  };

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto flex flex-col min-h-screen px-6 py-10">
      <h1 className="text-xl font-bold mb-2">관심 있는 카테고리를 선택해 주세요</h1>
      <p className="text-sm text-gray-400 mb-8">나중에 마이페이지에서 언제든 수정할 수 있어요.</p>

      <div className="flex flex-wrap gap-2 mb-10">
        {keywords.map((kw) => (
          <button
            key={kw.id}
            type="button"
            onClick={() => toggle(kw.id)}
            className={`px-4 py-2 rounded-full text-sm border ${
              selected.includes(kw.id)
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-200 text-gray-600"
            }`}
          >
            {kw.name}
          </button>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <button
          type="button"
          disabled={submitting || selected.length === 0}
          onClick={() => finish(selected)}
          className="w-full rounded-full py-3.5 text-sm font-medium bg-[#FEE500] disabled:opacity-50"
        >
          {submitting ? "저장하는 중..." : "선택 완료"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => finish([])}
          className="w-full rounded-full py-3.5 text-sm font-medium text-gray-500"
        >
          바로 시작하기
        </button>
      </div>
    </main>
  );
}