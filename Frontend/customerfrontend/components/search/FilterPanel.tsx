// components/search/FilterPanel.tsx
// 검색 필터 패널 - 카테고리/지역/상태/별점을 고르는 바텀시트
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Checkbox } from "@/components/ui/Checkbox";

export type FilterTab = "카테고리" | "지역" | "운영여부" | "별점";

const RATING_OPTIONS = [
  { label: "4점 이상", value: 4 },
  { label: "3점 이상", value: 3 },
  { label: "2점 이상", value: 2 },
];

const ALL_LABEL = "전체";

export function FilterPanel({
  initialTab,
  categories,
  regions,
  statuses,
  selectedCategories,
  selectedRegions,
  selectedStatuses,
  selectedMinRating,
  onApply,
  onClose,
}: {
  initialTab: FilterTab;
  categories: string[];
  regions: string[];
  statuses: readonly string[];
  selectedCategories: string[];
  selectedRegions: string[];
  selectedStatuses: string[];
  selectedMinRating: number | null;
  onApply: (next: {
    categories: string[];
    regions: string[];
    statuses: string[];
    minRating: number | null;
  }) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<FilterTab>(initialTab);
  const [draftCategories, setDraftCategories] = useState(selectedCategories);
  const [draftRegions, setDraftRegions] = useState(selectedRegions);
  const [draftStatuses, setDraftStatuses] = useState(selectedStatuses);
  const [draftMinRating, setDraftMinRating] = useState(selectedMinRating);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const toggleWithAll = (list: string[], setList: (v: string[]) => void, value: string) => {
    if (value === ALL_LABEL) {
      setList([]);
      return;
    }
    toggle(list, setList, value);
  };

  const selectedChips = [
    ...draftCategories.map((v) => ({ group: "카테고리" as FilterTab, value: v })),
    ...draftRegions.map((v) => ({ group: "지역" as FilterTab, value: v })),
    ...draftStatuses.map((v) => ({ group: "운영여부" as FilterTab, value: v })),
    ...(draftMinRating ? [{ group: "별점" as FilterTab, value: `${draftMinRating}점 이상` }] : []),
  ];

  const removeChip = (group: FilterTab, value: string) => {
    if (group === "카테고리") setDraftCategories(draftCategories.filter((v) => v !== value));
    else if (group === "지역") setDraftRegions(draftRegions.filter((v) => v !== value));
    else if (group === "운영여부") setDraftStatuses(draftStatuses.filter((v) => v !== value));
    else setDraftMinRating(null);
  };

  const handleReset = () => {
    setDraftCategories([]);
    setDraftRegions([]);
    setDraftStatuses([]);
    setDraftMinRating(null);
  };

  const handleApply = () => {
    onApply({
      categories: draftCategories,
      regions: draftRegions,
      statuses: draftStatuses,
      minRating: draftMinRating,
    });
    onClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-end mobile:items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full mobile:max-w-md bg-white dark:bg-[#282B32] rounded-t-2xl mobile:rounded-2xl h-[65vh] mobile:h-[520px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5">
          <h2 className="text-lg font-bold mb-4">필터</h2>

          {selectedChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedChips.map(({ group, value }) => (
                <span
                  key={`${group}-${value}`}
                  className="flex items-center gap-1 text-sm border border-point text-[#218B09] rounded-full pl-3 pr-2 py-1.5"
                >
                  {value}
                  <button
                    type="button"
                    onClick={() => removeChip(group, value)}
                    aria-label={`${value} 제거`}
                    className="text-gray-500 dark:text-gray-300"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 탭 */}
          <div className="flex items-center gap-5 border-b border-gray-100 dark:border-[#282B32]">
            {(["카테고리", "지역", "운영여부", "별점"] as FilterTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`pb-3 text-base ${
                  tab === t ? "font-semibold text-point border-b-2 border-point" : "text-gray-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 내용 - 체크박스 다중 선택 (별점만 단일 선택) */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "카테고리" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 text-base font-medium">
                <Checkbox
                  checked={draftCategories.length === 0}
                  onChange={() => toggleWithAll(draftCategories, setDraftCategories, ALL_LABEL)}
                />
                {ALL_LABEL}
              </label>
              {categories.map((c) => (
                <label key={c} className="flex items-center gap-2.5 text-base font-medium">
                  <Checkbox
                    checked={draftCategories.includes(c)}
                    onChange={() => toggleWithAll(draftCategories, setDraftCategories, c)}
                  />
                  {c}
                </label>
              ))}
            </div>
          )}
          {tab === "지역" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 text-base font-medium">
                <Checkbox
                  checked={draftRegions.length === 0}
                  onChange={() => toggleWithAll(draftRegions, setDraftRegions, ALL_LABEL)}
                />
                {ALL_LABEL}
              </label>
              {regions.map((r) => (
                <label key={r} className="flex items-center gap-2.5 text-base font-medium">
                  <Checkbox
                    checked={draftRegions.includes(r)}
                    onChange={() => toggleWithAll(draftRegions, setDraftRegions, r)}
                  />
                  {r}
                </label>
              ))}
            </div>
          )}
          {tab === "운영여부" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 text-base font-medium">
                <Checkbox
                  checked={draftStatuses.length === 0}
                  onChange={() => toggleWithAll(draftStatuses, setDraftStatuses, ALL_LABEL)}
                />
                {ALL_LABEL}
              </label>
              {statuses.map((s) => (
                <label key={s} className="flex items-center gap-2.5 text-base font-medium">
                  <Checkbox
                    checked={draftStatuses.includes(s)}
                    onChange={() => toggleWithAll(draftStatuses, setDraftStatuses, s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          )}
          {tab === "별점" && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2.5 text-base font-medium">
                <Checkbox checked={draftMinRating === null} onChange={() => setDraftMinRating(null)} />
                {ALL_LABEL}
              </label>
              {RATING_OPTIONS.map(({ label, value }) => (
                <label key={value} className="flex items-center gap-2.5 text-base font-medium">
                  <Checkbox
                    checked={draftMinRating === value}
                    onChange={() => setDraftMinRating(draftMinRating === value ? null : value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center gap-2 p-5 border-t border-gray-100 dark:border-[#282B32]">
          <button
            type="button"
            onClick={handleReset}
            className="flex-none text-base font-medium border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 rounded-full px-5 py-3"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 text-base font-medium bg-point text-gray-900 dark:text-white rounded-full py-3"
          >
            팝업 보기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
