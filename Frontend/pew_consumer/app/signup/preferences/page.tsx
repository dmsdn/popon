"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitPreferences } from "@/lib/api/auth";

const CATEGORIES = [
  "패션",
  "뷰티",
  "음식",
  "인테리어",
  "키즈/완구",
  "여행/스포츠",
  "반려동물",
  "디지털/게임",
  "연예인/크리에이터",
  "애니/캐릭터",
  "소품/굿즈",
  "기타",
];

export default function PreferencesPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleCategory = (category: string) => {
    setSelected((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
  };

  // 선택 없이 눌러도 그대로 진행되므로 "건너뛰기"를 겸합니다.
  const handleStart = async () => {
    setSubmitting(true);
    try {
      await submitPreferences(selected);
      router.push("/");
    } catch (error) {
      console.error("취향 저장 실패", error);
      alert("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="px-6 py-8 max-w-sm mx-auto flex flex-col min-h-screen">
      <h1 className="text-xl font-bold mb-6">어떤 팝업을 선호하시나요?</h1>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const isSelected = selected.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className={`rounded-full border px-4 py-2 text-sm whitespace-nowrap ${
                isSelected
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={handleStart}
        disabled={submitting}
        className="w-full rounded-full py-3.5 text-sm font-medium bg-gray-100 text-gray-900 disabled:opacity-60"
      >
        {submitting ? "저장하는 중..." : "시작하기"}
      </button>
    </main>
  );
}