"use client";

// 페이지 하단 푸터 - 약관 4종을 각각 모달로 띄우는 링크 포함.

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
      {/* [수정] "로고"라고만 적힌 자리표시자 텍스트였는데, 헤더(Header.tsx,
          MobileHeader.tsx)와 같은 방식으로 실제 로고 이미지를 넣었어요 -
          라이트/다크 모드 각각 전용 파일(LOGO_Light.svg/LOGO_Dark.svg)을
          두고 CSS로 하나만 보이게 전환해요. */}
      <div className="mb-3">
        <img src="/icons/ui/LOGO_Light.svg" alt="POP-ON" className="h-6 w-auto dark:hidden" />
        <img src="/icons/ui/LOGO_Dark.svg" alt="POP-ON" className="h-6 w-auto hidden dark:block" />
      </div>
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
