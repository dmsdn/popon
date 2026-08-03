"use client";

// 약관 1개를 팝업창으로 보여주는 모달 (Footer의 4개 링크에서 사용).

import { createPortal } from "react-dom";
import type { TermsSection } from "@/data/termsContent";

export function TermsModal({ section, onClose }: { section: TermsSection; onClose: () => void }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#282B32] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#17181a]">
          <p className="text-base font-bold">{section.title}</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 text-lg">
            ✕
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
            {section.content}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
