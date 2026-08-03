"use client";

// 가입 직후 관심 카테고리·관심 지역을 선택하는 온보딩 페이지.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getKeywords, type Keyword } from "@/lib/api/customer";
import { submitPreferences } from "@/lib/api/auth";
import { getRegions, saveMyRegions, type Region } from "@/lib/api/regions";
import { useAuth } from "@/lib/auth/AuthContext";
import { consumeRedirectTarget } from "@/lib/postLoginRedirect";

// [수정] 예전엔 백엔드 region이 서울/경기/부산 같은 시/도 단위라 이 앱이 쓰는 성수/홍대
// 같은 동네 단위 선택이랑 안 맞아서 로컬 저장으로만 처리했었는데, 백엔드가 이제
// AdminRegionController로 관리자가 동네 단위 지역을 직접 관리하는 구조로 바뀌었어요.
// 관심 카테고리(키워드)와 동일한 패턴으로 실제 API에 연결합니다.

export default function PreferencesPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<number[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getKeywords()
      .then(setKeywords)
      .catch((error) => {
        console.warn("키워드 목록 조회 실패(개발 중 CORS 등으로 무시)", error);
        setKeywords([]);
      });
    getRegions()
      .then(setRegions)
      .catch((error) => {
        console.warn("지역 목록 조회 실패(개발 중 CORS 등으로 무시)", error);
        setRegions([]);
      });
  }, []);

  const toggleRegion = (id: number) => {
    setSelectedRegions((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const toggleKeyword = (id: number) => {
    setSelectedKeywords((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  };

  const hasAnySelection = selectedRegions.length > 0 || selectedKeywords.length > 0;

  const finish = async (skip: boolean) => {
    setSubmitting(true);

    try {
      await saveMyRegions(skip ? [] : selectedRegions);
    } catch (error) {
      console.warn("관심 지역 저장 실패(개발 중 CORS 등으로 무시하고 진행)", error);
    }

    try {
      await submitPreferences(skip ? [] : selectedKeywords);
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
    router.push(consumeRedirectTarget() ?? "/");
  };

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto flex flex-col min-h-screen px-6 py-10">
      <h1 className="text-xl font-bold mb-2">관심 있는 지역/카테고리를 선택해 주세요</h1>
      <p className="text-sm text-gray-400 mb-8">나중에 마이페이지에서 언제든 수정할 수 있어요.</p>

      {regions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">관심 지역</h2>
          <div className="flex flex-wrap gap-2">
            {regions.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleRegion(r.id)}
                className={`px-4 py-2 rounded-full text-sm border ${
                  selectedRegions.includes(r.id)
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 dark:border-[#282B32] text-gray-600 dark:text-gray-400"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {keywords.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">관심 카테고리</h2>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <button
                key={kw.id}
                type="button"
                onClick={() => toggleKeyword(kw.id)}
                className={`px-4 py-2 rounded-full text-sm border ${
                  selectedKeywords.includes(kw.id)
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 dark:border-[#282B32] text-gray-600 dark:text-gray-400"
                }`}
              >
                {kw.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="sticky bottom-0 -mx-6 px-6 pt-4 pb-6 mt-auto bg-white dark:bg-[#17181a] border-t border-gray-100 dark:border-[#282B32] flex flex-col gap-3">
        <button
          type="button"
          disabled={submitting || !hasAnySelection}
          onClick={() => finish(false)}
          className="w-full rounded-full py-3.5 text-sm font-medium bg-gray-900 text-white disabled:opacity-50"
        >
          {submitting ? "저장하는 중..." : "선택 완료"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => finish(true)}
          className="w-full rounded-full py-3.5 text-sm font-medium text-gray-500"
        >
          바로 시작하기
        </button>
      </div>
    </main>
  );
}
