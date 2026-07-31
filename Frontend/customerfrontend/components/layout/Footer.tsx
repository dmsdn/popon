"use client";

import { useState } from "react";
import { TERMS_SECTIONS } from "@/data/termsContent";
import { TermsModal } from "@/components/ui/TermsModal";

// [수정] "이용약관 | 개인정보처리방침 | ..." 링크를 누르면 각자 팝업창(모달)으로
// 바로 뜨게 바꿨어요 (예전엔 마이페이지 약관 탭으로 이동했었어요).
// "이메일무단수집거부"는 실제로 대응되는 문서가 없어서, 성격이 가장 비슷한
// "마케팅 정보 수신 동의"로 연결했어요.
export function Footer() {
  const [openId, setOpenId] = useState<string | null>(null);
  const activeSection = TERMS_SECTIONS.find((s) => s.id === openId);

  return (
    <footer className="bg-gray-100 dark:bg-[#282B32] px-4 py-6 mt-4 text-sm text-gray-500 dark:text-gray-400">
      <p className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">로고</p>
      <p className="mb-3 flex flex-wrap gap-x-1">
        <button type="button" onClick={() => setOpenId("service")} className="underline underline-offset-2">
          이용약관
        </button>
        <span>|</span>
        <button type="button" onClick={() => setOpenId("privacy")} className="underline underline-offset-2">
          개인정보처리방침
        </button>
        <span>|</span>
        <button type="button" onClick={() => setOpenId("location")} className="underline underline-offset-2">
          위치정보 이용약관
        </button>
        <span>|</span>
        <button type="button" onClick={() => setOpenId("marketing")} className="underline underline-offset-2">
          이메일무단수집거부
        </button>
      </p>
      <p className="font-medium text-gray-700 dark:text-gray-300">애지중지</p>
      <p>서울특별시 강남구 테헤란로 5길 20, 3층</p>
      <p>대표 이메일 | 기타 연락처</p>
      <p className="mt-3">Copyright © 애지중지 All rights Reserved.</p>

      {activeSection && <TermsModal section={activeSection} onClose={() => setOpenId(null)} />}
    </footer>
  );
}
