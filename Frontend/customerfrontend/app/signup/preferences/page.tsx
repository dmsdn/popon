"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getKeywords, type Keyword } from "@/lib/api/customer";
import { submitPreferences } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";

// ⚠️ 관심 "지역"은 백엔드 region 테이블과 개념이 달라요 — 백엔드 region은 서울/경기/부산처럼
// 시/도 단위라서, 이 앱이 쓰는 성수/홍대/여의도 같은 동네(핫플) 단위 지역 선택과 안 맞아요.
// 그래서 지역은 백엔드에 억지로 연결하지 않고 지금처럼 브라우저에만 저장해뒀어요.
// (실제 GET /api/regions·POST /api/customer/regions API 자체는 존재하니, 나중에 프론트가
//  동네 단위 지역을 쓸지 시/도 단위로 바꿀지 팀에서 정하면 그때 연결하면 됩니다.)
//
// [수정] "관심 카테고리"(로컬 전용, 하드코딩) 섹션과 "관심 키워드"(실 API) 섹션이 완전히
// 같은 값(뷰티/패션/애니/푸드/스포츠/라이프/굿즈/문구)을 따로 관리하고 있었어요 — 백엔드
// keyword 테이블도 그 목록으로 시드 데이터를 추가해뒀으니, 이제 "관심 카테고리" 하나로
// 합치고 실제 GET /api/keywords · POST /api/customer/interests로만 저장합니다.
const REGIONS = ["성수", "홍대", "여의도", "용산", "더현대서울"];

const REGION_STORAGE_KEY = "preferred_regions";

export default function PreferencesPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<number[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getKeywords()
      .then(setKeywords)
      .catch((error) => {
        console.warn("키워드 목록 조회 실패(개발 중 CORS 등으로 무시)", error);
        setKeywords([]);
      });
  }, []);

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const toggleKeyword = (id: number) => {
    setSelectedKeywords((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  };

  const hasAnySelection = selectedRegions.length > 0 || selectedKeywords.length > 0;

  const finish = async (skip: boolean) => {
    setSubmitting(true);

    // 지역은 아직 실 API에 안 맞아서(위 주석 참고) 로컬에만 저장
    try {
      window.localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(skip ? [] : selectedRegions));
    } catch (error) {
      console.warn("지역 로컬 저장 실패", error);
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
    router.push("/");
  };

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto flex flex-col min-h-screen px-6 py-10">
      <h1 className="text-xl font-bold mb-2">관심 있는 지역/카테고리를 선택해 주세요</h1>
      <p className="text-sm text-gray-400 mb-8">나중에 마이페이지에서 언제든 수정할 수 있어요.</p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">관심 지역</h2>
        <div className="grid grid-cols-4 mobile:grid-cols-6 gap-2">
          {REGIONS.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => toggleRegion(region)}
              className={`aspect-square rounded-[4px] text-xs font-medium flex items-center justify-center text-center px-1 border ${
                selectedRegions.includes(region)
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </section>

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
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {kw.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-3">
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